import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, LineChart as LineChartIcon, Radar as RadarIcon } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button, Card } from '@/components/ui/controls'
import { useCatalogRepository, usePdiRepository } from '@/data/repositories'
import { ESCALA_AUTOAVALIACAO } from '@/domain/catalog'
import type { Competencia, Habilidade } from '@/domain/catalog'
import type { Ciclo } from '@/domain/pdi'
import { newId } from '@/lib/id'
import { computeSnapshot, formatDateBr, todayIso } from '@/lib/pdiStats'

const AXIS = '#94a3b8'

function shortName(nome: string, max = 16): string {
  return nome.length > max ? nome.slice(0, max - 1) + '…' : nome
}

export function Evolucao() {
  const pdi = usePdiRepository()
  const catalog = useCatalogRepository()
  const [habs, setHabs] = useState<Habilidade[]>([])
  const [comps, setComps] = useState<Competencia[]>([])
  const [notas, setNotas] = useState<Map<string, number>>(new Map())
  const [ciclos, setCiclos] = useState<Ciclo[]>([])
  const [saudeAtual, setSaudeAtual] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fechando, setFechando] = useState(false)

  const load = async () => {
    const [p, cs, avs, c, acoes, trilha, objetivos, hard, soft] = await Promise.all([
      pdi.getPerfil(),
      catalog.listCompetencias(),
      pdi.listAvaliacoes(),
      pdi.listCiclos(),
      pdi.listAcoes(),
      pdi.listTrilhaItens(),
      pdi.listObjetivos(),
      pdi.listHardSkills(),
      pdi.listSoftSkills(),
    ])
    setComps(cs)
    setCiclos(c)
    const notasMap = new Map(avs.map((a) => [a.habilidadeId, a.nota]))
    setNotas(notasMap)
    let hs: Habilidade[] = []
    if (p.areaId && p.nivelId) {
      hs = await catalog.listHabilidades({ areaId: p.areaId, nivelId: p.nivelId })
    }
    setHabs(hs)
    let avaliadas = 0
    let atende = 0
    for (const h of hs) {
      const n = notasMap.get(h.id)
      if (n) {
        avaliadas += 1
        if (n >= 3) atende += 1
      }
    }
    setSaudeAtual(
      computeSnapshot({
        objetivos: objetivos.length,
        acoes,
        trilha,
        hard,
        soft,
        autoavaliacao: { total: hs.length, avaliadas, atende },
      }).saude,
    )
    setLoading(false)
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdi, catalog])

  const compMap = useMemo(() => new Map(comps.map((c) => [c.id, c])), [comps])

  // Radar: média da auto-avaliação por competência vs o esperado (Faz bonito = 3).
  const radarData = useMemo(() => {
    const byComp = new Map<string, number[]>()
    for (const h of habs) {
      const n = notas.get(h.id)
      if (!n) continue
      const arr = byComp.get(h.competenciaId) ?? []
      arr.push(n)
      byComp.set(h.competenciaId, arr)
    }
    return [...byComp.entries()]
      .map(([compId, ns]) => ({
        skill: shortName(compMap.get(compId)?.nome ?? compId),
        Atual: Math.round((ns.reduce((a, b) => a + b, 0) / ns.length) * 10) / 10,
        Esperado: 3,
      }))
      .slice(0, 10)
  }, [habs, notas, compMap])

  // Distribuição das notas da auto-avaliação.
  const distData = useMemo(() => {
    const counts = new Map<number, number>()
    for (const h of habs) {
      const n = notas.get(h.id)
      if (n) counts.set(n, (counts.get(n) ?? 0) + 1)
    }
    return ESCALA_AUTOAVALIACAO.map((o) => ({ nome: o.label, qtd: counts.get(o.valor) ?? 0 }))
  }, [habs, notas])

  const avaliadas = useMemo(
    () => habs.filter((h) => notas.has(h.id)).length,
    [habs, notas],
  )

  const trendData = useMemo(
    () =>
      [...ciclos]
        .reverse()
        .map((c, i) => ({
          nome: c.dataFim ? formatDateBr(c.dataFim) : `Ciclo ${i + 1}`,
          saude: c.scoreSaude ?? 0,
        })),
    [ciclos],
  )

  const fecharCiclo = async () => {
    setFechando(true)
    const ultimo = ciclos[0]
    const ciclo: Ciclo = {
      id: newId(),
      dataInicio: ultimo?.dataFim ?? todayIso(),
      dataFim: todayIso(),
      scoreSaude: saudeAtual,
      snapshotJson: JSON.stringify({ saude: saudeAtual, habilidadesAvaliadas: avaliadas }),
    }
    await pdi.addCiclo(ciclo)
    await load()
    setFechando(false)
  }

  if (loading) {
    return <p className="text-center text-sm text-slate-400">Carregando evolução…</p>
  }

  const semDados = avaliadas === 0

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LineChartIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Evolução</h1>
        </div>
        <Button variant="secondary" onClick={fecharCiclo} disabled={fechando}>
          <Flag className="h-4 w-4" />
          Fechar ciclo (saúde {saudeAtual})
        </Button>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Acompanhe sua auto-avaliação por competência e a saúde do PDI ao longo dos ciclos.
      </p>

      {semDados ? (
        <Card className="mt-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Faça sua{' '}
            <Link to="/app/autoavaliacao" className="text-indigo-600 dark:text-indigo-400">
              auto-avaliação
            </Link>{' '}
            para ver seus gráficos aqui.
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Radar por competência */}
          <Card className="lg:col-span-2">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <RadarIcon className="h-4 w-4" />
              Auto-avaliação por competência — média × esperado
            </h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke={AXIS} strokeOpacity={0.3} />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: AXIS, fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 4]} tick={{ fill: AXIS, fontSize: 10 }} />
                  <Radar
                    name="Esperado"
                    dataKey="Esperado"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.12}
                  />
                  <Radar
                    name="Média"
                    dataKey="Atual"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.35}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Distribuição das notas */}
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Distribuição da auto-avaliação
            </h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={AXIS} strokeOpacity={0.2} />
                  <XAxis dataKey="nome" tick={{ fill: AXIS, fontSize: 11 }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fill: AXIS, fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#94a3b833' }} />
                  <Bar dataKey="qtd" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Trend */}
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Saúde do PDI por ciclo
            </h2>
            {trendData.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Feche um ciclo para começar a registrar sua evolução.
              </p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={AXIS} strokeOpacity={0.2} />
                    <XAxis dataKey="nome" tick={{ fill: AXIS, fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: AXIS, fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="saude"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  fontSize: 12,
  background: '#ffffff',
  color: '#1e293b',
}
