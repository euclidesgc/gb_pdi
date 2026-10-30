import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Eye, NotebookPen, Pencil, Send, Trash2 } from 'lucide-react'
import { Button, Card, TextArea } from '@/components/ui/controls'
import { cn } from '@/lib/cn'
import { renderMarkdown } from '@/lib/markdown'
import { useCatalogRepository, usePdiRepository } from '@/data/repositories'
import { newId } from '@/lib/id'
import { formatDateBr, todayIso } from '@/lib/pdiStats'
import type { Competencia, Habilidade } from '@/domain/catalog'
import type { DiarioEntry } from '@/domain/pdi'

/** Days without a linked entry before a plan item is flagged as neglected. */
const NEGLIGENCIA_DIAS = 14

function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`).getTime()
  const hoje = new Date(`${todayIso()}T00:00:00`).getTime()
  if (Number.isNaN(d)) return null
  return Math.round((hoje - d) / 86_400_000)
}

export function Diario() {
  const catalog = useCatalogRepository()
  const pdi = usePdiRepository()
  const [habMap, setHabMap] = useState<Map<string, Habilidade>>(new Map())
  const [compMap, setCompMap] = useState<Map<string, Competencia>>(new Map())
  const [gaps, setGaps] = useState<Array<Habilidade & { nota: number }>>([])
  const [entradas, setEntradas] = useState<DiarioEntry[]>([])
  const [texto, setTexto] = useState('')
  const [selec, setSelec] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const p = await pdi.getPerfil()
    const [cs, avs, ds] = await Promise.all([
      catalog.listCompetencias(),
      pdi.listAvaliacoes(),
      pdi.listDiario(),
    ])
    setCompMap(new Map(cs.map((c) => [c.id, c])))
    setEntradas(ds)
    const notas = new Map(avs.map((a) => [a.habilidadeId, a.nota]))
    if (p.areaId && p.nivelId) {
      const habs = await catalog.listHabilidades({ areaId: p.areaId, nivelId: p.nivelId })
      setHabMap(new Map(habs.map((h) => [h.id, h])))
      setGaps(
        habs
          .filter((h) => {
            const n = notas.get(h.id)
            return n === 1 || n === 2
          })
          .map((h) => ({ ...h, nota: notas.get(h.id) as number })),
      )
    } else {
      setHabMap(new Map())
      setGaps([])
    }
    setLoading(false)
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, pdi])

  // Most recent linked-entry date per habilidade (entradas come sorted desc).
  const lastByHab = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of entradas) {
      for (const hid of e.habilidadeIds) {
        if (!m.has(hid)) m.set(hid, e.data)
      }
    }
    return m
  }, [entradas])

  const toggle = (id: string) =>
    setSelec((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const registrar = async () => {
    const t = texto.trim()
    if (!t) return
    await pdi.addDiario({
      id: newId(),
      data: todayIso(),
      texto: t,
      objetivoId: null,
      habilidadeIds: [...selec],
    })
    setTexto('')
    setSelec(new Set())
    setPreview(false)
    await load()
  }
  const remover = async (id: string) => {
    await pdi.deleteDiario(id)
    await load()
  }

  if (loading) {
    return <p className="text-center text-sm text-slate-400">Carregando diário…</p>
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-2">
        <NotebookPen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Diário</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Registre o progresso e vincule cada ação aos itens do seu plano de desenvolvimento.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Plano items to link */}
        <Card className="lg:col-span-1">
          <h3 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Itens do plano
          </h3>
          <p className="mb-3 text-xs text-slate-400">Marque a quais esta entrada se refere.</p>

          {gaps.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nenhum item.{' '}
              <Link
                to="/app/autoavaliacao"
                className="text-indigo-600 underline dark:text-indigo-400"
              >
                Faça sua auto-avaliação
              </Link>{' '}
              para montar o plano. Você ainda pode registrar uma entrada sem vínculo.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {gaps.map((g) => {
                const dias = diasDesde(lastByHab.get(g.id))
                const negligenciado = dias === null || dias >= NEGLIGENCIA_DIAS
                const on = selec.has(g.id)
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => toggle(g.id)}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-lg border p-2 text-left transition-colors',
                        on
                          ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-500/15'
                          : negligenciado
                            ? 'border-amber-200 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-amber-500/10'
                            : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-white',
                          on
                            ? 'border-indigo-500 bg-indigo-500'
                            : 'border-slate-300 dark:border-slate-600',
                        )}
                      >
                        {on && <span className="text-[10px] leading-none">✓</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-slate-700 dark:text-slate-200">
                          {g.texto}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">
                            {compMap.get(g.competenciaId)?.nome}
                          </span>
                          {negligenciado && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                              <AlertCircle className="h-2.5 w-2.5" />
                              {dias === null ? 'sem registro' : `há ${dias} d`}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Nova entrada
            </h3>
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              disabled={!texto.trim()}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 disabled:opacity-40 dark:text-slate-400"
            >
              {preview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {preview ? 'Editar' : 'Pré-visualizar'}
            </button>
          </div>

          {preview ? (
            <div
              className="markdown min-h-40 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(texto) }}
            />
          ) : (
            <TextArea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O que você avançou hoje? (Markdown suportado: **negrito**, listas, # títulos…)"
              className="min-h-40"
            />
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {selec.size > 0 ? `${selec.size} item(ns) vinculado(s)` : 'Sem vínculo'}
            </span>
            <Button variant="primary" onClick={registrar} disabled={!texto.trim()}>
              <Send className="h-4 w-4" />
              Registrar
            </Button>
          </div>
        </Card>
      </div>

      {/* History */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Histórico
        </h2>
        {entradas.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Nenhuma entrada ainda. Sua primeira reflexão aparece aqui.
          </p>
        ) : (
          <div className="space-y-3">
            {entradas.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-400">
                    {formatDateBr(e.data)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remover(e.id)}
                    className="shrink-0 text-slate-400 hover:text-rose-500"
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div
                  className="markdown mt-1.5 text-sm text-slate-700 dark:text-slate-200"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(e.texto) }}
                />
                {e.habilidadeIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.habilidadeIds.map((hid) => {
                      const h = habMap.get(hid)
                      return (
                        <span
                          key={hid}
                          title={h ? `${compMap.get(h.competenciaId)?.nome ?? ''}` : undefined}
                          className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                        >
                          {h ? truncate(h.texto, 48) : 'item'}
                        </span>
                      )
                    })}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
