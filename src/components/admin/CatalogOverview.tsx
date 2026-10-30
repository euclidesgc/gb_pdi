import { useEffect, useState } from 'react'
import { Database } from 'lucide-react'
import { Card } from '@/components/ui/controls'
import { useCatalogRepository } from '@/data/repositories'
import type { CatalogCounts } from '@/data/ports/CatalogRepository'

const LABELS: Record<keyof CatalogCounts, string> = {
  areas: 'Carreiras',
  niveis: 'Níveis',
  competencias: 'Competências',
  matriz: 'Matriz',
  habilidades: 'Habilidades',
  certificacoes: 'Certificações',
  trilhaTemplates: 'Templates',
}

/**
 * Read-only overview of the reference catalog. The catalog ships seeded by
 * default (see `ensureCatalogSeeded`) and is edited through the CRUD screens, so
 * there is no manual "seed"/"clear" control here on purpose.
 */
export function CatalogOverview() {
  const repo = useCatalogRepository()
  const [counts, setCounts] = useState<CatalogCounts | null>(null)

  useEffect(() => {
    void (async () => setCounts(await repo.counts()))()
  }, [repo])

  return (
    <Card className="mb-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
          <Database className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Catálogo</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dados de referência da plataforma.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-7">
        {(Object.keys(LABELS) as (keyof CatalogCounts)[]).map((k) => (
          <div
            key={k}
            className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-800/50"
          >
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {counts ? counts[k] : '—'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{LABELS[k]}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}
