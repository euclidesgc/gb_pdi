import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { usePdiRepository } from '@/data/repositories'
import { Dashboard } from '@/pages/app/Dashboard'

/**
 * Entry of /app. Sends a first-time user (wizard not finished) to the wizard;
 * otherwise shows the dashboard.
 */
export function AppIndex() {
  const pdi = usePdiRepository()
  const [state, setState] = useState<'loading' | 'wizard' | 'ready'>('loading')

  useEffect(() => {
    void (async () => {
      const p = await pdi.getPerfil()
      setState(p.wizardConcluido ? 'ready' : 'wizard')
    })()
  }, [pdi])

  if (state === 'loading') {
    return <p className="text-center text-sm text-slate-400">Carregando…</p>
  }
  if (state === 'wizard') {
    return <Navigate to="/app/wizard" replace />
  }
  return <Dashboard />
}
