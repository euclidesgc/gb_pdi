import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Flag,
  Info,
  ListChecks,
  Lightbulb,
  Target,
} from 'lucide-react'
import { Card } from '@/components/ui/controls'
import type { Acao, DiarioEntry, Objetivo, TrilhaItem } from '@/domain/pdi'
import { cn } from '@/lib/cn'
import { formatDateBr } from '@/lib/pdiStats'
import {
  coletarPrazos,
  pontosDeAtencao,
  prazoTexto,
  proximoPasso,
  URGENCIA,
  URGENCIA_ORDEM,
  type PrazoItem,
  type Urgencia,
} from '@/lib/prazos'

/** Itens mostrados antes de "ver todos". */
const LIMITE = 8

/**
 * Seção do dashboard dedicada a prazos: o próximo passo, um resumo por
 * urgência, a linha do tempo dos prazos em aberto e os pontos de atenção.
 */
export function PrazosPainel({
  objetivos,
  acoes,
  trilha,
  diario,
}: {
  objetivos: Objetivo[]
  acoes: Acao[]
  trilha: TrilhaItem[]
  diario: DiarioEntry[]
}) {
  const [todos, setTodos] = useState(false)
  const prazos = useMemo(() => coletarPrazos(objetivos, acoes), [objetivos, acoes])
  const atencao = useMemo(() => pontosDeAtencao(objetivos, acoes), [objetivos, acoes])
  const passo = useMemo(
    () => proximoPasso({ objetivos, acoes, trilha, diario, prazos }),
    [objetivos, acoes, trilha, diario, prazos],
  )

  const contagem = (us: Urgencia[]) => prazos.filter((p) => us.includes(p.urgencia)).length
  const resumo = [
    { label: 'Atrasados', n: contagem(['atrasado']), u: 'atrasado' as const },
    { label: 'Hoje', n: contagem(['hoje']), u: 'hoje' as const },
    { label: 'Em 7 dias', n: contagem(['urgente', 'semana']), u: 'urgente' as const },
    { label: 'Em 30 dias', n: contagem(['proximo']), u: 'proximo' as const },
  ]

  const visiveis = todos ? prazos : prazos.slice(0, LIMITE)
  const grupos = URGENCIA_ORDEM.map((u) => ({
    u,
    itens: visiveis.filter((p) => p.urgencia === u),
  })).filter((g) => g.itens.length > 0)

  const destaque = passo.urgencia ? URGENCIA[passo.urgencia] : null

  return (
    <section aria-labelledby="prazos-titulo" className="mt-6 space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Próximo passo */}
        <Card
          className={cn(
            'relative overflow-hidden border-l-4 lg:col-span-2',
            destaque ? destaque.borda : 'border-l-indigo-500',
          )}
        >
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Flag className="h-4 w-4" />
            <span className="text-xs font-semibold tracking-wide uppercase">Seu próximo passo</span>
            {destaque && passo.urgencia && (
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', destaque.badge)}>
                {URGENCIA[passo.urgencia].label}
              </span>
            )}
          </div>
          <p className="mt-3 text-lg font-bold text-slate-800 dark:text-slate-100">{passo.titulo}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{passo.descricao}</p>
          <Link
            to={passo.to}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            {passo.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        {/* Resumo por urgência */}
        <Card>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <CalendarClock className="h-4 w-4" />
            <span className="text-xs font-semibold tracking-wide uppercase">Prazos em aberto</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {resumo.map((r) => (
              <div
                key={r.label}
                className={cn(
                  'rounded-xl px-3 py-2',
                  r.n > 0 ? URGENCIA[r.u].badge : 'bg-slate-50 text-slate-400 dark:bg-slate-800/60',
                )}
              >
                <dt className="text-[11px] font-medium">{r.label}</dt>
                <dd className="text-2xl font-bold">{r.n}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      {/* Linha do tempo */}
      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <CalendarClock className="h-4 w-4" />
            <h2 id="prazos-titulo" className="text-sm font-semibold">
              Prazos e prioridades
            </h2>
          </div>
          <Legenda />
        </div>
        {prazos.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhum prazo em aberto. Defina datas nas{' '}
            <Link to="/app/plano" className="text-indigo-600 dark:text-indigo-400">
              ações do plano
            </Link>{' '}
            e nos{' '}
            <Link to="/app/objetivos" className="text-indigo-600 dark:text-indigo-400">
              objetivos
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-4">
            {grupos.map((g) => (
              <div key={g.u}>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  <span className={cn('h-2 w-2 rounded-full', URGENCIA[g.u].dot)} />
                  {URGENCIA[g.u].grupo}
                </h3>
                <ul className="space-y-1.5">
                  {g.itens.map((p) => (
                    <PrazoLinha key={`${p.kind}:${p.id}`} item={p} />
                  ))}
                </ul>
              </div>
            ))}
            {prazos.length > LIMITE && (
              <button
                type="button"
                onClick={() => setTodos((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {todos ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {todos ? 'Mostrar menos' : `Ver todos os ${prazos.length} prazos`}
              </button>
            )}
          </div>
        )}
      </Card>

      {atencao.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Lightbulb className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Pontos de atenção</h2>
          </div>
          <ul className="space-y-1">
            {atencao.slice(0, 6).map((a) => (
              <li key={a.id}>
                <Link
                  to={a.to}
                  className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {a.nivel === 'alerta' ? (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  )}
                  <span>{a.texto}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  )
}

function PrazoLinha({ item }: { item: PrazoItem }) {
  const u = URGENCIA[item.urgencia]
  const Icon = item.kind === 'objetivo' ? Target : ListChecks
  return (
    <li>
      <Link
        to={item.to}
        className={cn(
          'flex items-center gap-3 rounded-lg border border-l-4 border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60',
          u.borda,
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-label={item.kind === 'objetivo' ? 'Objetivo' : 'Ação'} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-slate-700 dark:text-slate-200">
            {item.titulo}
            {item.emAndamento && (
              <span className="ml-2 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                em andamento
              </span>
            )}
          </p>
          {(item.contexto || item.depoisDoObjetivo) && (
            <p className="flex items-center gap-1 truncate text-xs text-slate-400">
              {item.depoisDoObjetivo && (
                <span title="Vence depois do prazo do objetivo" className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  após o objetivo ·
                </span>
              )}
              {item.contexto}
            </p>
          )}
        </div>
        <span
          className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', u.badge)}
          title={formatDateBr(item.data)}
        >
          {prazoTexto(item.dias, item.data)}
        </span>
      </Link>
    </li>
  )
}

function Legenda() {
  return (
    <div className="hidden items-center gap-3 text-[10px] text-slate-400 sm:flex">
      {(['atrasado', 'hoje', 'urgente', 'proximo'] as const).map((u) => (
        <span key={u} className="inline-flex items-center gap-1">
          <span className={cn('h-2 w-2 rounded-full', URGENCIA[u].dot)} />
          {URGENCIA[u].label}
        </span>
      ))}
    </div>
  )
}
