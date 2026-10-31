import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ExternalLink,
  GraduationCap,
  Map as MapIcon,
  RefreshCw,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { Button, Card } from '@/components/ui/controls'
import { useCatalogRepository, usePdiRepository } from '@/data/repositories'
import type { Competencia, TrilhaTemplate } from '@/domain/catalog'
import type { Perfil, TrilhaItem } from '@/domain/pdi'

/** Minimal gap shape used to match templates: a competência with a gap. */
interface GapComp {
  competenciaId: string | null
  nome: string
}
import { newId } from '@/lib/id'

const TIPO_LABEL: Record<string, string> = {
  certificacao: 'Certificação',
  pratica: 'Prática',
  portfolio: 'Portfólio',
  leitura: 'Leitura',
  curso: 'Curso',
  mentoria: 'Mentoria',
  projeto: 'Projeto',
}

const STOPWORDS = new Set([
  'para',
  'com',
  'das',
  'dos',
  'por',
  'avancado',
  'avancada',
  'gestao',
  'analise',
  'dados',
])

function tokens(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3 && !STOPWORDS.has(t))
}

/** Templates per gap, so every gap gets something before the trail is capped. */
const POR_GAP = 4
const MAX_ITENS = 24

/** Picks templates that address a user's skill gaps (by competency, keyword, area). */
function gerarItens(
  gaps: GapComp[],
  templates: TrilhaTemplate[],
  perfil: Perfil,
  anteriores: TrilhaItem[],
): TrilhaItem[] {
  const anteriorPorTemplate = new Map<string, TrilhaItem>()
  anteriores.forEach((t) => {
    if (t.templateId) anteriorPorTemplate.set(t.templateId, t)
  })

  // Candidates per gap: direct competency link first, then keyword/title overlap.
  // Courses and readings alternate with practice so a gap isn't only theory.
  const porGap = gaps.map((gap) => {
    const gapTokens = new Set(tokens(gap.nome))
    const diretos = templates.filter((t) => gap.competenciaId && t.competenciaId === gap.competenciaId)
    const porTermo = templates.filter((t) => {
      const hay = new Set([...t.keywords.flatMap(tokens), ...tokens(t.titulo)])
      return [...gapTokens].some((tk) => hay.has(tk))
    })
    const teoria = diretos.filter((t) => t.tipo === 'curso' || t.tipo === 'leitura')
    const pratica = diretos.filter((t) => t.tipo !== 'curso' && t.tipo !== 'leitura')
    const intercalados: TrilhaTemplate[] = []
    for (let i = 0; i < Math.max(teoria.length, pratica.length); i++) {
      if (teoria[i]) intercalados.push(teoria[i])
      if (pratica[i]) intercalados.push(pratica[i])
    }
    return [...intercalados, ...porTermo]
  })

  const escolhidos = new Map<string, TrilhaTemplate>()
  const add = (t: TrilhaTemplate) => {
    if (!escolhidos.has(t.id) && escolhidos.size < MAX_ITENS) escolhidos.set(t.id, t)
  }
  // Round-robin across gaps, up to POR_GAP each.
  for (let rodada = 0; rodada < POR_GAP; rodada++) {
    for (const cands of porGap) {
      const proximo = cands.find((t) => !escolhidos.has(t.id))
      if (proximo) add(proximo)
    }
  }
  // Backfill with area templates so the trail isn't empty.
  if (escolhidos.size < 6 && perfil.areaId) {
    for (const t of templates) {
      if (t.areaId === perfil.areaId) add(t)
      if (escolhidos.size >= 12) break
    }
  }

  return [...escolhidos.values()].map((t) => {
    const anterior = anteriorPorTemplate.get(t.id)
    return {
      id: newId(),
      templateId: t.id,
      competenciaId: t.competenciaId,
      tipo: t.tipo,
      titulo: t.titulo,
      descricao: t.descricao,
      duracao: t.duracao,
      recursoUrl: t.recursoUrl,
      concluido: anterior?.concluido ?? false,
      concluidoEm: anterior?.concluido ? (anterior.concluidoEm ?? null) : null,
    }
  })
}

