import type { ReactNode } from 'react'

interface PlaceholderProps {
  title: string
  description?: string
  phase?: string
  children?: ReactNode
}

/** Temporary page shell used while screens are being built out phase by phase. */
export function Placeholder({ title, description, phase, children }: PlaceholderProps) {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {children ?? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-sm text-slate-400">
            Em construção{phase ? ` · ${phase}` : ''}.
          </p>
        </div>
      )}
    </div>
  )
}
