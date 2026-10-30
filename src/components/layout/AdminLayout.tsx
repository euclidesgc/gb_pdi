import { Suspense, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Award,
  Briefcase,
  Grid3x3,
  Layers,
  ListTree,
  ArrowLeft,
  LayoutDashboard,
  Menu,
  Route as RouteIcon,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { to: '/admin', label: 'Carreiras', icon: Briefcase, end: true },
  { to: '/admin/niveis', label: 'Níveis de carreira', icon: Layers },
  { to: '/admin/competencias', label: 'Competências', icon: ListTree },
  { to: '/admin/matriz', label: 'Matriz de competências', icon: Grid3x3 },
  { to: '/admin/certificacoes', label: 'Certificações', icon: Award },
  { to: '/admin/trilha-templates', label: 'Templates de trilha', icon: RouteIcon },
  { to: '/admin/usuarios', label: 'Usuários', icon: Users },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto pt-6">
        <NavLink
          to="/app"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao app
        </NavLink>
      </div>
    </>
  )
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="px-3">
          <div className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">
            Administração
          </div>
          <div className="text-xs text-slate-400">Catálogo e usuários</div>
        </div>
        <div className="mt-8 flex flex-1 flex-col">
          <NavLinks />
        </div>
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative flex w-64 max-w-[80%] flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between px-3">
              <span className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100">
                Administração
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-8 flex flex-1 flex-col">
              <NavLinks onNavigate={() => setMenuOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 md:hidden dark:border-slate-700 dark:text-slate-300"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <NavLink
              to="/app"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Ir ao app</span>
            </NavLink>
            <ThemeToggle />
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Suspense fallback={<p className="text-center text-sm text-slate-400">Carregando…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
