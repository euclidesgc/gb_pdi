import { useEffect, useState, type FormEvent } from 'react'
import { Bot, Copy, Trash2 } from 'lucide-react'
import { FormMessage } from '@/components/auth/AuthScreen'
import { Button, Card, Field, TextInput } from '@/components/ui/controls'
import { apiFetch } from '@/data/http/api'
import type { ApiToken } from '@/domain/auth'
import { formatDateBr } from '@/lib/pdiStats'

type Msg = { tone: 'ok' | 'err'; text: string } | null

const errText = (err: unknown) => (err instanceof Error ? err.message : String(err))

const dataBr = (iso: string | null) => (iso ? formatDateBr(iso.slice(0, 10)) : 'nunca')

/** Perfil → personal access tokens that let an AI agent fill the PDI over MCP. */
export function AgentesIaCard() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [nome, setNome] = useState('')
  const [novo, setNovo] = useState<string | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)

  const mcpUrl = `${window.location.origin}/mcp`

  const carregar = async () => setTokens(await apiFetch<ApiToken[]>('/auth/api-tokens'))

  useEffect(() => {
    void carregar().catch(() => {})
  }, [])

  const criar = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const t = await apiFetch<ApiToken & { token: string }>('/auth/api-tokens', { nome })
      setNovo(t.token)
      setNome('')
      await carregar()
    } catch (err) {
      setMsg({ tone: 'err', text: errText(err) })
    } finally {
      setBusy(false)
    }
  }

  const revogar = async (t: ApiToken) => {
    if (!confirm(`Revogar o token "${t.nome}"? Agentes que o usam perdem o acesso.`)) return
    try {
      await apiFetch(`/auth/api-tokens/${encodeURIComponent(t.id)}/revoke`, {})
      await carregar()
    } catch (err) {
      setMsg({ tone: 'err', text: errText(err) })
    }
  }

  const copiar = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMsg({ tone: 'ok', text: 'Copiado.' })
    } catch {
      setMsg({ tone: 'err', text: 'Não foi possível copiar. Selecione e copie manualmente.' })
    }
  }

  const comando = `claude mcp add --transport http gb-pdi ${mcpUrl} --header "Authorization: Bearer ${novo ?? '<seu-token>'}"`

  return (
    <Card className="mt-6 space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Bot className="h-4 w-4" />
          Acesso por agentes de IA (MCP)
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Gere um token para que um agente de IA (Claude, Cursor, etc.) leia e preencha o seu PDI
          pelo servidor MCP em <code className="text-xs">{mcpUrl}</code>. O token dá acesso ao seu
          PDI: trate-o como uma senha.
        </p>
      </div>

      <form onSubmit={criar} className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Field label="Nome do token">
            <TextInput
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Claude no notebook"
              maxLength={60}
              required
            />
          </Field>
        </div>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Gerando…' : 'Gerar token'}
        </Button>
      </form>

      {novo && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            Copie o token agora: ele não será mostrado de novo.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1.5 text-xs dark:bg-slate-900">
              {novo}
            </code>
            <Button variant="secondary" onClick={() => copiar(novo)} aria-label="Copiar token">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-slate-600 dark:text-slate-300">Para usar no Claude Code:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1.5 text-xs dark:bg-slate-900">
              {comando}
            </code>
            <Button variant="secondary" onClick={() => copiar(comando)} aria-label="Copiar comando">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {tokens.length > 0 && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-700 dark:text-slate-200">{t.nome}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <code>{t.prefixo}…</code> · criado em {dataBr(t.createdAt)} · último uso{' '}
                  {dataBr(t.lastUsedAt)}
                </p>
              </div>
              <Button variant="danger" onClick={() => revogar(t)} aria-label={`Revogar ${t.nome}`}>
                <Trash2 className="h-4 w-4" />
                Revogar
              </Button>
            </li>
          ))}
        </ul>
      )}

      {msg && <FormMessage tone={msg.tone}>{msg.text}</FormMessage>}
    </Card>
  )
}
