import { useCallback, useEffect, useState } from 'react'
import { CrudPage, type Column } from '@/components/admin/CrudPage'
import { CompetenciaPicker } from '@/components/admin/CompetenciaPicker'
import type { Option } from '@/components/ui/Combobox'
import { Field, Select, SelectItem, TextArea, TextInput } from '@/components/ui/controls'
import { useCatalogRepository } from '@/data/repositories'
import { newId } from '@/lib/id'
import type { TrilhaTemplate, TrilhaTipo } from '@/domain/catalog'

const TIPOS: { value: TrilhaTipo; label: string }[] = [
  { value: 'certificacao', label: 'Certificação' },
  { value: 'pratica', label: 'Prática' },
  { value: 'portfolio', label: 'Portfólio' },
  { value: 'leitura', label: 'Leitura' },
  { value: 'curso', label: 'Curso' },
  { value: 'mentoria', label: 'Mentoria' },
  { value: 'projeto', label: 'Projeto' },
]
const tipoLabel = (t: TrilhaTipo) => TIPOS.find((x) => x.value === t)?.label ?? t

const columns: Column<TrilhaTemplate>[] = [
  {
    header: 'Tipo',
    cell: (t) => (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        {tipoLabel(t.tipo)}
      </span>
    ),
    className: 'w-28',
  },
  { header: 'Título', cell: (t) => <span className="font-medium">{t.titulo}</span> },
  { header: 'Duração', cell: (t) => t.duracao ?? '—', className: 'w-28' },
]

const csvToList = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

export function TrilhaTemplatesAdmin() {
  const repo = useCatalogRepository()
  const [compOptions, setCompOptions] = useState<Option[]>([])

  useEffect(() => {
    void repo.listCompetencias().then((cs) =>
      setCompOptions(cs.map((c) => ({ id: c.id, label: c.nome }))),
    )
  }, [repo])

  const load = useCallback(() => repo.listTrilhaTemplates(), [repo])

  return (
    <CrudPage<TrilhaTemplate>
      title="Templates de trilha"
      description="Atividades-modelo usadas para gerar a trilha de desenvolvimento."
      addLabel="Novo template"
      columns={columns}
      load={load}
      blank={() => ({
        id: newId(),
        competenciaId: null,
        areaId: null,
        tipo: 'curso',
        titulo: '',
        descricao: null,
        duracao: null,
        recursoUrl: null,
        keywords: [],
        areaDisplay: null,
      })}
      labelOf={(t) => t.titulo}
      validate={(t) => (t.titulo.trim() ? null : 'Informe o título.')}
      save={(t) => repo.upsertTrilhaTemplate(t)}
      remove={(id) => repo.deleteTrilhaTemplate(id)}
      renderForm={(draft, update) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select
                value={draft.tipo}
                onValueChange={(v) => update({ tipo: v as TrilhaTipo })}
              >
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </Select>
            </Field>
            <Field label="Duração">
              <TextInput
                value={draft.duracao ?? ''}
                onChange={(e) => update({ duracao: e.target.value || null })}
                placeholder="Ex.: 20h"
              />
            </Field>
          </div>
          <Field label="Título">
            <TextInput value={draft.titulo} onChange={(e) => update({ titulo: e.target.value })} />
          </Field>
          <Field label="Descrição">
            <TextArea
              value={draft.descricao ?? ''}
              onChange={(e) => update({ descricao: e.target.value || null })}
            />
          </Field>
          <Field label="URL do recurso">
            <TextInput
              value={draft.recursoUrl ?? ''}
              onChange={(e) => update({ recursoUrl: e.target.value || null })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Palavras-chave (separadas por vírgula)">
            <TextInput
              value={draft.keywords.join(', ')}
              onChange={(e) => update({ keywords: csvToList(e.target.value) })}
            />
          </Field>
          <Field label="Competência vinculada (opcional)">
            <CompetenciaPicker
              options={compOptions}
              value={draft.competenciaId}
              onChange={(id) => update({ competenciaId: id })}
            />
          </Field>
        </>
      )}
    />
  )
}
