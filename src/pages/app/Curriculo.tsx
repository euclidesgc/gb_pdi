import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/controls'
import { useCatalogRepository, usePdiRepository } from '@/data/repositories'
import type { Competencia, Habilidade } from '@/domain/catalog'
import type { Conquista, Objetivo, Perfil, TrilhaItem } from '@/domain/pdi'

interface CompStat {
  id: string
  nome: string
  esperadas: number
  atende: number
  excede: number
}

export function Curriculo() {
  const pdi = usePdiRepository()
  const catalog = useCatalogRepository()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [areaNome, setAreaNome] = useState<string | null>(null)
  const [nivelNome, setNivelNome] = useState<string | null>(null)
  const [habs, setHabs] = useState<Habilidade[]>([])
  const [comps, setComps] = useState<Competencia[]>([])
  const [notas, setNotas] = useState<Map<string, number>>(new Map())
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [trilha, setTrilha] = useState<TrilhaItem[]>([])
  const [conquistas, setConquistas] = useState<Conquista[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const [p, areas, niveis, cs, avs, o, t, c] = await Promise.all([
        pdi.getPerfil(),
        catalog.listAreas(),
        catalog.listNiveis(),
        catalog.listCompetencias(),
        pdi.listAvaliacoes(),
        pdi.listObjetivos(),
        pdi.listTrilhaItens(),
        pdi.listConquistas(),
      ])
      setPerfil(p)
      setAreaNome(areas.find((a) => a.id === p.areaId)?.nome ?? null)
      setNivelNome(niveis.find((n) => n.id === p.nivelId)?.nome ?? null)
      setComps(cs)
      setNotas(new Map(avs.map((a) => [a.habilidadeId, a.nota])))
      setObjetivos(o)
      setTrilha(t)
      setConquistas(c)
      if (p.areaId && p.nivelId) {
        setHabs(await catalog.listHabilidades({ areaId: p.areaId, nivelId: p.nivelId }))
      }
      setLoading(false)
    })()
  }, [pdi, catalog])

  const compMap = useMemo(() => new Map(comps.map((c) => [c.id, c])), [comps])

  const stats = useMemo<CompStat[]>(() => {
    const byComp = new Map<string, Habilidade[]>()
    for (const h of habs) {
      const arr = byComp.get(h.competenciaId) ?? []
      arr.push(h)
      byComp.set(h.competenciaId, arr)
    }
    return [...byComp.entries()]
      .map(([id, items]) => {
        let atende = 0
        let excede = 0
        for (const h of items) {
          const n = notas.get(h.id)
          if (n && n >= 3) atende += 1
          if (n === 4) excede += 1
        }
        return { id, nome: compMap.get(id)?.nome ?? id, esperadas: items.length, atende, excede }
      })
      .sort((a, b) => b.atende / b.esperadas - a.atende / a.esperadas)
  }, [habs, notas, compMap])

  const atendidas = stats.filter((s) => s.atende > 0)
  const fortes = stats.filter((s) => s.excede > 0)

  if (loading || !perfil) {
    return <p className="text-center text-sm text-slate-400">Carregando currículo…</p>
  }

  const trilhaFeita = trilha.filter((t) => t.concluido)
  const vazio =
    atendidas.length === 0 && objetivos.length === 0 && trilhaFeita.length === 0

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Currículo</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Um resumo profissional das suas competências. Exporte em PDF pela impressão.
          </p>
        </div>
        <Button variant="primary" onClick={() => window.print()}>
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      <div className="print-area rounded-2xl border border-slate-200 bg-white p-8 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <header className="border-b border-slate-200 pb-4 dark:border-slate-700">
          <h2 className="text-3xl font-black">{perfil.nome || 'Seu nome'}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {[nivelNome, areaNome].filter(Boolean).join(' · ') || 'Profissional'}
            {perfil.email ? ` · ${perfil.email}` : ''}
          </p>
          {perfil.proposito && (
            <p className="mt-3 text-sm italic text-slate-600 dark:text-slate-300">
              “{perfil.proposito}”
            </p>
          )}
        </header>

        {fortes.length > 0 && (
          <Secao titulo="Pontos fortes">
            <div className="flex flex-wrap gap-2">
              {fortes.map((s) => (
                <span
                  key={s.id}
                  className="rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                >
                  {s.nome}
                </span>
              ))}
            </div>
          </Secao>
        )}

        {atendidas.length > 0 && (
          <Secao titulo="Competências">
            <ul className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {atendidas.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-slate-700 dark:text-slate-200">{s.nome}</span>
                  <span className="shrink-0 text-xs text-slate-400">
                    atende {s.atende}/{s.esperadas}
                  </span>
                </li>
              ))}
            </ul>
          </Secao>
        )}

        {objetivos.length > 0 && (
          <Secao titulo="Objetivos de desenvolvimento">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
              {objetivos.map((o) => (
                <li key={o.id}>{o.titulo}</li>
              ))}
            </ul>
          </Secao>
        )}

        {trilhaFeita.length > 0 && (
          <Secao titulo="Desenvolvimento concluído">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
              {trilhaFeita.map((t) => (
                <li key={t.id}>{t.titulo}</li>
              ))}
            </ul>
          </Secao>
        )}

        {conquistas.length > 0 && (
          <Secao titulo="Conquistas">
            <div className="flex flex-wrap gap-2">
              {conquistas.map((c) => (
                <span
                  key={c.id}
                  className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  {c.titulo}
                </span>
              ))}
            </div>
          </Secao>
        )}

        {vazio && (
          <p className="mt-6 text-center text-sm text-slate-400">
            Faça sua auto-avaliação e defina objetivos para montar o currículo.
          </p>
        )}
      </div>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-xs font-bold tracking-wide text-indigo-600 uppercase dark:text-indigo-400">
        {titulo}
      </h3>
      {children}
    </section>
  )
}
