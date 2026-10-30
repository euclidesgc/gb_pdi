import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sprout } from 'lucide-react'
import { Card } from '@/components/ui/controls'
import { cn } from '@/lib/cn'
import { useCatalogRepository, usePdiRepository } from '@/data/repositories'
import { ESCALA_AUTOAVALIACAO } from '@/domain/catalog'
import type { Competencia, Habilidade } from '@/domain/catalog'
import type { Perfil } from '@/domain/pdi'

const NOTA_LABEL = new Map<number, string>(
  ESCALA_AUTOAVALIACAO.map((o) => [o.valor, o.label]),
)

/** Development plan: the habilidades the user self-assessed as a gap (nota 1–2). */
export function Desenvolvimento() {
  const catalog = useCatalogRepository()
  const pdi = usePdiRepository()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [comps, setComps] = useState<Competencia[]>([])
  const [gaps, setGaps] = useState<Array<Habilidade & { nota: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      const p = await pdi.getPerfil()
      setPerfil(p)
      const [cs, avs] = await Promise.all([catalog.listCompetencias(), pdi.listAvaliacoes()])
      setComps(cs)
      const notas = new Map(avs.map((a) => [a.habilidadeId, a.nota]))
      if (p.areaId && p.nivelId) {
        const habs = await catalog.listHabilidades({ areaId: p.areaId, nivelId: p.nivelId })
        setGaps(
          habs
            .filter((h) => {
              const n = notas.get(h.id)
              return n === 1 || n === 2
            })
            .map((h) => ({ ...h, nota: notas.get(h.id) as number })),
        )
      } else {
        setGaps([])
      }
      setLoading(false)
    })()
  }, [catalog, pdi])

  const compMap = useMemo(() => new Map(comps.map((c) => [c.id, c])), [comps])
  const groups = useMemo(() => {
    const byComp = new Map<string, Array<Habilidade & { nota: number }>>()
    for (const g of gaps) {
      const arr = byComp.get(g.competenciaId) ?? []
      arr.push(g)
      byComp.set(g.competenciaId, arr)
    }
    return [...byComp.entries()]
      .map(([compId, items]) => ({
        comp: compMap.get(compId),
        items: items.sort((a, b) => a.nota - b.nota || a.ordem - b.ordem),
      }))
      .sort((a, b) => (a.comp?.nome ?? '').localeCompare(b.comp?.nome ?? ''))
  }, [gaps, compMap])

  if (loading) {
    return <p className="text-center text-sm text-slate-400">Carregando plano…</p>
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2">
        <Sprout className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Plano de desenvolvimento
        </h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        As habilidades que você marcou como <strong>Precisa agir</strong> ou{' '}
        <strong>Pode mais</strong> na{' '}
        <Link to="/app/autoavaliacao" className="text-indigo-600 underline dark:text-indigo-400">
          auto-avaliação
        </Link>
        . Registre o progresso no diário.
      </p>

      {!perfil?.areaId || !perfil?.nivelId ? (
        <Card className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Defina carreira e nível no{' '}
          <Link to="/app/perfil" className="text-indigo-600 underline dark:text-indigo-400">
            perfil
          </Link>{' '}
          e faça sua auto-avaliação.
        </Card>
      ) : gaps.length === 0 ? (
        <Card className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Nenhum gap no momento. 🎉 Faça (ou revise) sua{' '}
            <Link
              to="/app/autoavaliacao"
              className="text-indigo-600 underline dark:text-indigo-400"
            >
              auto-avaliação
            </Link>{' '}
            para montar o plano.
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {groups.map(({ comp, items }) => (
            <Card key={comp?.id ?? 'sem'}>
              <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {comp?.nome ?? 'Competência'}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  ({items.length})
                </span>
              </h3>
              <ul className="space-y-2">
                {items.map((g) => (
                  <li key={g.id} className="flex items-start gap-3">
                    <span
                      className={cn(
                        'mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                        g.nota === 1
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
                      )}
                    >
                      {NOTA_LABEL.get(g.nota)}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-200">{g.texto}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
