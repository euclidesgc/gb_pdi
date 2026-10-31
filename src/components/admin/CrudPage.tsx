import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { Button, TextInput } from '@/components/ui/controls'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'

const ROW_CAP = 300

export interface CrudPageProps<T extends { id: string }> {
  title: string
  description?: string
  columns: DataTableColumn<T>[]
  load: () => Promise<T[]>
  /** A new, empty record. Receives the loaded rows (e.g. to pick the next `ordem`). */
  blank: (rows: T[]) => T
  renderForm: (draft: T, update: (patch: Partial<T>) => void) => ReactNode
  save: (row: T) => Promise<void>
  remove: (id: string) => Promise<void>
  labelOf: (row: T) => string
  validate?: (draft: T) => string | null
  addLabel?: string
  /** Optional extra controls shown in the header (e.g. a "seed" button). */
  headerExtra?: ReactNode
}

export function CrudPage<T extends { id: string }>(props: CrudPageProps<T>) {
  const { load } = props
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<T | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState<T | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((row) => props.labelOf(row).toLowerCase().includes(q))
  }, [items, query, props])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await load())
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [load])

  useEffect(() => {
    void reload()
  }, [reload])

  const onSave = async () => {
    if (!editing) return
    const problem = props.validate?.(editing)
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    try {
      await props.save(editing)
      setEditing(null)
      await reload()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!confirmDel) return
    try {
      await props.remove(confirmDel.id)
      setConfirmDel(null)
      await reload()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {props.title}
          </h1>
          {props.description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {props.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {props.headerExtra}
          <Button variant="primary" onClick={() => setEditing(props.blank(items))}>
            <Plus className="h-4 w-4" />
            {props.addLabel ?? 'Novo'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar…"
          className="pl-9"
        />
      </div>

      <div className="mt-4">
        <DataTable<T>
          columns={props.columns}
          rows={filtered}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage={query ? 'Nenhum resultado para a busca.' : 'Nenhum registro ainda.'}
          limit={ROW_CAP}
          actions={(row) => (
            <>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Editar"
                onClick={() => setEditing({ ...row })}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-rose-500"
                aria-label="Excluir"
                onClick={() => setConfirmDel(row)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        />
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title="Registro">
          <div className="space-y-4">
            {props.renderForm(editing, (patch) =>
              setEditing((cur) => (cur ? { ...cur, ...patch } : cur)),
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setEditing(null)}>Cancelar</Button>
            <Button variant="primary" onClick={onSave} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <Modal onClose={() => setConfirmDel(null)} title="Excluir registro">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Excluir <strong>{props.labelOf(confirmDel)}</strong>? Essa ação não pode ser
            desfeita.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button onClick={() => setConfirmDel(null)}>Cancelar</Button>
            <Button variant="danger" onClick={onDelete}>
              Excluir
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>
          <Button variant="ghost" className="h-8 w-8 p-0" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
