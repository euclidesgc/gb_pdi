/**
 * Low-level database port used by the server repositories. Queries use `?`
 * placeholders; the Postgres implementation rewrites them to `$1, $2, …`.
 */
export type SqlValue = string | number | boolean | null

export type SqlBind = SqlValue[]

export type Row = Record<string, unknown>

export interface Database {
  /** Run a mutation (INSERT/UPDATE/DELETE/DDL). Returns affected row count. */
  run(sql: string, bind?: SqlBind): Promise<number>
  /** Select multiple rows as plain objects. */
  all<T extends Row = Row>(sql: string, bind?: SqlBind): Promise<T[]>
  /** Select the first row, or undefined. */
  get<T extends Row = Row>(sql: string, bind?: SqlBind): Promise<T | undefined>
  /** Execute a multi-statement SQL script without binds (migrations). */
  execScript(sql: string): Promise<void>
  /** Run a set of mutations atomically (single transaction). */
  tx(statements: Array<{ sql: string; bind?: SqlBind }>): Promise<void>
}
