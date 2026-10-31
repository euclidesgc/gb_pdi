import { useCallback } from 'react'
import { CrudPage } from '@/components/admin/CrudPage'
import type { DataTableColumn } from '@/components/ui/DataTable'
import { idColumn } from '@/components/ui/idColumn'
import { Field, TextArea, TextInput } from '@/components/ui/controls'
import { useCatalogRepository } from '@/data/repositories'
import { newId } from '@/lib/id'
import type { NivelCarreira } from '@/domain/catalog'

// Unsorted, the table keeps the API order: the levels' hierarchy (`ordem`).
const columns: DataTableColumn<NivelCarreira>[] = [
  idColumn(),
  {
    id: 'nome',
    header: 'Nome',
    cell: (n) => <span className="font-medium">{n.nome}</span>,
    sortValue: (n) => n.nome,
  },
  {
    id: 'descricao',
    header: 'Descrição',
    cell: (n) => n.descricao ?? '—',
    sortValue: (n) => n.descricao,
  },
]

export function NiveisAdmin() {
  const repo = useCatalogRepository()
  const load = useCallback(() => repo.listNiveis(), [repo])

  return (
    <CrudPage<NivelCarreira>
      title="Níveis de carreira"
      description="Os níveis de carreira e sua ordem."
      addLabel="Novo nível"
      columns={columns}
      load={load}
      blank={() => ({ id: newId(), nome: '', ordem: 0, descricao: null })}
      labelOf={(n) => n.nome}
      validate={(n) => (n.nome.trim() ? null : 'Informe o nome do nível.')}
      save={(n) => repo.upsertNivel(n)}
      remove={(id) => repo.deleteNivel(id)}
      renderForm={(draft, update) => (
        <>
          <Field label="Nome">
            <TextInput
              value={draft.nome}
              onChange={(e) => update({ nome: e.target.value })}
              placeholder="Ex.: Developer II"
            />
          </Field>
          <Field label="Ordem">
            <TextInput
              type="number"
              value={String(draft.ordem)}
              onChange={(e) => update({ ordem: Number(e.target.value) || 0 })}
            />
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
