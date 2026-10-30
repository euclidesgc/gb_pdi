import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { AuthUser } from '@/domain/auth'
import { apiFetch, ApiError, onUnauthorized } from '@/data/http/api'

interface AuthContextValue {
  user: AuthUser | null
  /** Whether the server can send e-mail (password reset, verification). */
  emailEnabled: boolean
  login(email: string, senha: string): Promise<void>
  register(input: { email: string; nome: string; senha: string }): Promise<void>
  logout(): Promise<void>
  /** Sets a new password from an e-mailed reset link; signs the user in. */
  resetPassword(token: string, senha: string): Promise<void>
  /** Re-reads the signed-in account (e.g. after confirming the e-mail). */
  refresh(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type Status = { state: 'loading' } | { state: 'ready' } | { state: 'error'; error: Error }

const fetchMe = () =>
  apiFetch<AuthUser>('/auth/me').catch((err: unknown) => {
    // 401 just means "not signed in"; anything else is the API being down.
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [status, setStatus] = useState<Status>({ state: 'loading' })

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchMe(), apiFetch<{ emailEnabled: boolean }>('/auth/config')])
      .then(([u, config]) => {
        if (cancelled) return
        setUser(u)
        setEmailEnabled(config.emailEnabled)
        setStatus({ state: 'ready' })
      })
      .catch((err: unknown) => !cancelled && setStatus({ state: 'error', error: err as Error }))
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

  const resetPassword = useCallback(async (token: string, senha: string) => {
    setUser(await apiFetch<AuthUser>('/auth/reset-password', { token, senha }))
  }, [])

  const refresh = useCallback(async () => {
    setUser(await fetchMe())
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
    <AuthContext.Provider
      value={{ user, emailEnabled, login, register, logout, resetPassword, refresh }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
