import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Minus,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Button, Card, Field, LevelSelect, Select, SelectItem, TextArea, TextInput } from '@/components/ui/controls'
import { Modal } from '@/components/ui/Modal'
import { usePdiRepository } from '@/data/repositories'
import type { Forca, ForcaTipo, Objetivo, ObjetivoCategoria } from '@/domain/pdi'
import { newId } from '@/lib/id'

const CATEGORIAS: { id: ObjetivoCategoria; label: string; hint: string }[] = [
  { id: 'educacional', label: 'Educacional', hint: 'Aprender algo novo' },
  { id: 'funcional', label: 'Funcional', hint: 'Entregar no trabalho' },
]

const CAT_LABEL: Record<ObjetivoCategoria, string> = {
  educacional: 'Educacional',
  funcional: 'Funcional',
}

const CAT_STYLE: Record<ObjetivoCategoria, string> = {
  educacional: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  funcional: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
}

const EMPTY_OBJ: Objetivo = {
  id: '',
  titulo: '',
  categoria: 'educacional',
  prazo: null,
  justificativa: null,
  ordem: 0,
}

export function Objetivos() {
  const pdi = usePdiRepository()
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [forcas, setForcas] = useState<Forca[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Objetivo | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    const [o, f] = await Promise.all([pdi.listObjetivos(), pdi.listForcas()])
    setObjetivos(o)
    setForcas(f)
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [pdi])

  const saveObjetivo = async (o: Objetivo) => {
    const toSave = o.id
      ? o
      : { ...o, id: newId(), ordem: objetivos.length }
    await pdi.upsertObjetivo(toSave)
    setEditing(null)
    await load()
  }
  const removeObjetivo = async (id: string) => {
    await pdi.deleteObjetivo(id)
    await load()
  }

  if (loading) {
    return <p className="text-center text-sm text-slate-400">Carregando objetivos…</p>
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Objetivos</h1>
        </div>
        <Button variant="primary" onClick={() => setEditing({ ...EMPTY_OBJ })}>
          <Plus className="h-4 w-4" />
          Novo objetivo
        </Button>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Defina aonde quer chegar e, em cada objetivo, mapeie o campo de forças que ajuda ou
        atrapalha.
      </p>

      {objetivos.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-400">
            Nenhum objetivo ainda. Crie o primeiro para começar.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {objetivos.map((o) => (
          <ObjetivoCard
            key={o.id}
            objetivo={o}
            forcas={forcas.filter((f) => f.objetivoId === o.id)}
            expanded={expanded === o.id}
            onToggle={() => setExpanded((cur) => (cur === o.id ? null : o.id))}
            onEdit={() => setEditing(o)}
            onDelete={() => removeObjetivo(o.id)}
            onForcasChange={load}
          />
        ))}
      </div>

      {editing && (
        <ObjetivoModal
          objetivo={editing}
          onClose={() => setEditing(null)}
          onSave={saveObjetivo}
        />
      )}
    </div>
  )
}

function ObjetivoCard({
  objetivo,
  forcas,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onForcasChange,
}: {
  objetivo: Objetivo
  forcas: Forca[]
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onForcasChange: () => Promise<void>
}) {
  const impulsoras = forcas.filter((f) => f.tipo === 'impulsora')
  const restritivas = forcas.filter((f) => f.tipo === 'restritiva')
  const somaImp = impulsoras.reduce((s, f) => s + f.intensidade, 0)
  const somaRes = restritivas.reduce((s, f) => s + f.intensidade, 0)

  return (
    <Card className="p-0">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={onToggle}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label={expanded ? 'Recolher' : 'Expandir'}
        >
          {expanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {objetivo.titulo}
            </span>
            <span
              className={'rounded-full px-2 py-0.5 text-[11px] font-medium ' + CAT_STYLE[objetivo.categoria]}
            >
              {CAT_LABEL[objetivo.categoria]}
            </span>
            {objetivo.prazo && (
              <span className="text-xs text-slate-400">
                prazo {formatDate(objetivo.prazo)}
              </span>
            )}
          </div>
          {objetivo.justificativa && (
            <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
              {objetivo.justificativa}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
            aria-label="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Campo de forças
            </h3>
            <ForcaBalance somaImp={somaImp} somaRes={somaRes} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ForcaColumn
              tipo="impulsora"
              objetivoId={objetivo.id}
              forcas={impulsoras}
              onChange={onForcasChange}
            />
            <ForcaColumn
              tipo="restritiva"
              objetivoId={objetivo.id}
              forcas={restritivas}
              onChange={onForcasChange}
            />
          </div>
        </div>
      )}
    </Card>
  )
}

function ForcaBalance({ somaImp, somaRes }: { somaImp: number; somaRes: number }) {
  const total = somaImp + somaRes
  const impPct = total === 0 ? 50 : (somaImp / total) * 100
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        {somaImp}
      </span>
      <div className="h-2 w-28 overflow-hidden rounded-full bg-rose-200 dark:bg-rose-500/30">
        <div className="h-full bg-emerald-500" style={{ width: impPct + '%' }} />
      </div>
      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{somaRes}</span>
    </div>
  )
}

function ForcaColumn({
  tipo,
  objetivoId,
  forcas,
  onChange,
}: {
  tipo: ForcaTipo
  objetivoId: string
  forcas: Forca[]
  onChange: () => Promise<void>
}) {
  const pdi = usePdiRepository()
  const [draft, setDraft] = useState('')
  const isImp = tipo === 'impulsora'

  const add = async () => {
    const descricao = draft.trim()
    if (!descricao) return
    await pdi.upsertForca({
      id: newId(),
      objetivoId,
      tipo,
      descricao,
      intensidade: 3,
    })
    setDraft('')
    await onChange()
  }
  const patch = async (f: Forca, intensidade: number) => {
    await pdi.upsertForca({ ...f, intensidade })
    await onChange()
  }
  const remove = async (id: string) => {
    await pdi.deleteForca(id)
    await onChange()
  }

  return (
    <div
      className={
        'rounded-xl border p-3 ' +
        (isImp
          ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20'
          : 'border-rose-200 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20')
      }
    >
      <div
        className={
          'mb-2 flex items-center gap-1.5 text-sm font-semibold ' +
          (isImp
            ? 'text-emerald-700 dark:text-emerald-300'
            : 'text-rose-700 dark:text-rose-300')
        }
      >
        {isImp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {isImp ? 'Forças impulsoras' : 'Forças restritivas'}
      </div>
      <div className="space-y-2">
        {forcas.map((f) => (
          <div
            key={f.id}
            className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm text-slate-700 dark:text-slate-200">{f.descricao}</span>
              <button
                type="button"
                onClick={() => remove(f.id)}
                className="text-slate-400 hover:text-rose-500"
                aria-label="Remover"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1.5">
              <LevelSelect
                value={f.intensidade}
                max={5}
                accent={isImp ? 'emerald' : 'indigo'}
                onChange={(n) => patch(f, n)}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <TextInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void add()
          }}
          placeholder={isImp ? 'O que ajuda?' : 'O que atrapalha?'}
          className="text-sm"
        />
        <Button variant="secondary" onClick={add} className="shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function ObjetivoModal({
  objetivo,
  onClose,
  onSave,
}: {
  objetivo: Objetivo
  onClose: () => void
  onSave: (o: Objetivo) => void
}) {
  const [form, setForm] = useState<Objetivo>(objetivo)
  const valid = useMemo(() => form.titulo.trim().length > 0, [form.titulo])

  return (
    <Modal title={objetivo.id ? 'Editar objetivo' : 'Novo objetivo'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Título">
          <TextInput
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            placeholder="Ex.: Liderar um projeto de dados"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Categoria">
            <Select
              value={form.categoria}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, categoria: v as ObjetivoCategoria }))
              }
            >
              {CATEGORIAS.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label} — {c.hint}
                </SelectItem>
              ))}
            </Select>
          </Field>
          <Field label="Prazo">
            <TextInput
              type="date"
              value={form.prazo ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value || null }))}
            />
          </Field>
        </div>
        <Field label="Por que isso importa?">
          <TextArea
            value={form.justificativa ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, justificativa: e.target.value || null }))}
            placeholder="A motivação por trás do objetivo."
          />
        </Field>
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
  return `${d}/${m}/${y}`
}
