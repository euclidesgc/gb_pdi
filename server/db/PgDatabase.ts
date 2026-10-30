import pg from 'pg'
import type { Database, Row, SqlBind } from './Database'

// COUNT(*) and other int8 results come back as strings by default; the catalog
// never gets near 2^53, so parse them as plain numbers.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v))

/** Rewrite `?` placeholders to Postgres `$n` (no `?` appears inside our SQL literals). */
function toPg(sql: string): string {
  let n = 0
  return sql.replace(/\?/g, () => `$${++n}`)
}

export class PgDatabase implements Database {
  readonly pool: pg.Pool

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, max: 10 })
  }

  async run(sql: string, bind: SqlBind = []): Promise<number> {
    const res = await this.pool.query(toPg(sql), bind)
    return res.rowCount ?? 0
  }

  async all<T extends Row = Row>(sql: string, bind: SqlBind = []): Promise<T[]> {
    const res = await this.pool.query(toPg(sql), bind)
    return res.rows as T[]
  }

  async get<T extends Row = Row>(sql: string, bind: SqlBind = []): Promise<T | undefined> {
    return (await this.all<T>(sql, bind))[0]
  }

  async execScript(sql: string): Promise<void> {
    await this.pool.query(sql)
  }

  async tx(statements: Array<{ sql: string; bind?: SqlBind }>): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      for (const s of statements) await client.query(toPg(s.sql), s.bind ?? [])
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}
