import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/controls'
import { cn } from '@/lib/cn'
import { useCatalogRepository, usePdiRepository } from '@/data/repositories'
import { ESCALA_AUTOAVALIACAO } from '@/domain/catalog'
import type { Competencia, Habilidade } from '@/domain/catalog'

/** Per-nota accent: 1–2 are gaps (rose/amber), 3 meets (emerald), 4 exceeds (indigo). */
const CORES: Record<number, string> = {
  1: 'bg-rose-500 text-white border-rose-500',
  2: 'bg-amber-500 text-white border-amber-500',
  3: 'bg-emerald-500 text-white border-emerald-500',
  4: 'bg-indigo-500 text-white border-indigo-500',
}

export interface AutoProgress {
  total: number
  avaliadas: number
  gaps: number
}

/**
 * Self-assessment of the habilidades expected at a carreira × nível, on the 1–4
 * scale. Shared by the Auto-avaliação screen and the onboarding wizard. Saves
 * each rating immediately and reports progress to the parent.
 */
export function HabilidadesRating({
  areaId,
  nivelId,
  onProgress,
}: {
  areaId: string
  nivelId: string
  onProgress?: (p: AutoProgress) => void
}) {
  const catalog = useCatalogRepository()
  const pdi = usePdiRepository()
  const [comps, setComps] = useState<Competencia[]>([])
  const [habs, setHabs] = useState<Habilidade[]>([])
  const [notas, setNotas] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)

  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const [cs, avs, hs] = await Promise.all([
        catalog.listCompetencias(),
        pdi.listAvaliacoes(),
        catalog.listHabilidades({ areaId, nivelId }),
      ])
      setComps(cs)
      setNotas(new Map(avs.map((a) => [a.habilidadeId, a.nota])))
      setHabs(hs)
      setLoading(false)
    })()
  }, [catalog, pdi, areaId, nivelId])

  // Report progress whenever the data or ratings change (ref avoids render loops).
  useEffect(() => {
    let avaliadas = 0
    let gaps = 0
    for (const h of habs) {
      const n = notas.get(h.id)
      if (n) {
        avaliadas += 1
        if (n <= 2) gaps += 1
      }
    }
    onProgressRef.current?.({ total: habs.length, avaliadas, gaps })
  }, [habs, notas])

  const setNota = async (habId: string, nota: number) => {
    const next = notas.get(habId) === nota ? 0 : nota
    setNotas((m) => {
      const n = new Map(m)
      if (next) n.set(habId, next)
      else n.delete(habId)
      return n
    })
    await pdi.setAvaliacao(habId, next)
  }

  const compMap = useMemo(() => new Map(comps.map((c) => [c.id, c])), [comps])
  const groups = useMemo(() => {
    const byComp = new Map<string, Habilidade[]>()
    for (const h of habs) {
      const arr = byComp.get(h.competenciaId) ?? []
      arr.push(h)
      byComp.set(h.competenciaId, arr)
    }
    return [...byComp.entries()]
      .map(([compId, items]) => ({
        comp: compMap.get(compId),
        items: [...items].sort((a, b) => a.ordem - b.ordem),
      }))
      .sort((a, b) => {
        const t = (a.comp?.tipo === 'soft' ? 1 : 0) - (b.comp?.tipo === 'soft' ? 1 : 0)
        return t !== 0 ? t : (a.comp?.nome ?? '').localeCompare(b.comp?.nome ?? '')
      })
  }, [habs, compMap])

  if (loading) {
    return <p className="text-center text-sm text-slate-400">Carregando habilidades…</p>
  }
  if (habs.length === 0) {
    return (
      <Card className="text-center text-sm text-slate-500 dark:text-slate-400">
        Nenhuma habilidade cadastrada para esta carreira e nível.
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {groups.map(({ comp, items }) => (
        <Card key={comp?.id ?? 'sem'}>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {comp?.nome ?? 'Competência'}
            </h3>
            <TipoTag tipo={comp?.tipo} />
          </div>
          <ul className="space-y-3">
            {items.map((h) => (
              <li
                key={h.id}
                className="flex flex-col gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4 dark:border-slate-800"
              >
                <span className="text-sm text-slate-700 dark:text-slate-200">{h.texto}</span>
                <div className="flex shrink-0 flex-wrap gap-1">
                  {ESCALA_AUTOAVALIACAO.map((opt) => {
                    const on = notas.get(h.id) === opt.valor
                    return (
                      <button
                        key={opt.valor}
                        type="button"
                        onClick={() => setNota(h.id, opt.valor)}
                        className={cn(
                          'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                          on
                            ? CORES[opt.valor]
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
                        )}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}

function TipoTag({ tipo }: { tipo: 'hard' | 'soft' | undefined }) {
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
