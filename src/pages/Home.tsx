import { Link } from 'react-router-dom'
import { ArrowRight, Settings } from 'lucide-react'
import { BootCounter } from '@/components/dev/BootCounter'

export function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-md text-center">
        <span className="text-4xl font-extrabold tracking-tight text-indigo-700 dark:text-indigo-300">
          <span className="text-accent-500 dark:text-accent-400">GB</span> PDI
        </span>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Seu plano de desenvolvimento — local e sem login.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/app"
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-md transition-colors hover:bg-indigo-700"
          >
            Abrir meu PDI
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/admin"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Settings className="h-4 w-4" />
            Administração do catálogo
          </Link>
        </div>
        <BootCounter />
      </div>
    </div>
  )
}
