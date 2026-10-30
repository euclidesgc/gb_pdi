import { Hono, type Context, type MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { SENHA_MIN, USER_ROLES, type AuthUser, type UserRole } from '@/domain/auth'
import type { Database } from '../db/Database'
import type { Mailer } from '../mail/mailer'
import { resetSenhaEmail, senhaAlteradaEmail, verificarEmail } from '../mail/templates'
import { RateLimiter } from './rateLimit'
import {
  authenticate,
  checkPassword,
  consumeToken,
  createSession,
  createUser,
  deleteOtherSessions,
  deleteSession,
  EmailEmUsoError,
  findUserByEmail,
  getUser,
  issueToken,
  markEmailVerified,
  RoleBloqueadaError,
  searchUsers,
  SESSION_TTL_DAYS,
  setPassword,
  setRole,
  TOKEN_TTL_HOURS,
  userFromSession,
} from './users'

export type AuthEnv = { Variables: { user: AuthUser; token: string } }

const SESSION_COOKIE = 'gbpdi_session'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN = 60_000

interface AuthOptions {
  db: Database
  mailer: Mailer
  /** Public base URL used in e-mail links (APP_URL). */
  appUrl: string
  secureCookies: boolean
}

/** Client IP as seen by the proxy (Traefik replaces any client-sent X-Forwarded-For). */
const clientIp = (c: Context) =>
  c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local'

const tooMany = (c: Context, seconds: number) => {
  c.header('Retry-After', String(seconds))
  return c.json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, 429)
}

const senhaInvalida = (senha: string) =>
  senha.length < SENHA_MIN ? `A senha precisa ter ao menos ${SENHA_MIN} caracteres` : null

/**
 * /api/auth/* (account flows) and /api/admin/* (user management). Returns the
 * routers plus `requireUser`, the session middleware the rest of the API uses.
 */
