import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, GitCompareArrows, Minus, Quote } from 'lucide-react'
import { Card, Field, Select, SelectItem } from '@/components/ui/controls'
import { cn } from '@/lib/cn'
import { useCatalogRepository, usePdiRepository } from '@/data/repositories'
import type { Area, Competencia, Habilidade, NivelCarreira } from '@/domain/catalog'

interface LinhaComparacao {
  competenciaId: string
  nome: string
  tipo: 'hard' | 'soft'
  esperadas: number
  avaliadas: number
  atende: number
}

export function Comparador() {
  const pdi = usePdiRepository()
  const catalog = useCatalogRepository()
  const [areas, setAreas] = useState<Area[]>([])
  const [niveis, setNiveis] = useState<NivelCarreira[]>([])
  const [compMap, setCompMap] = useState<Map<string, Competencia>>(new Map())
  const [notas, setNotas] = useState<Map<string, number>>(new Map())
  const [areaId, setAreaId] = useState('')
  const [nivelId, setNivelId] = useState('')
  const [habs, setHabs] = useState<Habilidade[]>([])
  const [expectativa, setExpectativa] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [carregandoCelula, setCarregandoCelula] = useState(false)

  useEffect(() => {
    void (async () => {
      const [a, n, comps, p, avs] = await Promise.all([
        catalog.listAreas(),
        catalog.listNiveis(),
        catalog.listCompetencias(),
        pdi.getPerfil(),
        pdi.listAvaliacoes(),
      ])
      setAreas(a)
      setNiveis(n)
      setCompMap(new Map(comps.map((c) => [c.id, c])))
      setNotas(new Map(avs.map((av) => [av.habilidadeId, av.nota])))
      setAreaId(p.areaId ?? a[0]?.id ?? '')
      setNivelId(p.nivelId ?? n[0]?.id ?? '')
      setLoading(false)
    })()
  }, [pdi, catalog])

  useEffect(() => {
    if (!areaId || !nivelId) {
      setHabs([])
      setExpectativa(null)
      return
    }
    setCarregandoCelula(true)
    void (async () => {
      const [hs, exps] = await Promise.all([
        catalog.listHabilidades({ areaId, nivelId }),
        catalog.listExpectativas({ areaId, nivelId }),
      ])
      setHabs(hs)
      setExpectativa(exps[0]?.expectativa ?? null)
      setCarregandoCelula(false)
    })()
  }, [areaId, nivelId, catalog])

  const linhas = useMemo<LinhaComparacao[]>(() => {
    const byComp = new Map<string, Habilidade[]>()
    for (const h of habs) {
      const arr = byComp.get(h.competenciaId) ?? []
      arr.push(h)
      byComp.set(h.competenciaId, arr)
    }
    return [...byComp.entries()]
      .map(([compId, items]) => {
        let avaliadas = 0
        let atende = 0
        for (const h of items) {
          const n = notas.get(h.id)
          if (n) {
            avaliadas += 1
            if (n >= 3) atende += 1
          }
        }
        const comp = compMap.get(compId)
        return {
          competenciaId: compId,
          nome: comp?.nome ?? compId,
          tipo: (comp?.tipo ?? 'hard') as 'hard' | 'soft',
          esperadas: items.length,
          avaliadas,
          atende,
        }
      })
      .sort(
        (a, b) =>
          a.atende / a.esperadas - b.atende / b.esperadas || a.nome.localeCompare(b.nome),
      )
  }, [habs, compMap, notas])

  const totalEsp = linhas.reduce((s, l) => s + l.esperadas, 0)
  const totalAtende = linhas.reduce((s, l) => s + l.atende, 0)

  if (loading) {
    return <p className="text-center text-sm text-slate-400">Carregando comparador…</p>
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-2">
        <GitCompareArrows className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Comparador</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Veja as habilidades esperadas para um nível e quantas você já atende (da sua
        auto-avaliação).
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Carreira">
          <Select value={areaId} onValueChange={setAreaId}>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.nome}
              </SelectItem>
            ))}
          </Select>
        </Field>
        <Field label="Nível-alvo">
          <Select value={nivelId} onValueChange={setNivelId}>
            {niveis.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.nome}
              </SelectItem>
            ))}
          </Select>
        </Field>
      </div>

      {expectativa && (
        <Card className="mt-4 border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/20">
          <div className="flex gap-2 text-indigo-700 dark:text-indigo-300">
            <Quote className="h-4 w-4 shrink-0" />
            <p className="text-sm">{expectativa}</p>
          </div>
        </Card>
      )}

      {carregandoCelula ? (
        <p className="mt-6 text-center text-sm text-slate-400">Carregando habilidades…</p>
      ) : linhas.length === 0 ? (
        <Card className="mt-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Não há habilidades cadastradas para essa combinação na matriz. Edite na{' '}
            <Link to="/admin/matriz" className="text-indigo-600 dark:text-indigo-400">
              administração
            </Link>
            .
          </p>
        </Card>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Você atende <b>{totalAtende}</b> de <b>{totalEsp}</b> habilidades esperadas
            </span>
            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              {totalEsp === 0 ? 0 : Math.round((totalAtende / totalEsp) * 100)}%
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {linhas.map((l) => {
              const completo = l.atende === l.esperadas
              return (
                <div
                  key={l.competenciaId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                        completo
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800',
                      )}
                    >
                      {completo ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    </span>
                    <span className="truncate text-sm text-slate-700 dark:text-slate-200">
                      {l.nome}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                      completo
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : 'bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300',
                    )}
                  >
                    atende {l.atende}/{l.esperadas}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
