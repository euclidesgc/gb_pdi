import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  Button,
  Card,
  Field,
  Select,
  SelectItem,
  TextArea,
} from '@/components/ui/controls'
import { useCatalogRepository } from '@/data/repositories'
import { newId } from '@/lib/id'
import type { Area, Competencia, Habilidade, NivelCarreira } from '@/domain/catalog'

export function MatrizAdmin() {
  const repo = useCatalogRepository()
  const [areas, setAreas] = useState<Area[]>([])
  const [niveis, setNiveis] = useState<NivelCarreira[]>([])
  const [comps, setComps] = useState<Competencia[]>([])
  const [areaId, setAreaId] = useState('')
  const [nivelId, setNivelId] = useState('')

  const [habilidades, setHabilidades] = useState<Habilidade[]>([])
  const [expectativa, setExpectativa] = useState('')
  const [savedExp, setSavedExp] = useState('')
  const [loadingCell, setLoadingCell] = useState(false)

  // Load the dimensions once.
  useEffect(() => {
    void (async () => {
      const [a, n, c] = await Promise.all([
        repo.listAreas(),
        repo.listNiveis(),
        repo.listCompetencias(),
      ])
      setAreas(a)
      setNiveis(n)
      setComps(c)
      if (a[0]) setAreaId(a[0].id)
      if (n[0]) setNivelId(n[0].id)
    })()
  }, [repo])

  const loadCell = useCallback(async () => {
    if (!areaId || !nivelId) return
    setLoadingCell(true)
    try {
      const [habs, exps] = await Promise.all([
        repo.listHabilidades({ areaId, nivelId }),
        repo.listExpectativas({ areaId, nivelId }),
      ])
      setHabilidades(habs)
      const exp = exps[0]?.expectativa ?? ''
      setExpectativa(exp)
      setSavedExp(exp)
    } finally {
      setLoadingCell(false)
    }
  }, [repo, areaId, nivelId])

  useEffect(() => {
    void loadCell()
  }, [loadCell])

  // Competências: hard first, then soft, each alphabetical.
  const orderedComps = useMemo(
    () =>
      [...comps].sort((a, b) => {
        const t = (a.tipo === 'soft' ? 1 : 0) - (b.tipo === 'soft' ? 1 : 0)
        return t !== 0 ? t : a.nome.localeCompare(b.nome)
      }),
    [comps],
  )

  const byComp = useMemo(() => {
    const m = new Map<string, Habilidade[]>()
    for (const h of habilidades) {
      const arr = m.get(h.competenciaId) ?? []
      arr.push(h)
      m.set(h.competenciaId, arr)
    }
    for (const arr of m.values()) arr.sort((a, b) => a.ordem - b.ordem)
    return m
  }, [habilidades])

  const addHabilidade = async (competenciaId: string, texto: string) => {
    const t = texto.trim()
    if (!t) return
    const existing = byComp.get(competenciaId) ?? []
    const ordem = existing.length ? Math.max(...existing.map((h) => h.ordem)) + 1 : 0
    const h: Habilidade = { id: newId(), areaId, nivelId, competenciaId, texto: t, ordem }
    await repo.upsertHabilidade(h)
    setHabilidades((cur) => [...cur, h])
  }
  const saveHabilidade = async (h: Habilidade) => {
    await repo.upsertHabilidade(h)
    setHabilidades((cur) => cur.map((x) => (x.id === h.id ? h : x)))
  }
  const removeHabilidade = async (id: string) => {
    await repo.deleteHabilidade(id)
    setHabilidades((cur) => cur.filter((x) => x.id !== id))
  }
  const saveExpectativa = async () => {
    await repo.upsertExpectativa({ areaId, nivelId, expectativa: expectativa || null })
    setSavedExp(expectativa)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        Matriz de competências
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Para cada carreira e nível, cadastre as <strong>habilidades esperadas</strong> em
        cada competência.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Carreira">
          <Select value={areaId} onValueChange={setAreaId}>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.nome}
              </SelectItem>
            ))}
          </Select>
        </Field>
        <Field label="Nível">
          <Select value={nivelId} onValueChange={setNivelId}>
            {niveis.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.nome}
              </SelectItem>
            ))}
          </Select>
        </Field>
      </div>

      {loadingCell ? (
        <p className="mt-8 text-center text-sm text-slate-400">Carregando nível…</p>
      ) : (
        <>
          <Card className="mt-6">
            <Field label="Expectativa geral do nível (opcional)">
              <TextArea
                value={expectativa}
                onChange={(e) => setExpectativa(e.target.value)}
                className="min-h-20"
              />
            </Field>
            <div className="mt-3 flex justify-end">
              <Button
                variant="primary"
                onClick={saveExpectativa}
                disabled={expectativa === savedExp}
              >
                Salvar expectativa
              </Button>
            </div>
          </Card>

          <p className="mt-6 text-xs font-semibold tracking-wide text-slate-400 uppercase">
            {habilidades.length} habilidades neste nível
          </p>

          <div className="mt-2 space-y-4">
            {orderedComps.map((c) => (
              <CompetenciaCard
                key={c.id}
                comp={c}
                habilidades={byComp.get(c.id) ?? []}
                onAdd={(txt) => addHabilidade(c.id, txt)}
                onSave={saveHabilidade}
                onRemove={removeHabilidade}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TipoTag({ tipo }: { tipo: 'hard' | 'soft' }) {
  if (tipo === 'soft') {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        Soft
      </span>
    )
  }
  return (
    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
      Hard
    </span>
  )
}

function CompetenciaCard({
  comp,
  habilidades,
  onAdd,
  onSave,
  onRemove,
}: {
  comp: Competencia
  habilidades: Habilidade[]
  onAdd: (texto: string) => void
  onSave: (h: Habilidade) => void
  onRemove: (id: string) => void
}) {
  const [novo, setNovo] = useState('')
  const add = () => {
    onAdd(novo)
    setNovo('')
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {comp.nome}
        </h3>
        <TipoTag tipo={comp.tipo} />
        <span className="text-xs text-slate-400">({habilidades.length})</span>
      </div>

      {habilidades.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma habilidade cadastrada neste nível.</p>
      ) : (
        <ul className="space-y-2">
          {habilidades.map((h) => (
            <HabilidadeRow key={h.id} hab={h} onSave={onSave} onRemove={onRemove} />
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-start gap-2">
        <TextArea
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder="Nova habilidade esperada neste nível…"
          className="min-h-10 flex-1 text-sm"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add()
          }}
        />
        <Button variant="primary" onClick={add} disabled={!novo.trim()}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>
    </Card>
  )
}

function HabilidadeRow({
  hab,
  onSave,
  onRemove,
}: {
  hab: Habilidade
  onSave: (h: Habilidade) => void
  onRemove: (id: string) => void
}) {
  const [txt, setTxt] = useState(hab.texto)
  useEffect(() => setTxt(hab.texto), [hab.texto])

  return (
    <li className="flex items-start gap-2">
      <TextArea
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={() => {
          const t = txt.trim()
          if (t && t !== hab.texto) onSave({ ...hab, texto: t })
          else if (!t) setTxt(hab.texto)
        }}
        className="min-h-10 flex-1 text-sm"
      />
      <button
        type="button"
        onClick={() => onRemove(hab.id)}
        aria-label="Remover habilidade"
        className="mt-2 shrink-0 text-slate-400 hover:text-rose-500"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  )
}
