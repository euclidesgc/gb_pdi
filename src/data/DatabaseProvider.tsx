import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, Copy, RefreshCw } from 'lucide-react'
import type { Database } from '@/data/ports/Database'
import {
  initDatabase,
  isDatabaseHeldByOtherTab,
  isMultiTabLockError,
  resetDatabase,
} from '@/data/sqlite'

interface DbContextValue {
  db: Database
}

const DbContext = createContext<DbContextValue | null>(null)

type Status =
  | { state: 'loading' }
  | { state: 'waiting' }
  | { state: 'ready'; db: Database }
  | { state: 'error'; error: Error; multiTab: boolean }

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let settled = false
    setStatus({ state: 'loading' })

    // Resolve straight off the init promise so `ready`/`error` is always set when
    // it settles (an earlier sequential `await` before init could drop the ready
    // update when the effect re-ran under StrictMode, leaving the UI stuck on
    // "Carregando…" even though the DB was ready).
    initDatabase()
      .then((db) => {
        settled = true
        if (!cancelled) setStatus({ state: 'ready', db })
      })
      .catch((err: unknown) => {
        settled = true
        if (!cancelled) {
          const error = err as Error
          setStatus({ state: 'error', error, multiTab: isMultiTabLockError(error) })
        }
      })

    // If init is still blocked after a moment because another tab owns the DB,
    // show the friendly "open in another tab" screen. It recovers on its own when
    // that tab closes — the pending initDatabase() above then resolves to ready.
    const waitTimer = window.setTimeout(() => {
      if (settled || cancelled) return
      void isDatabaseHeldByOtherTab().then((held) => {
        if (!settled && !cancelled && held) setStatus({ state: 'waiting' })
      })
    }, 800)

    return () => {
      cancelled = true
      window.clearTimeout(waitTimer)
    }
  }, [attempt])

  const retry = () => {
    // Show the loading screen immediately, tear everything down (releasing the
    // OPFS handles), then re-run the init effect.
    setStatus({ state: 'loading' })
    void resetDatabase().then(() => setAttempt((n) => n + 1))
  }

  if (status.state === 'loading') {
    return <FullScreenMessage title="Carregando banco de dados…" />
  }

  if (status.state === 'waiting') {
    return <MultiTabScreen onRetry={retry} />
  }

  if (status.state === 'error') {
    if (status.multiTab) {
      return <MultiTabScreen onRetry={retry} />
    }
    return (
      <FullScreenMessage title="Falha ao iniciar o banco de dados" error>
        <p className="mt-2 max-w-md text-xs text-slate-400">{status.error.message}</p>
        <RetryButton onRetry={retry} />
      </FullScreenMessage>
    )
  }

  return <DbContext.Provider value={{ db: status.db }}>{children}</DbContext.Provider>
}

export function useDatabase(): Database {
  const ctx = useContext(DbContext)
  if (!ctx) throw new Error('useDatabase deve ser usado dentro de <DatabaseProvider>')
  return ctx.db
}

/** Shown when the DB is already open in another tab (OPFS is single-owner). */
function MultiTabScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
          <Copy className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
          O GB PDI já está aberto em outra aba
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Para manter seus dados seguros, o banco de dados local só pode ficar aberto em uma
          aba por vez. Feche a outra aba (ou janela) — esta abre sozinha assim que ela fechar.
        </p>
        <RetryButton onRetry={onRetry} />
      </div>
    </div>
  )
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
    >
      <RefreshCw className="h-4 w-4" />
      Tentar de novo
    </button>
  )
}

function FullScreenMessage({
  title,
  error,
  children,
}: {
  title: string
  error?: boolean
  children?: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="flex flex-col items-center text-center">
        {error && (
          <AlertTriangle className="mb-3 h-8 w-8 text-rose-500 dark:text-rose-400" />
        )}
        <p
          className={
            error
              ? 'text-sm font-semibold text-rose-600 dark:text-rose-400'
              : 'text-sm font-medium text-slate-500 dark:text-slate-400'
          }
        >
          {title}
        </p>
        {children}
      </div>
    </div>
  )
}
