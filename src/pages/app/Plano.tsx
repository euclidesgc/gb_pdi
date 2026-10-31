import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button, Field, Select, SelectItem, SELECT_NONE, TextInput } from '@/components/ui/controls'
import { Dica, Exemplos } from '@/components/ui/Dica'
import { MarkdownEditor } from '@/components/ui/MarkdownEditor'
import { Modal } from '@/components/ui/Modal'
import { usePdiRepository } from '@/data/repositories'
import type { Acao, AcaoStatus, Objetivo, ObjetivoCategoria } from '@/domain/pdi'
import { cn } from '@/lib/cn'
import { newId } from '@/lib/id'
import { daysUntil, formatDateBr } from '@/lib/pdiStats'
import { acaoDepoisDoObjetivo, prazoTexto, URGENCIA, urgenciaDe } from '@/lib/prazos'

/** Exemplos de ações: começam por um verbo e têm um resultado verificável. */
const EXEMPLOS_ACAO = [
  'Concluir o curso de SQL avançado e aplicar em 1 relatório',
  'Escrever um ADR para a migração do serviço de pagamentos',
  'Apresentar uma tech talk de 20 min para o time',
  'Pedir feedback ao líder sobre a última entrega',
  'Revisar 10 PRs de outros times neste mês',
]

/** Ordem dentro da coluna: prazo mais próximo primeiro; sem prazo no fim. */
function porPrazo(a: Acao, b: Acao): number {
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate) || a.ordem - b.ordem
  if (a.dueDate) return -1
  if (b.dueDate) return 1
  return a.ordem - b.ordem
}

const COLUNAS: { id: AcaoStatus; label: string; dot: string }[] = [
  { id: 'pendente', label: 'Pendente', dot: 'bg-slate-400' },
  { id: 'em_andamento', label: 'Em andamento', dot: 'bg-amber-500' },
  { id: 'concluido', label: 'Concluído', dot: 'bg-emerald-500' },
]

const CAT_STYLE: Record<ObjetivoCategoria, string> = {
  educacional: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  funcional: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
}

const EMPTY_ACAO: Acao = {
  id: '',
  objetivoId: null,
  titulo: '',
  categoria: 'educacional',
  prazo: null,
  dueDate: null,
  status: 'pendente',
  detalhes: null,
  ordem: 0,
}

function nextStatus(s: AcaoStatus): AcaoStatus | null {
  if (s === 'pendente') return 'em_andamento'
  if (s === 'em_andamento') return 'concluido'
  return null
}
function prevStatus(s: AcaoStatus): AcaoStatus | null {
  if (s === 'concluido') return 'em_andamento'
  if (s === 'em_andamento') return 'pendente'
  return null
}