export function Trilha() {
  const pdi = usePdiRepository()
  const catalog = useCatalogRepository()
  const [itens, setItens] = useState<TrilhaItem[]>([])
  const [gaps, setGaps] = useState<GapComp[]>([])
  const [templates, setTemplates] = useState<TrilhaTemplate[]>([])
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)

  const load = async () => {
    const [t, tpls, p, avs, comps] = await Promise.all([
      pdi.listTrilhaItens(),
      catalog.listTrilhaTemplates(),
      pdi.getPerfil(),
      pdi.listAvaliacoes(),
      catalog.listCompetencias(),
    ])
    setItens(t)
    setTemplates(tpls)
    setPerfil(p)

    // Gaps = competências que têm ao menos uma habilidade avaliada como 1–2.
    const notas = new Map(avs.map((a) => [a.habilidadeId, a.nota]))
    const compMap = new Map<string, Competencia>(comps.map((c) => [c.id, c]))
    if (p.areaId && p.nivelId) {
      const habs = await catalog.listHabilidades({ areaId: p.areaId, nivelId: p.nivelId })
      const gapIds = new Set<string>()
      for (const h of habs) {
        const n = notas.get(h.id)
        if (n === 1 || n === 2) gapIds.add(h.competenciaId)
      }
      setGaps([...gapIds].map((id) => ({ competenciaId: id, nome: compMap.get(id)?.nome ?? '' })))
    } else {
      setGaps([])
    }
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [pdi, catalog])

  const gerar = async () => {
    if (!perfil) return
    setGerando(true)
    const novos = gerarItens(gaps, templates, perfil, itens)
    await pdi.replaceTrilha(novos)
    await load()
    setGerando(false)
  }

  const toggle = async (item: TrilhaItem) => {
    const concluido = !item.concluido
    setItens((cur) => cur.map((i) => (i.id === item.id ? { ...i, concluido } : i)))
    await pdi.setTrilhaConcluido(item.id, concluido)
  }

  if (loading) {
    return <p className="text-center text-sm text-slate-400">Carregando trilha…</p>
  }

  const concluidos = itens.filter((i) => i.concluido).length
  const pct = itens.length === 0 ? 0 : Math.round((concluidos / itens.length) * 100)

  const porTipo = new Map<string, TrilhaItem[]>()
  itens.forEach((i) => {
    const arr = porTipo.get(i.tipo) ?? []
    arr.push(i)
    porTipo.set(i.tipo, arr)
  })

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MapIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Trilha</h1>
        </div>
        <Button variant="primary" onClick={gerar} disabled={gerando}>
          {gerando ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : itens.length === 0 ? (
            <Sparkles className="h-4 w-4" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {itens.length === 0 ? 'Gerar trilha' : 'Regerar'}
        </Button>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Atividades sugeridas a partir das suas competências com gap ({gaps.length}) e dos
        templates do catálogo.
      </p>

      {itens.length === 0 ? (
        <Card className="mt-6 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {gaps.length === 0 ? (
              <>
                Faça sua <b>auto-avaliação</b> para identificar gaps e gerar uma trilha.{' '}
                <Link to="/app/autoavaliacao" className="text-indigo-600 dark:text-indigo-400">
                  Ir à auto-avaliação
                </Link>
                .
              </>
            ) : (
              <>
                Você tem {gaps.length} competência(s) com gap. Clique em “Gerar trilha” para
                montar seu plano.
              </>
            )}
          </p>
        </Card>
      ) : (
        <>
          <Card className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Progresso
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {pct === 100 && <Trophy className="h-4 w-4" />}
                {concluidos}/{itens.length} · {pct}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full bg-emerald-500" style={{ width: pct + '%' }} />
            </div>
          </Card>

          <div className="mt-4 space-y-5">
            {[...porTipo.entries()].map(([tipo, lista]) => (
              <div key={tipo}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <BookOpen className="h-4 w-4" />
                  {TIPO_LABEL[tipo] ?? tipo}
                  <span className="text-xs font-normal text-slate-400">({lista.length})</span>
                </h2>
                <div className="space-y-2">
                  {lista.map((item) => (
                    <TrilhaCard key={item.id} item={item} onToggle={() => toggle(item)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TrilhaCard({ item, onToggle }: { item: TrilhaItem; onToggle: () => void }) {
  return (
    <Card className={'p-4 ' + (item.concluido ? 'opacity-70' : '')}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 shrink-0"
          aria-label={item.concluido ? 'Marcar como pendente' : 'Marcar como concluído'}
        >
          {item.concluido ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <Circle className="h-5 w-5 text-slate-300 hover:text-indigo-400 dark:text-slate-600" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                'text-sm font-medium text-slate-800 dark:text-slate-100 ' +
                (item.concluido ? 'line-through' : '')
              }
            >
              {item.titulo}
            </span>
          </div>
          {item.descricao && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.descricao}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {item.duracao && <span>{item.duracao}</span>}
            {item.recursoUrl && (
              <a
                href={item.recursoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400"
              >
                <ExternalLink className="h-3 w-3" />
                Recurso
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
