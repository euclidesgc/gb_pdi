import { Hono, type Context } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import type { CatalogRepository } from '@/data/ports/CatalogRepository'
import type { PdiRepository } from '@/data/ports/PdiRepository'
import { CATALOG_READ_METHODS, CATALOG_WRITE_METHODS, PDI_METHODS } from '@/domain/auth'
import type { PgDatabase } from './db/PgDatabase'
import type { Mailer } from './mail/mailer'
import { PgCatalogRepository } from './repositories/PgCatalogRepository'
import { PgPdiRepository } from './repositories/PgPdiRepository'
import { createAuth, type AuthEnv } from './auth/routes'
import { createMcpRoutes } from './mcp/routes'

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

interface AppOptions {
  db: PgDatabase
  mailer: Mailer
  /** Public base URL used in e-mail links. */
  appUrl: string
  /** Built SPA directory (served in production). Omit in dev (Vite serves it). */
  staticDir?: string
  secureCookies: boolean
}

export function createApp({ db, mailer, appUrl, staticDir, secureCookies }: AppOptions) {
  const app = new Hono()
  const catalog = new PgCatalogRepository(db)
  const { auth, admin, requireUser } = createAuth({ db, mailer, appUrl, secureCookies })

  const api = new Hono<AuthEnv>()

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

  api.route('/auth', auth)
  api.route('/admin', admin)

  // ---- Repositories over RPC: POST /api/rpc/<repo>/<method> { args: [...] } ----
  const rpc = new Hono<AuthEnv>()
  rpc.use('*', requireUser)

  const readArgs = async (c: Context): Promise<unknown[]> => {
    const body = await c.req.json<{ args?: unknown }>().catch(() => ({ args: [] }))
    return Array.isArray(body.args) ? body.args : []
  }

  rpc.post('/catalog/:method', async (c) => {
    const method = c.req.param('method')
    const isRead = (CATALOG_READ_METHODS as readonly string[]).includes(method)
    const isWrite = (CATALOG_WRITE_METHODS as readonly string[]).includes(method)
    if (!isRead && !isWrite) return c.json({ error: 'Método desconhecido' }, 404)
    if (isWrite && c.get('user').role !== 'admin') {
      return c.json({ error: 'Apenas administradores podem editar o catálogo' }, 403)
    }
    const fn = catalog[method as keyof CatalogRepository] as (...a: unknown[]) => Promise<unknown>
    const result = await fn.apply(catalog, await readArgs(c))
    return c.json({ result: result ?? null })
  })

  rpc.post('/pdi/:method', async (c) => {
    const method = c.req.param('method')
    if (!(PDI_METHODS as readonly string[]).includes(method)) {
      return c.json({ error: 'Método desconhecido' }, 404)
    }
    const pdi = new PgPdiRepository(db, c.get('user').id)
    const fn = pdi[method as keyof PdiRepository] as (...a: unknown[]) => Promise<unknown>
    const result = await fn.apply(pdi, await readArgs(c))
    return c.json({ result: result ?? null })
  })

  api.route('/rpc', rpc)

  api.onError((err, c) => {
    console.error('[api]', c.req.method, c.req.path, err)
    return c.json({ error: 'Erro interno' }, 500)
  })
  api.notFound((c) => c.json({ error: 'Rota não encontrada' }, 404))

  app.route('/api', api)
  app.route('/mcp', createMcpRoutes(db))

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
