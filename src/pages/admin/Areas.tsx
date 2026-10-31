import { useCallback } from 'react'
import { CrudPage } from '@/components/admin/CrudPage'
import type { DataTableColumn } from '@/components/ui/DataTable'
import { idColumn } from '@/components/ui/idColumn'
import { CatalogOverview } from '@/components/admin/CatalogOverview'
import { Field, TextInput } from '@/components/ui/controls'
import { useCatalogRepository } from '@/data/repositories'
import { newId } from '@/lib/id'
import type { Area } from '@/domain/catalog'

const columns: DataTableColumn<Area>[] = [
  idColumn(),
  {
    id: 'nome',
    header: 'Nome',
    cell: (a) => <span className="font-medium">{a.nome}</span>,
    sortValue: (a) => a.nome,
    defaultSort: 'asc',
  },
  { id: 'familia', header: 'Área', cell: (a) => a.familia ?? '—', sortValue: (a) => a.familia },
]

// The order of carreiras in the app still comes from `ordem`: new ones go to the end.
const nextOrdem = (areas: Area[]) => Math.max(0, ...areas.map((a) => a.ordem)) + 1

export function AreasAdmin() {
  const repo = useCatalogRepository()
  const load = useCallback(() => repo.listAreas(), [repo])

  return (
    <div className="mx-auto max-w-5xl">
      <CatalogOverview />
      <CrudPage<Area>
      title="Carreiras"
      description="As carreiras do catálogo, agrupadas por área."
      addLabel="Nova carreira"
      columns={columns}
      load={load}
      blank={(areas) => ({
        id: newId(),
        nome: '',
        familia: null,
        descricao: null,
        ordem: nextOrdem(areas),
      })}
      labelOf={(a) => a.nome}
      validate={(a) => (a.nome.trim() ? null : 'Informe o nome da carreira.')}
      save={(a) => repo.upsertArea(a)}
      remove={(id) => repo.deleteArea(id)}
      renderForm={(draft, update) => (
        <>
          <Field label="Nome">
            <TextInput
              value={draft.nome}
              onChange={(e) => update({ nome: e.target.value })}
              placeholder="Ex.: Engenharia de Software"
            />
          </Field>
          <Field label="Área (opcional)">
            <TextInput
              value={draft.familia ?? ''}
              onChange={(e) => update({ familia: e.target.value || null })}
              placeholder="Ex.: Tecnologia"
            />
          </Field>
        </>
      )}
      />
    </div>
  )
}
