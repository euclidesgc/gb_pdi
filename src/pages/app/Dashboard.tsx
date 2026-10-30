import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Award,
  CalendarClock,
  ClipboardCheck,
  ListChecks,
  Map as MapIcon,
  Target,
  TrendingUp,
} from 'lucide-react'
import { Card } from '@/components/ui/controls'
import { useCatalogRepository, usePdiRepository } from '@/data/repositories'
import type { Acao, Conquista, Objetivo, Perfil } from '@/domain/pdi'
import { evaluateConquistas } from '@/lib/conquistas'
import {
  computeSnapshot,
  daysUntil,
  formatDateBr,
  saudeLabel,
  type PdiSnapshot,
} from '@/lib/pdiStats'

export function Dashboard() {
  const pdi = usePdiRepository()
  const catalog = useCatalogRepository()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [snap, setSnap] = useState<PdiSnapshot | null>(null)
  const [acoes, setAcoes] = useState<Acao[]>([])
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [conquistas, setConquistas] = useState<Conquista[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const [p, objs, ac, trilha, hard, soft, diario, avs] = await Promise.all([
        pdi.getPerfil(),
        pdi.listObjetivos(),
        pdi.listAcoes(),
        pdi.listTrilhaItens(),
        pdi.listHardSkills(),
        pdi.listSoftSkills(),
        pdi.listDiario(),
        pdi.listAvaliacoes(),
      ])
      let autoTotal = 0
      let autoAvaliadas = 0
      let autoAtende = 0
      if (p.areaId && p.nivelId) {
        const habs = await catalog.listHabilidades({ areaId: p.areaId, nivelId: p.nivelId })
        const notas = new Map(avs.map((a) => [a.habilidadeId, a.nota]))
        autoTotal = habs.length
        for (const h of habs) {
          const n = notas.get(h.id)
          if (n) {
            autoAvaliadas += 1
            if (n >= 3) autoAtende += 1
          }
        }
      }
      const snapshot = computeSnapshot({
        objetivos: objs.length,
        acoes: ac,
        trilha,
        hard,
        soft,
        autoavaliacao: { total: autoTotal, avaliadas: autoAvaliadas, atende: autoAtende },
      })

      // Gamification: award any newly-earned achievements, then load the list.
      await evaluateConquistas(pdi, {
        wizardConcluido: p.wizardConcluido,
        objetivos: objs.length,
        skills: hard.length + soft.length,
        acoesTotal: ac.length,
        acoesConcluidas: snapshot.acoesConcluidas,
        trilhaConcluida: snapshot.trilhaConcluida,
        diario: diario.length,
      })
      const conq = await pdi.listConquistas()

      setPerfil(p)
      setObjetivos(objs)
      setAcoes(ac)
      setSnap(snapshot)
      setConquistas(conq)
      setLoading(false)
    })()
  }, [pdi])

  const prazos = useMemo(() => {
    return acoes
      .filter((a) => a.dueDate && a.status !== 'concluido')
      .map((a) => ({ acao: a, dias: daysUntil(a.dueDate as string) }))
      .sort((x, y) => x.dias - y.dias)
      .slice(0, 5)
  }, [acoes])

  if (loading || !snap || !perfil) {
    return <p className="text-center text-sm text-slate-400">Carregando dashboard…</p>
  }

  const saude = saudeLabel(snap.saude)
  const objById = new Map(objetivos.map((o) => [o.id, o]))

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
        Olá{perfil.nome ? `, ${perfil.nome}` : ''} 👋
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Este é o panorama do seu Plano de Desenvolvimento Individual.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Saúde do PDI */}
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Saúde do PDI</span>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-5xl font-black text-slate-800 dark:text-slate-100">
              {snap.saude}
            </span>
            <span className="mb-1 text-lg text-slate-400">/100</span>
          </div>
          <p className={'mt-1 text-sm font-medium ' + saude.tone}>{saude.label}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-indigo-500"
              style={{ width: snap.saude + '%' }}
            />
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard
            icon={<Target className="h-5 w-5" />}
            label="Objetivos"
            value={String(snap.objetivos)}
            to="/app/objetivos"
          />
          <StatCard
            icon={<ListChecks className="h-5 w-5" />}
            label="Ações concluídas"
            value={`${snap.acoesConcluidas}/${snap.acoesTotal}`}
            hint={snap.acoesEmAndamento > 0 ? `${snap.acoesEmAndamento} em andamento` : undefined}
            to="/app/plano"
          />
          <StatCard
            icon={<MapIcon className="h-5 w-5" />}
            label="Trilha"
            value={
              snap.trilhaTotal === 0
                ? '—'
                : `${Math.round((snap.trilhaConcluida / snap.trilhaTotal) * 100)}%`
            }
            hint={snap.trilhaTotal === 0 ? 'não gerada' : `${snap.trilhaConcluida}/${snap.trilhaTotal} itens`}
            to="/app/trilha"
          />
          <StatCard
            icon={<ClipboardCheck className="h-5 w-5" />}
            label="Auto-avaliação"
            value={snap.autoTotal === 0 ? '—' : `${snap.autoAvaliadas}/${snap.autoTotal}`}
            hint={
              snap.autoTotal === 0
                ? 'não iniciada'
                : snap.autoGaps > 0
                  ? `${snap.autoGaps} no plano`
                  : 'sem gaps'
            }
            to="/app/autoavaliacao"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Próximos prazos */}
        <Card>
          <div className="mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <CalendarClock className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Próximos prazos</h2>
          </div>
          {prazos.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Nenhuma ação com prazo. Defina prazos no{' '}
              <Link to="/app/plano" className="text-indigo-600 dark:text-indigo-400">
                plano
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {prazos.map(({ acao, dias }) => (
                <li
                  key={acao.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-700 dark:text-slate-200">
                      {acao.titulo}
                    </p>
                    {acao.objetivoId && objById.get(acao.objetivoId) && (
                      <p className="truncate text-xs text-slate-400">
                        {objById.get(acao.objetivoId)?.titulo}
                      </p>
                    )}
                  </div>
                  <PrazoBadge dias={dias} data={acao.dueDate as string} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Conquistas */}
        <Card>
          <div className="mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Award className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Conquistas</h2>
          </div>
          {conquistas.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Comece a agir no seu PDI para desbloquear conquistas.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {conquistas.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  <Award className="h-3.5 w-3.5" />
                  {c.titulo}
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
  to,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  to: string
}) {
  return (
    <Link to={to}>
      <Card className="h-full transition-colors hover:border-indigo-300 dark:hover:border-indigo-600">
        <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400">{icon}</div>
        <p className="mt-3 text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
      </Card>
    </Link>
  )
}

function PrazoBadge({ dias, data }: { dias: number; data: string }) {
  let cls = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  let text = formatDateBr(data)
  if (dias < 0) {
    cls = 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
    text = `atrasada ${Math.abs(dias)}d`
  } else if (dias === 0) {
    cls = 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
    text = 'hoje'
  } else if (dias <= 7) {
    cls = 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
    text = `em ${dias}d`
  }
  return (
    <span className={'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ' + cls}>
      {dias < 0 && <AlertTriangle className="h-3 w-3" />}
      {text}
    </span>
  )
}
