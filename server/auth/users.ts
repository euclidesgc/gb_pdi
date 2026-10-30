import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { Database } from '../db/Database'
import type { AdminUserRow, ApiToken, AuthUser, UserRole } from '@/domain/auth'
import { hashPassword, verifyPassword } from './password'

export const SESSION_TTL_DAYS = 30

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')
const newToken = () => randomBytes(32).toString('base64url')

function rowToUser(r: Record<string, unknown>): AuthUser {
  return {
    id: String(r.id),
    email: String(r.email),
    nome: String(r.nome ?? ''),
    role: r.role === 'admin' ? 'admin' : 'user',
    emailVerified: r.email_verified_at != null,
  }
}

export class EmailEmUsoError extends Error {}
export class RoleBloqueadaError extends Error {}

/**
 * Catalog admins, by e-mail (`ADMIN_EMAILS`, comma-separated). These accounts
 * are always admins (on sign-up and on every boot) and their role can't be
 * changed from /admin. Other admins are promoted in /admin. When unset (local
 * dev) and no admin exists yet, the first account to sign up becomes the admin.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

const isLockedAdmin = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase())

/** Promotes every ADMIN_EMAILS account that exists (never demotes anyone). */
export async function syncAdmins(db: Database): Promise<void> {
  if (!ADMIN_EMAILS.length) return
  await db.run(
    `UPDATE users SET role = 'admin'
      WHERE role <> 'admin' AND lower(email) = ANY(string_to_array(?, ','))`,
    [ADMIN_EMAILS.join(',')],
  )
}

/** Creates the account and its empty PDI profile. */
export async function createUser(
  db: Database,
  input: { email: string; nome: string; senha: string },
): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase()
  const existing = await db.get('SELECT 1 FROM users WHERE lower(email) = ?', [email])
  if (existing) throw new EmailEmUsoError('E-mail já cadastrado')
  const id = randomUUID()
  const hash = await hashPassword(input.senha)
  const role = ADMIN_EMAILS.length
    ? `'${isLockedAdmin(email) ? 'admin' : 'user'}'`
    : `CASE WHEN EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN 'user' ELSE 'admin' END`
  await db.tx([
    {
      sql: `INSERT INTO users (id, email, nome, password_hash, role) VALUES (?, ?, ?, ?, ${role})`,
      bind: [id, email, input.nome.trim(), hash],
    },
    {
      sql: 'INSERT INTO perfil (user_id, nome, email) VALUES (?, ?, ?)',
      bind: [id, input.nome.trim(), email],
    },
  ])
  return (await getUser(db, id))!
}

export async function getUser(db: Database, id: string): Promise<AuthUser | null> {
  const row = await db.get('SELECT * FROM users WHERE id = ?', [id])
  return row ? rowToUser(row) : null
}

export async function findUserByEmail(db: Database, email: string): Promise<AuthUser | null> {
  const row = await db.get('SELECT * FROM users WHERE lower(email) = ?', [
    email.trim().toLowerCase(),
  ])
  return row ? rowToUser(row) : null
}