export function createAuth({ db, mailer, appUrl, secureCookies }: AuthOptions) {
  const loginByIp = new RateLimiter(50, 15 * MIN)
  const loginByAccount = new RateLimiter(10, 15 * MIN)
  const registerByIp = new RateLimiter(10, 60 * MIN)
  const forgotByIp = new RateLimiter(5, 15 * MIN)
  const emailByAccount = new RateLimiter(3, 60 * MIN)
  const passwordByUser = new RateLimiter(10, 15 * MIN)

  const link = (path: string, token: string) =>
    `${appUrl}${path}?token=${encodeURIComponent(token)}`

  const setSessionCookie = (c: Context, token: string) =>
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    })

  /** Fire-and-forget e-mail: a mail failure must not break the account flow. */
  const sendInBackground = (what: string, send: () => Promise<void>) => {
    void send().catch((err: unknown) => console.error(`[mail] falha ao enviar ${what}`, err))
  }

  const sendVerification = async (user: AuthUser) => {
    const token = await issueToken(db, user.id, 'verify_email')
    await mailer.send(verificarEmail(user.email, user.nome, link('/verificar-email', token)))
  }

  const requireUser: MiddlewareHandler<AuthEnv> = async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE)
    const user = token ? await userFromSession(db, token) : null
    if (!user || !token) return c.json({ error: 'Não autenticado' }, 401)
    c.set('user', user)
    c.set('token', token)
    await next()
  }

  const requireAdmin: MiddlewareHandler<AuthEnv> = async (c, next) => {
    if (c.get('user').role !== 'admin') {
      return c.json({ error: 'Apenas administradores podem fazer isso' }, 403)
    }
    await next()
  }

  // ---- /api/auth ----
  const auth = new Hono<AuthEnv>()

  auth.get('/config', (c) => c.json({ emailEnabled: mailer.enabled }))

  auth.post('/register', async (c) => {
    const wait = registerByIp.hit(clientIp(c))
    if (wait) return tooMany(c, wait)
    const body = await c.req.json<{ email?: string; nome?: string; senha?: string }>()
    const email = body.email?.trim() ?? ''
    const nome = body.nome?.trim() ?? ''
    const senha = body.senha ?? ''
    if (!EMAIL_RE.test(email)) return c.json({ error: 'E-mail inválido' }, 400)
    if (!nome) return c.json({ error: 'Informe seu nome' }, 400)
    const problem = senhaInvalida(senha)
    if (problem) return c.json({ error: problem }, 400)
    try {
      const user = await createUser(db, { email, nome, senha })
      setSessionCookie(c, await createSession(db, user.id))
      if (mailer.enabled) sendInBackground('verificação', () => sendVerification(user))
      return c.json(user, 201)
    } catch (err) {
      if (err instanceof EmailEmUsoError) return c.json({ error: err.message }, 409)
      throw err
    }
  })

  auth.post('/login', async (c) => {
    const body = await c.req.json<{ email?: string; senha?: string }>()
    const email = (body.email ?? '').trim().toLowerCase()
    const accountKey = `${clientIp(c)}|${email}`
    const wait = loginByIp.hit(clientIp(c)) || loginByAccount.hit(accountKey)
    if (wait) return tooMany(c, wait)
    const user = await authenticate(db, email, body.senha ?? '')
    if (!user) return c.json({ error: 'E-mail ou senha incorretos' }, 401)
    loginByAccount.reset(accountKey)
    setSessionCookie(c, await createSession(db, user.id))
    return c.json(user)
  })

  auth.post('/logout', async (c) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) await deleteSession(db, token)
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    return c.json({ ok: true })
  })

  // Always answers the same way, so it can't be used to find out which e-mails exist.
  auth.post('/forgot-password', async (c) => {
    if (!mailer.enabled) {
      return c.json({ error: 'A recuperação de senha está indisponível no momento.' }, 503)
    }
    const body = await c.req.json<{ email?: string }>()
    const email = (body.email ?? '').trim().toLowerCase()
    const wait = forgotByIp.hit(clientIp(c))
    if (wait) return tooMany(c, wait)
    if (EMAIL_RE.test(email) && !emailByAccount.hit(`reset|${email}`)) {
      const user = await findUserByEmail(db, email)
      if (user) {
        const token = await issueToken(db, user.id, 'reset_password')
        sendInBackground('redefinição de senha', () =>
          mailer.send(
            resetSenhaEmail(
              user.email,
              user.nome,
              link('/redefinir-senha', token),
              TOKEN_TTL_HOURS.reset_password,
            ),
          ),
        )
      }
    }
    return c.json({ ok: true })
  })

  auth.post('/reset-password', async (c) => {
    const body = await c.req.json<{ token?: string; senha?: string }>()
    const senha = body.senha ?? ''
    const problem = senhaInvalida(senha)
    if (problem) return c.json({ error: problem }, 400)
    const userId = body.token ? await consumeToken(db, body.token, 'reset_password') : null
    if (!userId) {
      return c.json(
        { error: 'Link inválido ou expirado. Peça um novo e-mail de recuperação.' },
        400,
      )
    }
    // Ends every session (whoever had the old password is out), then signs this one in.
    await setPassword(db, userId, senha)
    // Opening the link proves access to the inbox.
    await markEmailVerified(db, userId)
    setSessionCookie(c, await createSession(db, userId))
    return c.json(await getUser(db, userId))
  })

  auth.post('/verify-email', async (c) => {
    const body = await c.req.json<{ token?: string }>()
    const userId = body.token ? await consumeToken(db, body.token, 'verify_email') : null
    if (!userId) {
      return c.json(
        { error: 'Link inválido ou expirado. Peça um novo e-mail de confirmação.' },
        400,
      )
    }
    await markEmailVerified(db, userId)
    return c.json({ ok: true })
  })

  // Everything below needs a session.
  auth.use('*', requireUser)

  auth.get('/me', (c) => c.json(c.get('user')))

  auth.post('/resend-verification', async (c) => {
    const user = c.get('user')
    if (user.emailVerified) return c.json({ ok: true })
    if (!mailer.enabled) return c.json({ error: 'O envio de e-mails está indisponível.' }, 503)
    const wait = emailByAccount.hit(`verify|${user.id}`)
    if (wait) return tooMany(c, wait)
    await sendVerification(user)
    return c.json({ ok: true })
  })

  auth.post('/change-password', async (c) => {
    const user = c.get('user')
    const wait = passwordByUser.hit(user.id)
    if (wait) return tooMany(c, wait)
    const body = await c.req.json<{ senhaAtual?: string; novaSenha?: string }>()
    const novaSenha = body.novaSenha ?? ''
    const problem = senhaInvalida(novaSenha)
    if (problem) return c.json({ error: problem }, 400)
    if (!(await checkPassword(db, user.id, body.senhaAtual ?? ''))) {
      return c.json({ error: 'Senha atual incorreta' }, 400)
    }
    await setPassword(db, user.id, novaSenha, c.get('token'))
    if (mailer.enabled) {
      sendInBackground('aviso de senha alterada', async () => {
        const token = await issueToken(db, user.id, 'reset_password')
        await mailer.send(
          senhaAlteradaEmail(user.email, user.nome, link('/redefinir-senha', token)),
        )
      })
    }
    return c.json({ ok: true })
  })

  auth.post('/logout-others', async (c) => {
    const ended = await deleteOtherSessions(db, c.get('user').id, c.get('token'))
    return c.json({ ok: true, ended })
  })

  // ---- /api/admin ----
  const admin = new Hono<AuthEnv>()
  admin.use('*', requireUser, requireAdmin)

  admin.get('/users', async (c) => c.json(await searchUsers(db, c.req.query('q') ?? '')))

  admin.post('/users/:id/role', async (c) => {
    const body = await c.req.json<{ role?: string }>()
    const role = body.role as UserRole
    if (!USER_ROLES.includes(role)) return c.json({ error: 'Papel inválido' }, 400)
    const id = c.req.param('id')
    if (id === c.get('user').id && role !== 'admin') {
      return c.json({ error: 'Você não pode remover o seu próprio acesso de administrador' }, 400)
    }
    try {
      const updated = await setRole(db, id, role)
      return updated ? c.json(updated) : c.json({ error: 'Usuário não encontrado' }, 404)
    } catch (err) {
      if (err instanceof RoleBloqueadaError) return c.json({ error: err.message }, 409)
      throw err
    }
  })

  return { auth, admin, requireUser }
}
