import { useEffect, useState } from 'react'
import { Lock, Search } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { FormMessage } from '@/components/auth/AuthScreen'
import { Card, Select, SelectItem, TextInput } from '@/components/ui/controls'
import { apiFetch } from '@/data/http/api'
import type { AdminUserRow, UserRole } from '@/domain/auth'

const ROLE_LABEL: Record<UserRole, string> = { user: 'Usuário', admin: 'Administrador' }

const dataBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

export function UsuariosAdmin() {
  const { user: me } = useAuth()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  // Debounced server-side search by name or e-mail.
  useEffect(() => {
    let cancelled = false
    const t = window.setTimeout(() => {
      setLoading(true)
      apiFetch<AdminUserRow[]>(`/admin/users?q=${encodeURIComponent(query.trim())}`)
        .then((r) => !cancelled && setRows(r))
        .catch((err: Error) => !cancelled && setMsg({ tone: 'err', text: err.message }))
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [query])

  const changeRole = async (row: AdminUserRow, role: UserRole) => {
    if (role === row.role) return
    setSavingId(row.id)
    setMsg(null)
    try {
      await apiFetch(`/admin/users/${encodeURIComponent(row.id)}/role`, { role })
      setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, role } : r)))
      setMsg({
        tone: 'ok',
        text: `${row.nome || row.email} agora é ${ROLE_LABEL[role].toLowerCase()}.`,
      })
    } catch (err) {
      setMsg({ tone: 'err', text: (err as Error).message })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Usuários</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Procure pelo nome ou e-mail e defina o papel de cada conta. Administradores editam o
        catálogo e gerenciam usuários.
      </p>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          className="pl-9"
          aria-label="Buscar usuários"
        />
      </div>

      {msg && (
        <div className="mt-4">
          <FormMessage tone={msg.tone}>{msg.text}</FormMessage>
        </div>
      )}

      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase dark:border-slate-700 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">E-mail</th>
              <th className="hidden px-4 py-3 font-semibold sm:table-cell">Desde</th>
              <th className="w-48 px-4 py-3 font-semibold">Papel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => {
              const isMe = r.id === me?.id
              const locked = r.roleLocked || isMe
              return (
                <tr key={r.id} className="text-slate-700 dark:text-slate-200">
                  <td className="px-4 py-3 font-medium">
                    {r.nome || '—'}
                    {isMe && (
                      <span className="ml-2 text-xs font-normal text-slate-400">(você)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.email}
                    {!r.emailVerified && (
                      <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                        não confirmado
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell dark:text-slate-400">
                    {dataBr(r.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {locked ? (
                      <span
                        className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"
                        title={
                          r.roleLocked
                            ? 'Definido em ADMIN_EMAILS no servidor'
                            : 'Você não pode mudar o seu próprio papel'
                        }
                      >
                        <Lock className="h-3.5 w-3.5" />
                        {ROLE_LABEL[r.role]}
                      </span>
                    ) : (
                      <Select
                        value={r.role}
                        onValueChange={(v) => void changeRole(r, v as UserRole)}
                        disabled={savingId === r.id}
                      >
                        <SelectItem value="user">{ROLE_LABEL.user}</SelectItem>
                        <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
                      </Select>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Nenhum usuário encontrado.</p>
        )}
        {loading && rows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Carregando…</p>
        )}
      </Card>
      {rows.length === 50 && (
        <p className="mt-2 text-xs text-slate-400">
          Mostrando os 50 mais recentes. Refine a busca.
        </p>
      )}
    </div>
  )
}
