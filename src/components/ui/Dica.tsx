import type { ReactNode } from 'react'
import { Lightbulb } from 'lucide-react'

/** Dica curta sobre como preencher um formulário. */
export function Dica({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-indigo-50/70 px-3 py-2 text-xs text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200">
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
      <span>{children}</span>
    </p>
  )
}

/** Exemplos clicáveis que preenchem o campo. */
export function Exemplos({
  itens,
  onEscolher,
  rotulo = 'Exemplos:',
}: {
  itens: string[]
  onEscolher: (texto: string) => void
  rotulo?: string
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-slate-400">{rotulo}</span>
      {itens.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onEscolher(t)}
          className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300"
        >
          {t}
        </button>
      ))}
    </div>
  )
}
