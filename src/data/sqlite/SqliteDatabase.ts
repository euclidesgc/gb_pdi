import * as Comlink from 'comlink'
import type { Database, Row, SqlBind } from '@/data/ports/Database'
import type { DbWorkerApi } from './db.worker'

/**
 * Main-thread Database implementation that proxies to the SQLite Web Worker
 * (sqlite-wasm + OPFS) over Comlink.
 */
export class SqliteDatabase implements Database {
  private worker: Worker
  private api: Comlink.Remote<DbWorkerApi>
  private ready: Promise<void>

  constructor() {
    this.worker = new Worker(new URL('./db.worker.ts', import.meta.url), {
      type: 'module',
    })
    this.api = Comlink.wrap<DbWorkerApi>(this.worker)
    this.ready = this.api.init()
  }

  async whenReady(): Promise<void> {
    await this.ready
  }

  async run(sql: string, bind?: SqlBind): Promise<number> {
    await this.ready
    return this.api.run(sql, bind)
  }

  async all<T extends Row = Row>(sql: string, bind?: SqlBind): Promise<T[]> {
    await this.ready
    return (await this.api.all(sql, bind)) as T[]
  }

  async get<T extends Row = Row>(sql: string, bind?: SqlBind): Promise<T | undefined> {
    await this.ready
    return (await this.api.get(sql, bind)) as T | undefined
  }

  async execScript(sql: string): Promise<void> {
    await this.ready
    await this.api.execScript(sql)
  }

  async tx(statements: Array<{ sql: string; bind?: SqlBind }>): Promise<void> {
    await this.ready
    await this.api.tx(statements)
  }

  async dispose(): Promise<void> {
    // Release the OPFS sync access handles (close DB + uninstall VFS) BEFORE
    // killing the worker, so the next open can re-acquire them cleanly.
    try {
      await this.api.close()
    } catch {
      /* ignore: worker may have failed to initialize */
    }
    this.worker.terminate()
  }
}
