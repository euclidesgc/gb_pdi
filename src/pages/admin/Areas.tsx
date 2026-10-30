import { useCallback } from 'react'
import { CrudPage, type Column } from '@/components/admin/CrudPage'
import { CatalogOverview } from '@/components/admin/CatalogOverview'
import { Field, TextInput } from '@/components/ui/controls'
import { useCatalogRepository } from '@/data/repositories'
import { newId } from '@/lib/id'
import type { Area } from '@/domain/catalog'

const columns: Column<Area>[] = [
  { header: 'Nome', cell: (a) => <span className="font-medium">{a.nome}</span> },
  { header: 'Área', cell: (a) => a.familia ?? '—' },
  { header: 'Ordem', cell: (a) => a.ordem, className: 'w-20' },
]

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
      blank={() => ({ id: newId(), nome: '', familia: null, descricao: null, ordem: 0 })}
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
          <Field label="Ordem">
            <TextInput
              type="number"
              value={String(draft.ordem)}
              onChange={(e) => update({ ordem: Number(e.target.value) || 0 })}
            />
          </Field>
        </>
      )}
      />
    </div>
  )
}
