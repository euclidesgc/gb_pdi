import { Suspense, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  ClipboardCheck,
  Gauge,
  Goal,
  IdCard,
  ListTodo,
  LogOut,
  Menu,
  NotebookPen,
  Route as RouteIcon,
  Scale,
  SlidersHorizontal,
  Sprout,
  TrendingUp,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { cn } from '@/lib/cn'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: Gauge, end: true },
  { to: '/app/autoavaliacao', label: 'Auto-avaliação', icon: ClipboardCheck },
  { to: '/app/desenvolvimento', label: 'Desenvolvimento', icon: Sprout },
  { to: '/app/objetivos', label: 'Objetivos', icon: Goal },
  { to: '/app/plano', label: 'Plano', icon: ListTodo },
  { to: '/app/trilha', label: 'Trilha', icon: RouteIcon },
  { to: '/app/evolucao', label: 'Evolução', icon: TrendingUp },
  { to: '/app/diario', label: 'Diário', icon: NotebookPen },
  { to: '/app/comparador', label: 'Comparador', icon: Scale },
  { to: '/app/curriculo', label: 'Currículo', icon: IdCard },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()

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
        {user?.isAdmin && (
          <NavLink
            to="/admin"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Administração
          </NavLink>
        )}
        {user && (
          <p className="truncate px-3 pt-2 text-xs text-slate-400" title={user.email}>
            {user.email}
          </p>
        )}
      </div>
    </>
  )
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white/70 px-4 py-6 backdrop-blur md:flex dark:border-slate-700 dark:bg-slate-900/70">
        <NavLink
          to="/app"
          end
          className="px-3 text-2xl font-extrabold tracking-tight text-indigo-700 dark:text-indigo-300"
        >
          <span className="text-accent-500 dark:text-accent-400">GB</span> PDI
        </NavLink>
        <div className="mt-8 flex flex-1 flex-col">
          <NavLinks />
        </div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative flex w-64 max-w-[80%] flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between px-3">
              <span className="text-2xl font-extrabold tracking-tight text-indigo-700 dark:text-indigo-300">
                <span className="text-accent-500 dark:text-accent-400">GB</span> PDI
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
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur sm:px-6 dark:border-slate-700 dark:bg-slate-900/70">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 md:hidden dark:border-slate-700 dark:text-slate-300"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            {user?.isAdmin && (
              <NavLink
                to="/admin"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Administração</span>
              </NavLink>
            )}
            <NavLink
              to="/app/perfil"
              className={({ isActive }) =>
                cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                  isActive
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                )
              }
              aria-label="Perfil"
            >
              <User className="h-4 w-4" />
            </NavLink>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void logout()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
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
