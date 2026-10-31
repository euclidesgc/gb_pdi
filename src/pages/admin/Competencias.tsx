import { useCallback } from 'react'
import { CrudPage } from '@/components/admin/CrudPage'
import type { DataTableColumn } from '@/components/ui/DataTable'
import { idColumn } from '@/components/ui/idColumn'
import { Field, Select, SelectItem, TextArea, TextInput } from '@/components/ui/controls'
import { useCatalogRepository } from '@/data/repositories'
import { newId } from '@/lib/id'
import type { Competencia } from '@/domain/catalog'

const columns: DataTableColumn<Competencia>[] = [
  idColumn(),
  {
    id: 'nome',
    header: 'Nome',
    cell: (c) => <span className="font-medium">{c.nome}</span>,
    sortValue: (c) => c.nome,
  },
  {
    id: 'tipo',
    header: 'Tipo',
    cell: (c) => (
      <span
        className={
          c.tipo === 'hard'
            ? 'rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
            : 'rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
        }
      >
        {c.tipo === 'hard' ? 'Hard' : 'Soft'}
      </span>
    ),
    sortValue: (c) => c.tipo,
    width: '7rem',
  },
]

export function CompetenciasAdmin() {
  const repo = useCatalogRepository()
  const load = useCallback(() => repo.listCompetencias(), [repo])

  return (
    <CrudPage<Competencia>
      title="Competências"
      description="Catálogo de competências hard e soft."
      addLabel="Nova competência"
      columns={columns}
      load={load}
      blank={() => ({ id: newId(), nome: '', tipo: 'hard', descricao: null })}
      labelOf={(c) => c.nome}
      validate={(c) => (c.nome.trim() ? null : 'Informe o nome da competência.')}
      save={(c) => repo.upsertCompetencia(c)}
      remove={(id) => repo.deleteCompetencia(id)}
      renderForm={(draft, update) => (
        <>
          <Field label="Nome">
            <TextInput
              value={draft.nome}
              onChange={(e) => update({ nome: e.target.value })}
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={draft.tipo}
              onValueChange={(v) => update({ tipo: v as Competencia['tipo'] })}
            >
              <SelectItem value="hard">Hard</SelectItem>
              <SelectItem value="soft">Soft</SelectItem>
            </Select>
          </Field>
          <Field label="Descrição (opcional)">
            <TextArea
              value={draft.descricao ?? ''}
              onChange={(e) => update({ descricao: e.target.value || null })}
            />
          </Field>
        </>
      )}
    />
  )
}
