import { useEffect, useState } from 'react'
import { useDatabase } from '@/data/DatabaseProvider'

/**
 * Persistence smoke test: increments a counter stored in SQLite (OPFS) on each
 * mount. If the number survives a full page reload, the database is durable.
 */
export function BootCounter() {
  const db = useDatabase()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let done = false
    ;(async () => {
      await db.run(
        `INSERT INTO app_config (chave, valor) VALUES ('boot_count', '1')
         ON CONFLICT(chave) DO UPDATE SET valor = CAST(CAST(valor AS INTEGER) + 1 AS TEXT)`,
      )
      const row = await db.get<{ valor: string }>(
        `SELECT valor FROM app_config WHERE chave = 'boot_count'`,
      )
      if (!done) setCount(row ? Number(row.valor) : null)
    })()
    return () => {
      done = true
    }
  }, [db])

  return (
    <p className="mt-6 text-xs text-slate-400">
      SQLite (OPFS) ativo · boots registrados: {count ?? '…'}
    </p>
  )
}
