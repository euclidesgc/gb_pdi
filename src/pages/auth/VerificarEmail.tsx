import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { AuthScreen, FormMessage } from '@/components/auth/AuthScreen'
import { apiFetch } from '@/data/http/api'

type State = { s: 'loading' } | { s: 'ok' } | { s: 'err'; msg: string }

export function VerificarEmail() {
  const { user, refresh } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [state, setState] = useState<State>(
    token ? { s: 'loading' } : { s: 'err', msg: 'Link incompleto.' },
  )
  // Tokens are single-use: StrictMode's double effect must not spend it twice.
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    apiFetch('/auth/verify-email', { token })
      .then(async () => {
        setState({ s: 'ok' })
        await refresh().catch(() => {})
      })
      .catch((err: unknown) =>
        setState({ s: 'err', msg: err instanceof Error ? err.message : String(err) }),
      )
  }, [token, refresh])

  return (
    <AuthScreen
      title="Confirmação de e-mail"
      footer={
        <Link
          to={user ? '/app' : '/login'}
          className="font-medium text-indigo-600 dark:text-indigo-400"
        >
          {user ? 'Ir para o meu PDI' : 'Ir para o login'}
        </Link>
      }
    >
      {state.s === 'loading' && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Confirmando…</p>
      )}
      {state.s === 'ok' && <FormMessage tone="ok">E-mail confirmado. Obrigado!</FormMessage>}
      {state.s === 'err' && (
        <FormMessage tone="err">
          {state.msg} {user && 'Você pode pedir um novo link na página de Perfil.'}
        </FormMessage>
      )}
    </AuthScreen>
  )
}
