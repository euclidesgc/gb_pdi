import { useCallback, useEffect, useState } from 'react'
import { CrudPage, type Column } from '@/components/admin/CrudPage'
import { MultiCombobox } from '@/components/ui/MultiCombobox'
import type { Option } from '@/components/ui/Combobox'
import { Field, TextInput } from '@/components/ui/controls'
import { useCatalogRepository } from '@/data/repositories'
import { newId } from '@/lib/id'
import type { Certificacao } from '@/domain/catalog'

const columns: Column<Certificacao>[] = [
  { header: 'Nome', cell: (c) => <span className="font-medium">{c.nome}</span> },
  { header: 'Provedor', cell: (c) => c.provedor ?? '—' },
  { header: 'Categoria', cell: (c) => c.categoria ?? '—' },
  {
    header: 'Grátis',
    cell: (c) =>
      c.gratuita ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          Sim
        </span>
      ) : (
        '—'
      ),
    className: 'w-20',
  },
]

const csvToList = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

export function CertificacoesAdmin() {
  const repo = useCatalogRepository()
  const [areaOptions, setAreaOptions] = useState<Option[]>([])

  useEffect(() => {
    void repo.listAreas().then((areas) =>
      setAreaOptions(areas.map((a) => ({ id: a.id, label: a.nome }))),
    )
  }, [repo])

  const load = useCallback(() => repo.listCertificacoes(), [repo])

  return (
    <CrudPage<Certificacao>
      title="Certificações"
      description="Certificações sugeridas por carreira."
      addLabel="Nova certificação"
      columns={columns}
      load={load}
      blank={() => ({
        id: newId(),
        nome: '',
        provedor: null,
        url: null,
        gratuita: true,
        descricao: null,
        categoria: null,
        keywords: [],
        competenciaIds: [],
        areaIds: [],
      })}
      labelOf={(c) => c.nome}
      validate={(c) => (c.nome.trim() ? null : 'Informe o nome da certificação.')}
      save={(c) => repo.upsertCertificacao(c)}
      remove={(id) => repo.deleteCertificacao(id)}
      renderForm={(draft, update) => (
        <>
          <Field label="Nome">
            <TextInput value={draft.nome} onChange={(e) => update({ nome: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Provedor">
              <TextInput
                value={draft.provedor ?? ''}
                onChange={(e) => update({ provedor: e.target.value || null })}
              />
            </Field>
            <Field label="Categoria">
              <TextInput
                value={draft.categoria ?? ''}
                onChange={(e) => update({ categoria: e.target.value || null })}
              />
            </Field>
          </div>
          <Field label="URL">
            <TextInput
              value={draft.url ?? ''}
              onChange={(e) => update({ url: e.target.value || null })}
              placeholder="https://…"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={draft.gratuita}
              onChange={(e) => update({ gratuita: e.target.checked })}
              className="h-4 w-4"
            />
            Gratuita
          </label>
          <Field label="Palavras-chave (separadas por vírgula)">
            <TextInput
              value={draft.keywords.join(', ')}
              onChange={(e) => update({ keywords: csvToList(e.target.value) })}
            />
          </Field>
          <Field label="Carreiras sugeridas">
            <MultiCombobox
              options={areaOptions}
              selected={draft.areaIds}
              onChange={(ids) => update({ areaIds: ids })}
              placeholder="Selecionar carreiras…"
              searchPlaceholder="Filtrar carreiras…"
            />
          </Field>
        </>
      )}
    />
  )
}
