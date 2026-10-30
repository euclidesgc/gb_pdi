import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { AuthScreen, FormMessage } from '@/components/auth/AuthScreen'
import { Button, Field, TextInput } from '@/components/ui/controls'
import { SENHA_MIN } from '@/domain/auth'

export function RedefinirSenha() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (senha !== confirmacao) {
      setError('As senhas não conferem.')
      return
    }
    setBusy(true)
    try {
      await resetPassword(token, senha)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  const footer = (
    <Link to="/esqueci-senha" className="font-medium text-indigo-600 dark:text-indigo-400">
      Pedir um novo link
    </Link>
  )

  if (!token) {
    return (
      <AuthScreen title="Redefinir senha" footer={footer}>
        <FormMessage tone="err">
          Link incompleto. Abra o link exatamente como veio no e-mail.
        </FormMessage>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen
      title="Criar nova senha"
      subtitle="Ao salvar, você entra no app e as outras sessões da sua conta são encerradas."
      footer={footer}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nova senha">
          <TextInput
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="new-password"
            minLength={SENHA_MIN}
            required
            autoFocus
          />
        </Field>
        <Field label="Confirme a nova senha">
          <TextInput
            type="password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            autoComplete="new-password"
            minLength={SENHA_MIN}
            required
          />
        </Field>
        {error && <FormMessage tone="err">{error}</FormMessage>}
        <Button type="submit" variant="primary" disabled={busy} className="py-2.5">
          {busy ? 'Salvando…' : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthScreen>
  )
}
