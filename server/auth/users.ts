import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { Database } from '../db/Database'
import type { AuthUser } from '@/domain/auth'
import { hashPassword, verifyPassword } from './password'

export const SESSION_TTL_DAYS = 30

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')

function rowToUser(r: Record<string, unknown>): AuthUser {
  return {
    id: String(r.id),
    email: String(r.email),
    nome: String(r.nome ?? ''),
    isAdmin: r.is_admin === true,
  }
}

export class EmailEmUsoError extends Error {}

/**
 * Catalog admins, by e-mail (`ADMIN_EMAILS`, comma-separated). When set, only
 * these accounts are admins and everyone else is a regular user. When unset
 * (local dev), the very first account to sign up becomes the admin.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

/** Applies ADMIN_EMAILS to existing accounts (promotes listed, demotes the rest). */
export async function syncAdmins(db: Database): Promise<void> {
  if (!ADMIN_EMAILS.length) return
  await db.run(
    `UPDATE users SET is_admin = (lower(email) = ANY(string_to_array(?, ',')))
      WHERE is_admin IS DISTINCT FROM (lower(email) = ANY(string_to_array(?, ',')))`,
    [ADMIN_EMAILS.join(','), ADMIN_EMAILS.join(',')],
  )
}

/** Creates the account and its empty PDI profile (admin per ADMIN_EMAILS). */
export async function createUser(
  db: Database,
  input: { email: string; nome: string; senha: string },
): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase()
  const existing = await db.get('SELECT 1 FROM users WHERE lower(email) = ?', [email])
  if (existing) throw new EmailEmUsoError('E-mail já cadastrado')
  const id = randomUUID()
  const hash = await hashPassword(input.senha)
  await db.tx([
    {
      sql: ADMIN_EMAILS.length
        ? `INSERT INTO users (id, email, nome, password_hash, is_admin) VALUES (?, ?, ?, ?, ?)`
        : `INSERT INTO users (id, email, nome, password_hash, is_admin)
           VALUES (?, ?, ?, ?, NOT EXISTS (SELECT 1 FROM users))`,
      bind: ADMIN_EMAILS.length
        ? [id, email, input.nome.trim(), hash, ADMIN_EMAILS.includes(email)]
        : [id, email, input.nome.trim(), hash],
    },
    {
      sql: 'INSERT INTO perfil (user_id, nome, email) VALUES (?, ?, ?)',
      bind: [id, input.nome.trim(), email],
    },
  ])
  const row = await db.get('SELECT * FROM users WHERE id = ?', [id])
  return rowToUser(row!)
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

/** Creates a session and returns the raw token (only its hash is stored). */
export async function createSession(db: Database, userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')
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

export async function purgeExpiredSessions(db: Database): Promise<void> {
  await db.run('DELETE FROM sessions WHERE expires_at <= now()')
}
