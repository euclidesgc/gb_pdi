import { Hono, type Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { serveStatic } from '@hono/node-server/serve-static'
import type { CatalogRepository } from '@/data/ports/CatalogRepository'
import type { PdiRepository } from '@/data/ports/PdiRepository'
import {
  CATALOG_READ_METHODS,
  CATALOG_WRITE_METHODS,
  PDI_METHODS,
  type AuthUser,
} from '@/domain/auth'
import type { PgDatabase } from './db/PgDatabase'
import { PgCatalogRepository } from './repositories/PgCatalogRepository'
import { PgPdiRepository } from './repositories/PgPdiRepository'
import {
  authenticate,
  createSession,
  createUser,
  deleteSession,
  EmailEmUsoError,
  SESSION_TTL_DAYS,
  userFromSession,
} from './auth/users'

// Compile-time guard: the RPC whitelists must cover every repository method
// (except the server-only bulk `replaceAll`), so a new port method can't be
// silently unreachable from the client.
type Missing<T, L> = Exclude<keyof T, L>
const _catalogComplete: Missing<
  CatalogRepository,
  (typeof CATALOG_READ_METHODS)[number] | (typeof CATALOG_WRITE_METHODS)[number] | 'replaceAll'
> extends never
  ? true
  : never = true
const _pdiComplete: Missing<PdiRepository, (typeof PDI_METHODS)[number]> extends never
  ? true
  : never = true
void _catalogComplete
void _pdiComplete

const SESSION_COOKIE = 'gbpdi_session'

type Env = { Variables: { user: AuthUser; token: string } }

interface AppOptions {
  db: PgDatabase
  /** Built SPA directory (served in production). Omit in dev (Vite serves it). */
  staticDir?: string
  secureCookies: boolean
}

export function createApp({ db, staticDir, secureCookies }: AppOptions) {
  const app = new Hono<Env>()
  const catalog = new PgCatalogRepository(db)

  const setSessionCookie = (c: Context, token: string) =>
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    })

  const api = new Hono<Env>()

  // CSRF: every mutating call must be JSON. A cross-site form can't send
  // `application/json` without a CORS preflight, which we never allow.
  api.use('*', async (c, next) => {
    if (c.req.method !== 'GET' && !c.req.header('content-type')?.startsWith('application/json')) {
      return c.json({ error: 'Content-Type deve ser application/json' }, 415)
    }
    await next()
  })

  api.get('/health', async (c) => {
    await db.get('SELECT 1')
    return c.json({ ok: true })
  })

  // ---- Auth ----
  api.post('/auth/register', async (c) => {
    const body = await c.req.json<{ email?: string; nome?: string; senha?: string }>()
    const email = body.email?.trim() ?? ''
    const nome = body.nome?.trim() ?? ''
    const senha = body.senha ?? ''
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'E-mail inválido' }, 400)
    if (!nome) return c.json({ error: 'Informe seu nome' }, 400)
    if (senha.length < 8) return c.json({ error: 'A senha precisa ter ao menos 8 caracteres' }, 400)
    try {
      const user = await createUser(db, { email, nome, senha })
      setSessionCookie(c, await createSession(db, user.id))
      return c.json(user, 201)
    } catch (err) {
      if (err instanceof EmailEmUsoError) return c.json({ error: err.message }, 409)
      throw err
    }
  })

  api.post('/auth/login', async (c) => {
    const body = await c.req.json<{ email?: string; senha?: string }>()
    const user = await authenticate(db, body.email ?? '', body.senha ?? '')
    if (!user) return c.json({ error: 'E-mail ou senha incorretos' }, 401)
    setSessionCookie(c, await createSession(db, user.id))
    return c.json(user)
  })

  api.post('/auth/logout', async (c) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) await deleteSession(db, token)
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    return c.json({ ok: true })
  })

  // Everything below requires a session.
  api.use('*', async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE)
    const user = token ? await userFromSession(db, token) : null
    if (!user || !token) return c.json({ error: 'Não autenticado' }, 401)
    c.set('user', user)
    c.set('token', token)
    await next()
  })

  api.get('/auth/me', (c) => c.json(c.get('user')))

  // ---- Repositories over RPC: POST /api/rpc/<repo>/<method> { args: [...] } ----
  const readArgs = async (c: Context): Promise<unknown[]> => {
    const body = await c.req.json<{ args?: unknown }>().catch(() => ({ args: [] }))
    return Array.isArray(body.args) ? body.args : []
  }

  api.post('/rpc/catalog/:method', async (c) => {
    const method = c.req.param('method')
    const isRead = (CATALOG_READ_METHODS as readonly string[]).includes(method)
    const isWrite = (CATALOG_WRITE_METHODS as readonly string[]).includes(method)
    if (!isRead && !isWrite) return c.json({ error: 'Método desconhecido' }, 404)
    if (isWrite && !c.get('user').isAdmin) {
      return c.json({ error: 'Apenas administradores podem editar o catálogo' }, 403)
    }
    const fn = catalog[method as keyof CatalogRepository] as (...a: unknown[]) => Promise<unknown>
    const result = await fn.apply(catalog, await readArgs(c))
    return c.json({ result: result ?? null })
  })

  api.post('/rpc/pdi/:method', async (c) => {
    const method = c.req.param('method')
    if (!(PDI_METHODS as readonly string[]).includes(method)) {
      return c.json({ error: 'Método desconhecido' }, 404)
    }
    const pdi = new PgPdiRepository(db, c.get('user').id)
    const fn = pdi[method as keyof PdiRepository] as (...a: unknown[]) => Promise<unknown>
    const result = await fn.apply(pdi, await readArgs(c))
    return c.json({ result: result ?? null })
  })

  api.onError((err, c) => {
    console.error('[api]', c.req.method, c.req.path, err)
    return c.json({ error: 'Erro interno' }, 500)
  })
  api.notFound((c) => c.json({ error: 'Rota não encontrada' }, 404))

  app.route('/api', api)

  if (staticDir) {
    // Shell and service worker must never be cached, or the PWA won't update;
    // hashed assets can be cached forever.
    app.use('*', async (c, next) => {
      await next()
      const p = c.req.path
      const html = c.res.headers.get('content-type')?.includes('text/html')
      if (p.startsWith('/assets/')) {
        c.res.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      } else if (html || p === '/sw.js' || p === '/manifest.webmanifest') {
        c.res.headers.set('Cache-Control', 'no-cache')
      }
    })
    app.use('*', serveStatic({ root: staticDir }))
    // SPA fallback (react-router).
    app.get('*', serveStatic({ root: staticDir, path: 'index.html' }))
  }

  return app
}