export async function authenticate(
  db: Database,
  email: string,
  senha: string,
): Promise<AuthUser | null> {
  const row = await db.get('SELECT * FROM users WHERE lower(email) = ?', [
    email.trim().toLowerCase(),
  ])
  if (!row) {
    // Same cost as a real check, so response time doesn't reveal which e-mails exist.
    await verifyPassword(senha, 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA')
    return null
  }
  return (await verifyPassword(senha, String(row.password_hash))) ? rowToUser(row) : null
}

export async function checkPassword(db: Database, userId: string, senha: string): Promise<boolean> {
  const row = await db.get('SELECT password_hash FROM users WHERE id = ?', [userId])
  return row ? verifyPassword(senha, String(row.password_hash)) : false
}

/**
 * Sets a new password and ends every session of the account except `keepToken`
 * (the caller's own session, when the change is made while signed in).
 */
export async function setPassword(
  db: Database,
  userId: string,
  senha: string,
  keepToken?: string,
): Promise<void> {
  const hash = await hashPassword(senha)
  await db.tx([
    {
      sql: 'UPDATE users SET password_hash = ?, password_changed_at = now() WHERE id = ?',
      bind: [hash, userId],
    },
    keepToken
      ? {
          sql: 'DELETE FROM sessions WHERE user_id = ? AND id <> ?',
          bind: [userId, sha256(keepToken)],
        }
      : { sql: 'DELETE FROM sessions WHERE user_id = ?', bind: [userId] },
    // A reset (no session kept) may mean the account was taken over: drop the AI tokens too.
    ...(keepToken ? [] : [{ sql: 'DELETE FROM api_tokens WHERE user_id = ?', bind: [userId] }]),
    // Any pending reset link stops working once the password changed.
    {
      sql: `UPDATE auth_tokens SET used_at = now()
             WHERE user_id = ? AND purpose = 'reset_password' AND used_at IS NULL`,
      bind: [userId],
    },
  ])
}

// ---- Sessions ----

/** Creates a session and returns the raw token (only its hash is stored). */
export async function createSession(db: Database, userId: string): Promise<string> {
  const token = newToken()
  await db.run(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES (?, ?, now() + (? || ' days')::interval)`,
    [sha256(token), userId, String(SESSION_TTL_DAYS)],
  )
  return token
}

export async function userFromSession(db: Database, token: string): Promise<AuthUser | null> {
  const row = await db.get(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > now()`,
    [sha256(token)],
  )
  return row ? rowToUser(row) : null
}

export async function deleteSession(db: Database, token: string): Promise<void> {
  await db.run('DELETE FROM sessions WHERE id = ?', [sha256(token)])
}

/** Ends every other session of the user (the current one stays). Returns how many ended. */
export async function deleteOtherSessions(
  db: Database,
  userId: string,
  keepToken: string,
): Promise<number> {
  return db.run('DELETE FROM sessions WHERE user_id = ? AND id <> ?', [userId, sha256(keepToken)])
}

export async function purgeExpired(db: Database): Promise<void> {
  await db.run('DELETE FROM sessions WHERE expires_at <= now()')
  await db.run(`DELETE FROM auth_tokens WHERE expires_at <= now() - interval '7 days'`)
}

// ---- One-time e-mail tokens (reset de senha, verificação de e-mail) ----

export type TokenPurpose = 'reset_password' | 'verify_email'

export const TOKEN_TTL_HOURS: Record<TokenPurpose, number> = {
  reset_password: 1,
  verify_email: 48,
}

/** Issues a single-use token, invalidating earlier unused ones of the same purpose. */
export async function issueToken(
  db: Database,
  userId: string,
  purpose: TokenPurpose,
): Promise<string> {
  const token = newToken()
  await db.tx([
    {
      sql: `UPDATE auth_tokens SET used_at = now()
             WHERE user_id = ? AND purpose = ? AND used_at IS NULL`,
      bind: [userId, purpose],
    },
    {
      sql: `INSERT INTO auth_tokens (id, user_id, purpose, expires_at)
            VALUES (?, ?, ?, now() + (? || ' hours')::interval)`,
      bind: [sha256(token), userId, purpose, String(TOKEN_TTL_HOURS[purpose])],
    },
  ])
  return token
}

/** Marks the token used and returns its user id, or null when invalid/expired/used. */
export async function consumeToken(
  db: Database,
  token: string,
  purpose: TokenPurpose,
): Promise<string | null> {
  const row = await db.get<{ user_id: string }>(
    `UPDATE auth_tokens SET used_at = now()
      WHERE id = ? AND purpose = ? AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`,
    [sha256(token), purpose],
  )
  return row ? row.user_id : null
}

export async function markEmailVerified(db: Database, userId: string): Promise<void> {
  await db.run(
    'UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = ?',
    [userId],
  )
}

// ---- Tokens pessoais de acesso (agentes de IA via MCP) ----

export const API_TOKEN_PREFIX = 'gbpdi_'
/** Per-account cap, so a leaked session can't mint tokens without bound. */
export const API_TOKENS_MAX = 10

export class LimiteTokensError extends Error {}

function rowToApiToken(r: Record<string, unknown>): ApiToken {
  return {
    id: String(r.id),
    nome: String(r.nome),
    prefixo: String(r.prefixo),
    createdAt: new Date(r.created_at as string).toISOString(),
    lastUsedAt: r.last_used_at ? new Date(r.last_used_at as string).toISOString() : null,
  }
}

export async function listApiTokens(db: Database, userId: string): Promise<ApiToken[]> {
  const rows = await db.all(
    'SELECT * FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
  )
  return rows.map(rowToApiToken)
}

/** Creates a token and returns it with the raw secret (only its hash is stored). */
export async function createApiToken(
  db: Database,
  userId: string,
  nome: string,
): Promise<ApiToken & { token: string }> {
  const count = await db.get<{ n: number }>(
    'SELECT COUNT(*) AS n FROM api_tokens WHERE user_id = ?',
    [userId],
  )
  if ((count?.n ?? 0) >= API_TOKENS_MAX) {
    throw new LimiteTokensError(`Limite de ${API_TOKENS_MAX} tokens. Revogue um para criar outro.`)
  }
  const token = API_TOKEN_PREFIX + newToken()
  const id = randomUUID()
  await db.run(
    'INSERT INTO api_tokens (id, token_hash, user_id, nome, prefixo) VALUES (?, ?, ?, ?, ?)',
    [id, sha256(token), userId, nome, token.slice(0, API_TOKEN_PREFIX.length + 4)],
  )
  const row = await db.get('SELECT * FROM api_tokens WHERE id = ?', [id])
  return { ...rowToApiToken(row!), token }
}

export async function revokeApiToken(db: Database, userId: string, id: string): Promise<boolean> {
  return (await db.run('DELETE FROM api_tokens WHERE id = ? AND user_id = ?', [id, userId])) > 0
}

export async function userFromApiToken(db: Database, token: string): Promise<AuthUser | null> {
  if (!token.startsWith(API_TOKEN_PREFIX)) return null
  const row = await db.get(
    `UPDATE api_tokens t SET last_used_at = now()
       FROM users u
      WHERE t.token_hash = ? AND u.id = t.user_id
      RETURNING u.*`,
    [sha256(token)],
  )
  return row ? rowToUser(row) : null
}

// ---- Administração de usuários ----

/** Search by name or e-mail (case-insensitive substring), newest first. */
export async function searchUsers(db: Database, q: string, limit = 50): Promise<AdminUserRow[]> {
  const term = `%${q.trim().replace(/[\\%_]/g, (c) => '\\' + c)}%`
  const rows = await db.all(
    `SELECT * FROM users
      WHERE nome ILIKE ? OR email ILIKE ?
      ORDER BY created_at DESC
      LIMIT ?`,
    [term, term, limit],
  )
  return rows.map((r) => ({
    ...rowToUser(r),
    createdAt: new Date(r.created_at as string).toISOString(),
    roleLocked: isLockedAdmin(String(r.email)),
  }))
}

export async function setRole(
  db: Database,
  userId: string,
  role: UserRole,
): Promise<AuthUser | null> {
  const user = await getUser(db, userId)
  if (!user) return null
  if (isLockedAdmin(user.email) && role !== 'admin') {
    throw new RoleBloqueadaError('Este administrador é definido em ADMIN_EMAILS no servidor.')
  }
  await db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId])
  return { ...user, role }
}
