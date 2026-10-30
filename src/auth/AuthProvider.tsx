import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { AuthUser } from '@/domain/auth'
import { apiFetch, ApiError, onUnauthorized } from '@/data/http/api'

interface AuthContextValue {
  user: AuthUser | null
  login(email: string, senha: string): Promise<void>
  register(input: { email: string; nome: string; senha: string }): Promise<void>
  logout(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type Status = { state: 'loading' } | { state: 'ready' } | { state: 'error'; error: Error }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<Status>({ state: 'loading' })

  useEffect(() => {
    let cancelled = false
    apiFetch<AuthUser>('/auth/me')
      .then((u) => !cancelled && setUser(u))
      .catch((err: unknown) => {
        // 401 just means "not signed in"; anything else is the API being down.
        if (cancelled) return
        if (!(err instanceof ApiError && err.status === 401)) {
          setStatus({ state: 'error', error: err as Error })
        }
      })
      .finally(() => !cancelled && setStatus((s) => (s.state === 'loading' ? { state: 'ready' } : s)))
    return () => {
      cancelled = true
    }
  }, [])

  // A 401 on any call means the session is gone: drop to the login screen.
  useEffect(() => onUnauthorized(() => setUser(null)), [])

  const login = useCallback(async (email: string, senha: string) => {
    setUser(await apiFetch<AuthUser>('/auth/login', { email, senha }))
  }, [])

  const register = useCallback(async (input: { email: string; nome: string; senha: string }) => {
    setUser(await apiFetch<AuthUser>('/auth/register', input))
  }, [])

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', {}).catch(() => {})
    setUser(null)
  }, [])

  if (status.state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Carregando…</p>
      </div>
    )
  }

  if (status.state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="mb-3 h-8 w-8 text-rose-500 dark:text-rose-400" />
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
            Não foi possível conectar ao servidor
          </p>
          <p className="mt-2 max-w-md text-xs text-slate-400">{status.error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
