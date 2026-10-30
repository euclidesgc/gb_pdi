/**
 * Low-level database port. The whole app talks to persistence through this
 * interface (and the repository ports built on top of it), never to a concrete
 * SQL engine. Swapping SQLite for an HTTP API or Firestore later means providing
 * a new implementation of these ports — no changes to feature code.
 */
export type SqlValue = string | number | null | Uint8Array

export type SqlBind = SqlValue[] | Record<string, SqlValue>

export type Row = Record<string, SqlValue>

export interface Database {
  /** Run a mutation (INSERT/UPDATE/DELETE/DDL). Returns affected row count. */
  run(sql: string, bind?: SqlBind): Promise<number>
  /** Select multiple rows as plain objects. */
  all<T extends Row = Row>(sql: string, bind?: SqlBind): Promise<T[]>
  /** Select the first row, or undefined. */
  get<T extends Row = Row>(sql: string, bind?: SqlBind): Promise<T | undefined>
  /** Execute a multi-statement SQL script (used by migrations/seed). */
  execScript(sql: string): Promise<void>
  /** Run a set of mutations atomically (single transaction). */
  tx(statements: Array<{ sql: string; bind?: SqlBind }>): Promise<void>
}