export function Plano() {
  const pdi = usePdiRepository()
  const [acoes, setAcoes] = useState<Acao[]>([])
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Acao | null>(null)
  const [dragOver, setDragOver] = useState<AcaoStatus | null>(null)

  const load = async () => {
    const [a, o] = await Promise.all([pdi.listAcoes(), pdi.listObjetivos()])
    setAcoes(a)
    setObjetivos(o)
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [pdi])

  const objetivoById = useMemo(() => {
    const m = new Map<string, Objetivo>()
    objetivos.forEach((o) => m.set(o.id, o))
    return m
  }, [objetivos])

  const move = async (id: string, status: AcaoStatus) => {
    setAcoes((cur) => cur.map((a) => (a.id === id ? { ...a, status } : a)))
    await pdi.updateAcaoStatus(id, status)
  }

  const saveAcao = async (a: Acao) => {
    const toSave = a.id ? a : { ...a, id: newId(), ordem: acoes.length }
    await pdi.upsertAcao(toSave)
    setEditing(null)
    await load()
  }
  const removeAcao = async (id: string) => {
    await pdi.deleteAcao(id)
    await load()
  }

  if (loading) {
    return <p className="text-center text-sm text-slate-400">Carregando plano…</p>
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Plano de ação</h1>
        </div>
        <Button variant="primary" onClick={() => setEditing({ ...EMPTY_ACAO })}>
          <Plus className="h-4 w-4" />
          Nova ação
        </Button>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Arraste os cartões entre as colunas ou use as setas para mover. Em cada coluna, o prazo mais
        próximo vem primeiro.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUNAS.map((col) => {
          const items = acoes.filter((a) => a.status === col.id).sort(porPrazo)
          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(col.id)
              }}
              onDragLeave={() => setDragOver((cur) => (cur === col.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain')
                setDragOver(null)
                if (id) void move(id, col.id)
              }}
              className={
                'rounded-2xl border bg-slate-50/60 p-3 transition-colors dark:bg-slate-900/40 ' +
                (dragOver === col.id
                  ? 'border-indigo-400 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-700')
              }
            >
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={'h-2.5 w-2.5 rounded-full ' + col.dot} />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {col.label}
                </span>
                <span className="ml-auto rounded-full bg-slate-200 px-2 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-slate-400">Vazio</p>
                )}
                {items.map((a) => (
                  <AcaoCard
                    key={a.id}
                    acao={a}
                    objetivo={a.objetivoId ? objetivoById.get(a.objetivoId) : undefined}
                    onEdit={() => setEditing(a)}
                    onDelete={() => removeAcao(a.id)}
                    onMove={(s) => move(a.id, s)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {editing && (
        <AcaoModal
          acao={editing}
          objetivos={objetivos}
          onClose={() => setEditing(null)}
          onSave={saveAcao}
        />
      )}
    </div>
  )
}

function AcaoCard({
  acao,
  objetivo,
  onEdit,
  onDelete,
  onMove,
}: {
  acao: Acao
  objetivo: Objetivo | undefined
  onEdit: () => void
  onDelete: () => void
  onMove: (status: AcaoStatus) => void
}) {
  const prev = prevStatus(acao.status)
  const next = nextStatus(acao.status)
  const aberta = acao.status !== 'concluido'
  const dias = acao.dueDate ? daysUntil(acao.dueDate) : null
  const urg = dias !== null && aberta ? URGENCIA[urgenciaDe(dias)] : null
  const depois = aberta && acaoDepoisDoObjetivo(acao, objetivo)

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', acao.id)}
      className={cn(
        'group cursor-grab rounded-xl border border-slate-200 bg-white p-3 active:cursor-grabbing dark:border-slate-700 dark:bg-slate-900',
        urg && dias !== null && dias <= 7 && cn('border-l-4', urg.borda),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={
            'text-sm font-medium text-slate-800 dark:text-slate-100 ' +
            (acao.status === 'concluido' ? 'line-through opacity-60' : '')
          }
        >
          {acao.titulo}
        </span>
        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-slate-400 hover:text-rose-500"
            aria-label="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={'rounded-full px-2 py-0.5 text-[10px] font-medium ' + CAT_STYLE[acao.categoria]}>
          {acao.categoria}
        </span>
        {objetivo && (
          <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {objetivo.titulo}
          </span>
        )}
        {acao.dueDate && (
          <span
            title={formatDateBr(acao.dueDate)}
            className={cn(
              'flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]',
              urg && dias !== null && dias <= 30 ? cn('font-medium', urg.badge) : 'text-slate-400',
            )}
          >
            <Calendar className="h-3 w-3" />
            {aberta && dias !== null && dias <= 30 ? prazoTexto(dias, acao.dueDate) : formatDate(acao.dueDate)}
          </span>
        )}
        {depois && (
          <span
            title={`Vence depois do prazo do objetivo (${formatDateBr(objetivo?.prazo ?? null)})`}
            className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400"
          >
            <AlertTriangle className="h-3 w-3" />
            após o objetivo
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          disabled={!prev}
          onClick={() => prev && onMove(prev)}
          className="rounded p-1 text-slate-400 hover:text-indigo-500 disabled:invisible"
          aria-label="Mover para a esquerda"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={!next}
          onClick={() => next && onMove(next)}
          className="rounded p-1 text-slate-400 hover:text-indigo-500 disabled:invisible"
          aria-label="Mover para a direita"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function AcaoModal({
  acao,
  objetivos,
  onClose,
  onSave,
}: {
  acao: Acao
  objetivos: Objetivo[]
  onClose: () => void
  onSave: (a: Acao) => void
}) {
  const [form, setForm] = useState<Acao>(acao)
  const valid = form.titulo.trim().length > 0
  const objetivo = form.objetivoId ? objetivos.find((o) => o.id === form.objetivoId) : undefined
  const depois = acaoDepoisDoObjetivo(form, objetivo)

  return (
    <Modal title={acao.id ? 'Editar ação' : 'Nova ação'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="O que fazer">
          <TextInput
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            placeholder="Comece com um verbo: concluir, escrever, apresentar…"
          />
          {!acao.id && !form.titulo && (
            <Exemplos itens={EXEMPLOS_ACAO} onEscolher={(t) => setForm((f) => ({ ...f, titulo: t }))} />
          )}
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Objetivo relacionado">
            <Select
              value={form.objetivoId || SELECT_NONE}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, objetivoId: v === SELECT_NONE ? null : v }))
              }
            >
              <SelectItem value={SELECT_NONE}>— Nenhum</SelectItem>
              {objetivos.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.titulo}
                </SelectItem>
              ))}
            </Select>
          </Field>
          <Field label="Categoria">
            <Select
              value={form.categoria}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, categoria: v as ObjetivoCategoria }))
              }
            >
              <SelectItem value="educacional">Educacional</SelectItem>
              <SelectItem value="funcional">Funcional</SelectItem>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Prazo">
            <TextInput
              type="date"
              value={form.dueDate ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value || null }))}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as AcaoStatus }))}
            >
              {COLUNAS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </Select>
          </Field>
        </div>
        {depois && objetivo?.prazo && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">
              Este prazo fica depois do prazo do objetivo ({formatDateBr(objetivo.prazo)}). Dá para
              salvar assim, mas talvez valha ajustar um dos dois.
            </span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, dueDate: objetivo.prazo }))}
              className="shrink-0 font-semibold underline"
            >
              Usar {formatDate(objetivo.prazo)}
            </button>
          </div>
        )}
        <Field label="Detalhes (opcional)">
          <MarkdownEditor
            value={form.detalhes ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, detalhes: v || null }))}
            placeholder="Passos, links, critério de pronto. Ex.: - [ ] módulos 1 a 4  - [ ] aplicar no relatório X"
            minRows={3}
            compact
          />
        </Field>
        <Dica>
          Boas ações são pequenas (cabem em 1 a 4 semanas), têm prazo e um resultado que dá para
          verificar. Ligue a ação a um objetivo para acompanhar o progresso dele.
        </Dica>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!valid} onClick={() => onSave(form)}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}`
}
