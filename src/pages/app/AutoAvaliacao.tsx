import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, Target } from 'lucide-react'
import { Card } from '@/components/ui/controls'
import { cn } from '@/lib/cn'
import { usePdiRepository } from '@/data/repositories'
import { HabilidadesRating, type AutoProgress } from '@/components/app/HabilidadesRating'
import type { Perfil } from '@/domain/pdi'

export function AutoAvaliacao() {
  const pdi = usePdiRepository()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<AutoProgress>({ total: 0, avaliadas: 0, gaps: 0 })

  useEffect(() => {
    void (async () => {
      setPerfil(await pdi.getPerfil())
      setLoading(false)
    })()
  }, [pdi])

  if (loading) {
    return <p className="text-center text-sm text-slate-400">Carregando auto-avaliação…</p>
  }

  if (!perfil?.areaId || !perfil?.nivelId) {
    return (
      <div className="mx-auto max-w-2xl">
        <Header />
        <Card className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Para se auto-avaliar, escolha primeiro sua <strong>carreira</strong> e seu{' '}
            <strong>nível</strong> no perfil.
          </p>
          <Link
            to="/app/perfil"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Target className="h-4 w-4" />
            Ir para o perfil
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Header />

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Metric label="Avaliadas" value={`${progress.avaliadas}/${progress.total}`} />
          <Metric label="No plano (gaps)" value={String(progress.gaps)} accent="rose" />
        </div>
        <Link
          to="/app/desenvolvimento"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Ver plano de desenvolvimento →
        </Link>
      </Card>

      <div className="mt-6">
        <HabilidadesRating
          areaId={perfil.areaId}
          nivelId={perfil.nivelId}
          onProgress={setProgress}
        />
      </div>
    </div>
  )
}

function Header() {
  return (
    <>
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Auto-avaliação</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Para cada habilidade esperada no seu nível, diga como você se enxerga. As que ficarem
        em <strong>Precisa agir</strong> ou <strong>Pode mais</strong> entram no seu plano de
        desenvolvimento.
      </p>
    </>
  )
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: 'rose'
}) {
  return (
    <div>
      <div
        className={cn(
          'text-2xl font-bold',
          accent === 'rose'
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-slate-800 dark:text-slate-100',
        )}
      >
        {value}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  )
}
