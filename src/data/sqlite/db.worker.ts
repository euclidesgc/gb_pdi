/// <reference lib="webworker" />
import * as Comlink from 'comlink'
import sqlite3InitModule from '@sqlite.org/sqlite-wasm'
import type { SqlBind, Row } from '@/data/ports/Database'

// The sqlite-wasm oo1 types are loose; we keep a minimal local shape.
interface Oo1Db {
  exec(opts: {
    sql: string
    bind?: SqlBind
    rowMode?: 'object'
    returnValue?: 'resultRows'
    resultRows?: Row[]
  }): unknown
  selectObjects(sql: string, bind?: SqlBind): Row[]
  selectObject(sql: string, bind?: SqlBind): Row | undefined
  changes(): number
}

const DB_FILE = '/pdi.sqlite3'
const VFS_NAME = 'pdi-opfs-pool'

interface SahPoolUtil {
  OpfsSAHPoolDb: new (filename: string) => Oo1Db & { close(): void }
  removeVfs(): Promise<boolean>
}

let db: (Oo1Db & { close(): void }) | null = null
let poolUtil: SahPoolUtil | null = null

/**
 * Install the OPFS SAH Pool VFS, retrying briefly on the "another open Access
 * Handle" failure. That failure happens when another context (another tab, or a
 * just-closed tab whose handles the browser has not reclaimed yet) still owns
 * the pool's sync access handles. A few spaced retries absorb that reclaim lag,
 * so a second tab usually recovers on its own once the first one closes instead
 * of stalling on the error screen.
 */
async function installPool(
  sqlite3: {
    installOpfsSAHPoolVfs(opts: { name: string }): Promise<SahPoolUtil>
  },
): Promise<SahPoolUtil> {
  // Up to ~3.6s of spaced retries: on a same-tab navigation the outgoing page's
  // worker can still hold the pool's sync access handles for a moment while the
  // browser reclaims it. Retrying (never wiping) lets the new page open the SAME
  // database once the handles free, so no data is lost.
  const MAX_TRIES = 12
  for (let attempt = 1; ; attempt++) {
    try {
      return await sqlite3.installOpfsSAHPoolVfs({ name: VFS_NAME })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isHandleContention = /createSyncAccessHandle|Access Handle|SAH/i.test(msg)
      if (attempt >= MAX_TRIES || !isHandleContention) throw err
      await new Promise((r) => setTimeout(r, 300))
    }
  }
}

async function ensureDb(): Promise<Oo1Db> {
  if (db) return db
  const sqlite3 = await sqlite3InitModule()
  // OPFS SAH Pool VFS: durable persistence in a Worker with NO COOP/COEP headers.
  poolUtil = await installPool(
    sqlite3 as unknown as {
      installOpfsSAHPoolVfs(opts: { name: string }): Promise<SahPoolUtil>
    },
  )
  db = new poolUtil.OpfsSAHPoolDb(DB_FILE)
  db.exec({ sql: 'PRAGMA foreign_keys = ON;' })
  return db
}

const api = {
  async init(): Promise<void> {
    await ensureDb()
  },
  async run(sql: string, bind?: SqlBind): Promise<number> {
    const d = await ensureDb()
    d.exec({ sql, bind })
    return d.changes()
  },
  async all(sql: string, bind?: SqlBind): Promise<Row[]> {
    const d = await ensureDb()
    return d.selectObjects(sql, bind)
  },
  async get(sql: string, bind?: SqlBind): Promise<Row | undefined> {
    const d = await ensureDb()
    return d.selectObject(sql, bind)
  },
  async execScript(sql: string): Promise<void> {
    const d = await ensureDb()
    d.exec({ sql })
  },
  async tx(statements: Array<{ sql: string; bind?: SqlBind }>): Promise<void> {
    const d = await ensureDb()
    d.exec({ sql: 'BEGIN;' })
    try {
      for (const s of statements) d.exec({ sql: s.sql, bind: s.bind })
      d.exec({ sql: 'COMMIT;' })
    } catch (err) {
      d.exec({ sql: 'ROLLBACK;' })
      throw err
    }
  },
  /**
   * Close the database and uninstall the VFS so its exclusive OPFS sync access
   * handles are released. Without this, `worker.terminate()` alone can leave the
   * handles held long enough that an immediate re-open ("Tentar de novo") hits
   * the "another open Access Handle" error again.
   */
  async close(): Promise<void> {
    try {
      db?.close()
    } catch {
      /* ignore: a half-initialized or already-closed db */
    }
    db = null
    try {
      await poolUtil?.removeVfs()
    } catch {
      /* ignore: VFS may not be installed */
    }
    poolUtil = null
  },
}

export type DbWorkerApi = typeof api

Comlink.expose(api)
