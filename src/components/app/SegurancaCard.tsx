import { useState, type FormEvent } from 'react'
import { KeyRound, LogOut, MailCheck, MailWarning } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { FormMessage } from '@/components/auth/AuthScreen'
import { Button, Card, Field, TextInput } from '@/components/ui/controls'
import { apiFetch } from '@/data/http/api'
import { SENHA_MIN } from '@/domain/auth'

type Msg = { tone: 'ok' | 'err'; text: string } | null

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err))

/** Perfil → account security: e-mail confirmation, password change, other sessions. */
export function SegurancaCard() {
  const { user, emailEnabled } = useAuth()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [senhaMsg, setSenhaMsg] = useState<Msg>(null)
  const [emailMsg, setEmailMsg] = useState<Msg>(null)
  const [sessoesMsg, setSessoesMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState<'senha' | 'email' | 'sessoes' | null>(null)

  if (!user) return null

  const trocarSenha = async (e: FormEvent) => {
    e.preventDefault()
    setSenhaMsg(null)
    if (novaSenha !== confirmacao) {
      setSenhaMsg({ tone: 'err', text: 'As senhas não conferem.' })
      return
    }
    setBusy('senha')
    try {
      await apiFetch('/auth/change-password', { senhaAtual, novaSenha })
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmacao('')
      setSenhaMsg({ tone: 'ok', text: 'Senha alterada. As outras sessões foram encerradas.' })
    } catch (err) {
      setSenhaMsg({ tone: 'err', text: errText(err) })
    } finally {
      setBusy(null)
    }
  }

  const reenviar = async () => {
    setBusy('email')
    setEmailMsg(null)
    try {
      await apiFetch('/auth/resend-verification', {})
      setEmailMsg({ tone: 'ok', text: `Enviamos um link para ${user.email}.` })
    } catch (err) {
      setEmailMsg({ tone: 'err', text: errText(err) })
    } finally {
      setBusy(null)
    }
  }

  const sairDosOutros = async () => {
    setBusy('sessoes')
    setSessoesMsg(null)
    try {
      const { ended } = await apiFetch<{ ended: number }>('/auth/logout-others', {})
      setSessoesMsg({
        tone: 'ok',
        text: ended
          ? `${ended} ${ended === 1 ? 'sessão encerrada' : 'sessões encerradas'}.`
          : 'Não havia outras sessões abertas.',
      })
    } catch (err) {
      setSessoesMsg({ tone: 'err', text: errText(err) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="mt-6 space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Conta e segurança
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Você entra com <strong>{user.email}</strong>.
        </p>
      </div>

      {emailEnabled && (
        <div className="flex flex-wrap items-center gap-3">
          {user.emailVerified ? (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <MailCheck className="h-4 w-4" />
              E-mail confirmado
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                <MailWarning className="h-4 w-4" />
                E-mail ainda não confirmado
              </span>
              <Button variant="secondary" onClick={reenviar} disabled={busy === 'email'}>
                Reenviar link de confirmação
              </Button>
            </>
          )}
          {emailMsg && <FormMessage tone={emailMsg.tone}>{emailMsg.text}</FormMessage>}
        </div>
      )}

      <form
        onSubmit={trocarSenha}
        className="space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800"
      >
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <KeyRound className="h-4 w-4" />
          Alterar senha
        </h3>
        <Field label="Senha atual">
          <TextInput
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nova senha">
            <TextInput
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              autoComplete="new-password"
              minLength={SENHA_MIN}
              required
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
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" disabled={busy === 'senha'}>
            {busy === 'senha' ? 'Salvando…' : 'Alterar senha'}
          </Button>
          {senhaMsg && <FormMessage tone={senhaMsg.tone}>{senhaMsg.text}</FormMessage>}
        </div>
      </form>

      <div className="space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Esqueceu o app aberto em outro computador ou celular? Encerre todas as outras sessões;
          esta continua aberta.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={sairDosOutros} disabled={busy === 'sessoes'}>
            <LogOut className="h-4 w-4" />
            Sair dos outros dispositivos
          </Button>
          {sessoesMsg && <FormMessage tone={sessoesMsg.tone}>{sessoesMsg.text}</FormMessage>}
        </div>
      </div>
    </Card>
  )
}
