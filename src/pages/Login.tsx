import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { AuthScreen, FormMessage } from '@/components/auth/AuthScreen'
import { Button, Field, TextInput } from '@/components/ui/controls'
import { SENHA_MIN } from '@/domain/auth'
import { cn } from '@/lib/cn'

type Mode = 'login' | 'register'

export function Login() {
  const { user, login, register, emailEnabled } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/app'} replace />
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') await login(email, senha)
      else await register({ email, nome, senha })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              mode === m
                ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            {m === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        {mode === 'register' && (
          <Field label="Nome">
            <TextInput
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              required
            />
          </Field>
        )}
        <Field label="E-mail">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Senha">
          <TextInput
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? SENHA_MIN : undefined}
            required
          />
        </Field>
        {mode === 'login' && emailEnabled && (
          <Link
            to="/esqueci-senha"
            state={{ email }}
            className="-mt-2 self-end text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Esqueci minha senha
          </Link>
        )}
        {error && <FormMessage tone="err">{error}</FormMessage>}
        <Button type="submit" variant="primary" disabled={busy} className="mt-1 py-2.5">
          {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </Button>
      </form>
    </AuthScreen>
  )
}
