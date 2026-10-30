import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

/** Centered brand + card frame shared by the signed-out account screens. */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title?: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <span className="text-4xl font-extrabold tracking-tight text-indigo-700 dark:text-indigo-300">
            <span className="text-accent-500 dark:text-accent-400">GB</span> PDI
          </span>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Seu plano de desenvolvimento individual.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {title && (
            <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
          )}
          {subtitle && (
            <p className="mt-1 mb-5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
          {children}
        </div>
        {footer && (
          <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/** Inline success / error line for forms. */
export function FormMessage({ tone, children }: { tone: 'ok' | 'err'; children: ReactNode }) {
  return tone === 'ok' ? (
    <p
      className="flex items-start gap-2 text-sm text-emerald-600 dark:text-emerald-400"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  ) : (
    <p className="flex items-start gap-2 text-sm text-rose-600 dark:text-rose-400" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
