import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from './AuthProvider'

/** Sends signed-out visitors to /login, remembering where they were going. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return children
}

/** /admin edits the shared catalog: admins only. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <RequireAuth>{children}</RequireAuth>
  if (!user.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="max-w-md text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-amber-500" />
          <h1 className="mt-3 text-lg font-semibold text-slate-800 dark:text-slate-100">
            Acesso restrito
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Apenas administradores podem editar o catálogo de referência.
          </p>
          <Link
            to="/app"
            className="mt-5 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Voltar ao meu PDI
          </Link>
        </div>
      </div>
    )
  }
  return children
}
