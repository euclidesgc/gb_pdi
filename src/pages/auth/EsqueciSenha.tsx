import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthScreen, FormMessage } from '@/components/auth/AuthScreen'
import { Button, Field, TextInput } from '@/components/ui/controls'
import { apiFetch } from '@/data/http/api'

export function EsqueciSenha() {
  const location = useLocation()
  const [email, setEmail] = useState(
    () => (location.state as { email?: string } | null)?.email ?? '',
  )
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await apiFetch('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen
      title="Esqueci minha senha"
      subtitle="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
      footer={
        <Link to="/login" className="font-medium text-indigo-600 dark:text-indigo-400">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <FormMessage tone="ok">
          Se existir uma conta com <strong>{email}</strong>, você vai receber o link em alguns
          minutos. Confira também a caixa de spam. O link vale por 1 hora.
        </FormMessage>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="E-mail">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              autoFocus
            />
          </Field>
          {error && <FormMessage tone="err">{error}</FormMessage>}
          <Button type="submit" variant="primary" disabled={busy} className="py-2.5">
            {busy ? 'Enviando…' : 'Enviar link'}
          </Button>
        </form>
      )}
    </AuthScreen>
  )
}
