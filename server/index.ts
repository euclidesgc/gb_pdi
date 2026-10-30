import { serve } from '@hono/node-server'
import { createApp } from './app'
import { purgeExpiredSessions, syncAdmins } from './auth/users'
import { PgDatabase } from './db/PgDatabase'
import { runMigrations } from './db/migrations'
import { ensureCatalogSeeded } from './seed/ensureSeeded'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL não definida')
  process.exit(1)
}

const port = Number(process.env.PORT ?? 3000)
const isProd = process.env.NODE_ENV === 'production'

const db = new PgDatabase(databaseUrl)

const applied = await runMigrations(db)
console.log(`[db] migrations aplicadas: ${applied}`)
await ensureCatalogSeeded(db)
await purgeExpiredSessions(db)
await syncAdmins(db)

const app = createApp({
  db,
  staticDir: isProd ? (process.env.STATIC_DIR ?? './dist') : undefined,
  secureCookies: isProd,
})

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[api] ouvindo em http://localhost:${info.port}`)
})

const shutdown = () => {
  server.close()
  void db.close().finally(() => process.exit(0))
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
