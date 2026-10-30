import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Eye,
  Goal,
  ListTodo,
  NotebookPen,
  Pencil,
  Route as RouteIcon,
  Send,
  Sprout,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Button, Card, TextArea } from '@/components/ui/controls'
import { cn } from '@/lib/cn'
import { renderMarkdown } from '@/lib/markdown'
import { useCatalogRepository, usePdiRepository } from '@/data/repositories'
import { newId } from '@/lib/id'
import { formatDateBr, todayIso } from '@/lib/pdiStats'
import type { Competencia, Habilidade } from '@/domain/catalog'
import type { Acao, AcaoStatus, DiarioEntry, Objetivo, TrilhaItem } from '@/domain/pdi'

/** Days without a linked entry before a habilidade is flagged as neglected. */
const NEGLIGENCIA_DIAS = 14

function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`).getTime()
  const hoje = new Date(`${todayIso()}T00:00:00`).getTime()
  if (Number.isNaN(d)) return null
  return Math.round((hoje - d) / 86_400_000)
}

type Kind = 'objetivo' | 'acao' | 'trilha' | 'habilidade'

/** Field of DiarioEntry that holds the links of each kind. */
const ENTRY_FIELD = {
  objetivo: 'objetivoIds',
  acao: 'acaoIds',
  trilha: 'trilhaItemIds',
  habilidade: 'habilidadeIds',
} as const satisfies Record<Kind, keyof DiarioEntry>

const TABS: { kind: Kind; label: string; icon: LucideIcon; chip: string }[] = [
  {
    kind: 'objetivo',
    label: 'Objetivos',
    icon: Goal,
    chip: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
  {
    kind: 'acao',
    label: 'Plano',
    icon: ListTodo,
    chip: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  {
    kind: 'trilha',
    label: 'Trilha',
    icon: RouteIcon,
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  {
    kind: 'habilidade',
    label: 'Habilidades',
    icon: Sprout,
    chip: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  },
]
const TAB_BY_KIND = new Map(TABS.map((t) => [t.kind, t]))

const STATUS_LABEL: Record<AcaoStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluída',
}
const STATUS_ORDER: Record<AcaoStatus, number> = { em_andamento: 0, pendente: 1, concluido: 2 }

/** One selectable row in a tab: what the list shows and what the chip shows. */
interface LinkOption {
  id: string
  titulo: string
  meta: ReactNode
  /** Dimmed (e.g. finished) but still selectable. */
  done?: boolean
  alerta?: string
}

type Selecao = Record<Kind, Set<string>>
const emptySelecao = (): Selecao => ({
  objetivo: new Set(),
  acao: new Set(),
  trilha: new Set(),
  habilidade: new Set(),
})

export function Diario() {
  const catalog = useCatalogRepository()
  const pdi = usePdiRepository()
  const [habMap, setHabMap] = useState<Map<string, Habilidade>>(new Map())
  const [compMap, setCompMap] = useState<Map<string, Competencia>>(new Map())
  const [gaps, setGaps] = useState<Habilidade[]>([])
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [acoes, setAcoes] = useState<Acao[]>([])
  const [trilha, setTrilha] = useState<TrilhaItem[]>([])
  const [entradas, setEntradas] = useState<DiarioEntry[]>([])
  const [texto, setTexto] = useState('')
  const [selec, setSelec] = useState<Selecao>(emptySelecao)
  const [tab, setTab] = useState<Kind>('objetivo')
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const p = await pdi.getPerfil()
    const [cs, avs, ds, objs, acs, tri] = await Promise.all([
      catalog.listCompetencias(),
      pdi.listAvaliacoes(),
      pdi.listDiario(),
      pdi.listObjetivos(),
      pdi.listAcoes(),
      pdi.listTrilhaItens(),
    ])
    setCompMap(new Map(cs.map((c) => [c.id, c])))
    setEntradas(ds)
    setObjetivos(objs)
    setAcoes(acs)
    setTrilha(tri)
    const notas = new Map(avs.map((a) => [a.habilidadeId, a.nota]))
    if (p.areaId && p.nivelId) {
      const habs = await catalog.listHabilidades({ areaId: p.areaId, nivelId: p.nivelId })
      setHabMap(new Map(habs.map((h) => [h.id, h])))
      setGaps(
        habs.filter((h) => {
          const n = notas.get(h.id)
          return n === 1 || n === 2
        }),
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

  const options = useMemo((): Record<Kind, LinkOption[]> => {
    const objById = new Map(objetivos.map((o) => [o.id, o]))
    return {
      objetivo: objetivos.map((o) => ({
        id: o.id,
        titulo: o.titulo,
        meta: [
          o.categoria === 'educacional' ? 'Educacional' : 'Funcional',
          o.prazo && `prazo ${formatDateBr(o.prazo)}`,
        ]
          .filter(Boolean)
          .join(' · '),
      })),
      acao: [...acoes]
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.ordem - b.ordem)
        .map((a) => ({
          id: a.id,
          titulo: a.titulo,
          meta: [STATUS_LABEL[a.status], a.objetivoId && objById.get(a.objetivoId)?.titulo]
            .filter(Boolean)
            .join(' · '),
          done: a.status === 'concluido',
        })),
      trilha: [...trilha]
        .sort((a, b) => Number(a.concluido) - Number(b.concluido))
        .map((t) => ({
          id: t.id,
          titulo: t.titulo,
          meta: [t.concluido ? 'Concluído' : null, t.duracao].filter(Boolean).join(' · ') || t.tipo,
          done: t.concluido,
        })),
      habilidade: gaps.map((g) => {
        const dias = diasDesde(lastByHab.get(g.id))
        const negligenciado = dias === null || dias >= NEGLIGENCIA_DIAS
        return {
          id: g.id,
          titulo: g.texto,
          meta: compMap.get(g.competenciaId)?.nome ?? '',
          alerta: negligenciado ? (dias === null ? 'sem registro' : `há ${dias} d`) : undefined,
        }
      }),
    }
  }, [objetivos, acoes, trilha, gaps, lastByHab, compMap])

  /** Title of any linked record, including ones no longer listed (e.g. old habilidades). */
  const titulos = useMemo(() => {
    const m: Record<Kind, Map<string, string>> = {
      objetivo: new Map(objetivos.map((o) => [o.id, o.titulo])),
      acao: new Map(acoes.map((a) => [a.id, a.titulo])),
      trilha: new Map(trilha.map((t) => [t.id, t.titulo])),
      habilidade: new Map([...habMap.values()].map((h) => [h.id, h.texto])),
    }
    return m
  }, [objetivos, acoes, trilha, habMap])

  const totalSelec = TABS.reduce((n, t) => n + selec[t.kind].size, 0)

  const toggle = (kind: Kind, id: string) =>
    setSelec((s) => {
      const n = new Set(s[kind])
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return { ...s, [kind]: n }
    })

  const registrar = async () => {
    const t = texto.trim()
    if (!t) return
    await pdi.addDiario({
      id: newId(),
      data: todayIso(),
      texto: t,
      objetivoIds: [...selec.objetivo],
      acaoIds: [...selec.acao],
      trilhaItemIds: [...selec.trilha],
      habilidadeIds: [...selec.habilidade],
    })
    setTexto('')
    setSelec(emptySelecao())
    setPreview(false)
    await load()
  }
  const remover = async (id: string) => {
    await pdi.deleteDiario(id)
    await load()
  }

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = TABS.findIndex((t) => t.kind === tab)
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
    setTab(next.kind)
    document.getElementById(`diario-tab-${next.kind}`)?.focus()
  }

  if (loading) {
    return <p className="text-center text-sm text-slate-400">Carregando diário…</p>
  }

  const ativa = TAB_BY_KIND.get(tab)!

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-2">
        <NotebookPen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Diário</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Registre o progresso e vincule cada entrada aos seus objetivos, ações do plano, trilha e
        habilidades.
      </p>

      {/* Editor */}
      <Card className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nova entrada</h3>
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
            className="markdown min-h-32 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(texto) }}
          />
        ) : (
          <TextArea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="O que você avançou hoje? (Markdown suportado: **negrito**, listas, # títulos…)"
            className="min-h-32"
          />
        )}

        {totalSelec > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {TABS.flatMap((t) =>
              [...selec[t.kind]].map((id) => (
                <span
                  key={`${t.kind}:${id}`}
                  className={cn(
                    'inline-flex max-w-full items-center gap-1 rounded-full py-0.5 pr-1 pl-2 text-[11px]',
                    t.chip,
                  )}
                >
                  <t.icon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{truncate(titulos[t.kind].get(id) ?? 'item', 48)}</span>
                  <button
                    type="button"
                    onClick={() => toggle(t.kind, id)}
                    className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                    aria-label="Remover vínculo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )),
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {totalSelec > 0
              ? `${totalSelec} vínculo${totalSelec > 1 ? 's' : ''}`
              : 'Sem vínculo: escolha abaixo a que esta entrada se refere'}
          </span>
          <Button variant="primary" onClick={registrar} disabled={!texto.trim()}>
            <Send className="h-4 w-4" />
            Registrar
          </Button>
        </div>
      </Card>

      {/* Link picker */}
      <Card className="mt-4 p-0">
        <div
          role="tablist"
          aria-label="Vincular a"
          className="flex overflow-x-auto overflow-y-hidden border-b border-slate-200 px-1 [scrollbar-width:none] sm:px-2 dark:border-slate-700"
        >
          {TABS.map((t) => {
            const on = t.kind === tab
            const n = selec[t.kind].size
            return (
              <button
                key={t.kind}
                id={`diario-tab-${t.kind}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="diario-tabpanel"
                tabIndex={on ? 0 : -1}
                onClick={() => setTab(t.kind)}
                onKeyDown={onTabKey}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-sm font-medium transition-colors sm:px-3',
                  on
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                )}
              >
                <t.icon className="hidden h-4 w-4 sm:block" />
                {t.label}
                {n > 0 && (
                  <span className="rounded-full bg-indigo-500 px-1.5 text-[10px] leading-4 font-semibold text-white">
                    {n}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div
          id="diario-tabpanel"
          role="tabpanel"
          aria-labelledby={`diario-tab-${tab}`}
          className="p-4"
        >
          <OptionList
            options={options[tab]}
            selected={selec[tab]}
            onToggle={(id) => toggle(tab, id)}
            empty={<EmptyTab kind={ativa.kind} />}
          />
        </div>
      </Card>

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
            {entradas.map((e) => {
              const vinculos = TABS.flatMap((t) =>
                e[ENTRY_FIELD[t.kind]].map((id) => ({ t, id })),
              )
              return (
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
                  {vinculos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {vinculos.map(({ t, id }) => (
                        <span
                          key={`${t.kind}:${id}`}
                          title={t.label}
                          className={cn(
                            'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px]',
                            t.chip,
                          )}
                        >
                          <t.icon className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">
                            {truncate(titulos[t.kind].get(id) ?? 'item', 48)}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function OptionList({
  options,
  selected,
  onToggle,
  empty,
}: {
  options: LinkOption[]
  selected: Set<string>
  onToggle: (id: string) => void
  empty: ReactNode
}) {
  if (options.length === 0) return <>{empty}</>
  return (
    <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {options.map((o) => {
        const on = selected.has(o.id)
        return (
          <li key={o.id}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(o.id)}
              className={cn(
                'flex h-full w-full items-start gap-2 rounded-lg border p-2 text-left transition-colors',
                on
                  ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-500/15'
                  : o.alerta
                    ? 'border-amber-200 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-900/60 dark:bg-amber-500/10'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-white',
                  on ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-600',
                )}
              >
                {on && <span className="text-[10px] leading-none">✓</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-xs text-slate-700 dark:text-slate-200',
                    o.done && !on && 'text-slate-400 line-through dark:text-slate-500',
                  )}
                >
                  {o.titulo}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {o.meta && <span className="text-[10px] text-slate-400">{o.meta}</span>}
                  {o.alerta && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                      <AlertCircle className="h-2.5 w-2.5" />
                      {o.alerta}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

const EMPTY_TAB: Record<Kind, { texto: string; link: string; acao: string }> = {
  objetivo: { texto: 'Você ainda não tem objetivos.', link: '/app/objetivos', acao: 'Criar objetivos' },
  acao: { texto: 'Seu plano ainda não tem ações.', link: '/app/plano', acao: 'Montar o plano' },
  trilha: { texto: 'Sua trilha ainda está vazia.', link: '/app/trilha', acao: 'Gerar a trilha' },
  habilidade: {
    texto: 'Nenhuma habilidade em desenvolvimento.',
    link: '/app/autoavaliacao',
    acao: 'Fazer a auto-avaliação',
  },
}

function EmptyTab({ kind }: { kind: Kind }) {
  const e = EMPTY_TAB[kind]
  return (
    <p className="text-sm text-slate-400">
      {e.texto}{' '}
      <Link to={e.link} className="text-indigo-600 underline dark:text-indigo-400">
        {e.acao}
      </Link>
      . Você ainda pode registrar uma entrada sem vínculo.
    </p>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
