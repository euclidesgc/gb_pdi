import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { EsqueciSenha } from '@/pages/auth/EsqueciSenha'
import { RedefinirSenha } from '@/pages/auth/RedefinirSenha'
import { VerificarEmail } from '@/pages/auth/VerificarEmail'
import { RequireAdmin, RequireAuth } from '@/auth/guards'
import { AppIndex } from '@/pages/app/AppIndex'

// Feature screens are code-split so the initial load stays light (Recharts,
// the admin CRUD screens, etc. load only when their route is visited).
const Wizard = lazy(() => import('@/pages/app/Wizard').then((m) => ({ default: m.Wizard })))
const AutoAvaliacao = lazy(() =>
  import('@/pages/app/AutoAvaliacao').then((m) => ({ default: m.AutoAvaliacao })),
)
const Desenvolvimento = lazy(() =>
  import('@/pages/app/Desenvolvimento').then((m) => ({ default: m.Desenvolvimento })),
)
const Objetivos = lazy(() =>
  import('@/pages/app/Objetivos').then((m) => ({ default: m.Objetivos })),
)
const Trilha = lazy(() => import('@/pages/app/Trilha').then((m) => ({ default: m.Trilha })))
const Plano = lazy(() => import('@/pages/app/Plano').then((m) => ({ default: m.Plano })))
const Evolucao = lazy(() => import('@/pages/app/Evolucao').then((m) => ({ default: m.Evolucao })))
const Diario = lazy(() => import('@/pages/app/Diario').then((m) => ({ default: m.Diario })))
const Comparador = lazy(() =>
  import('@/pages/app/Comparador').then((m) => ({ default: m.Comparador })),
)
const Curriculo = lazy(() =>
  import('@/pages/app/Curriculo').then((m) => ({ default: m.Curriculo })),
)
const Perfil = lazy(() => import('@/pages/app/Perfil').then((m) => ({ default: m.Perfil })))

const AreasAdmin = lazy(() => import('@/pages/admin/Areas').then((m) => ({ default: m.AreasAdmin })))
const NiveisAdmin = lazy(() =>
  import('@/pages/admin/Niveis').then((m) => ({ default: m.NiveisAdmin })),
)
const CompetenciasAdmin = lazy(() =>
  import('@/pages/admin/Competencias').then((m) => ({ default: m.CompetenciasAdmin })),
)
const MatrizAdmin = lazy(() =>
  import('@/pages/admin/Matriz').then((m) => ({ default: m.MatrizAdmin })),
)
const CertificacoesAdmin = lazy(() =>
  import('@/pages/admin/Certificacoes').then((m) => ({ default: m.CertificacoesAdmin })),
)
const UsuariosAdmin = lazy(() =>
  import('@/pages/admin/Usuarios').then((m) => ({ default: m.UsuariosAdmin })),
)
const TrilhaTemplatesAdmin = lazy(() =>
  import('@/pages/admin/TrilhaTemplates').then((m) => ({ default: m.TrilhaTemplatesAdmin })),
)

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/esqueci-senha', element: <EsqueciSenha /> },
  { path: '/redefinir-senha', element: <RedefinirSenha /> },
  { path: '/verificar-email', element: <VerificarEmail /> },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <AppIndex /> },
      { path: 'wizard', element: <Wizard /> },
      { path: 'autoavaliacao', element: <AutoAvaliacao /> },
      { path: 'desenvolvimento', element: <Desenvolvimento /> },
      { path: 'objetivos', element: <Objetivos /> },
      { path: 'trilha', element: <Trilha /> },
      { path: 'plano', element: <Plano /> },
      { path: 'evolucao', element: <Evolucao /> },
      { path: 'diario', element: <Diario /> },
      { path: 'comparador', element: <Comparador /> },
      { path: 'curriculo', element: <Curriculo /> },
      { path: 'perfil', element: <Perfil /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <AreasAdmin /> },
      { path: 'niveis', element: <NiveisAdmin /> },
      { path: 'competencias', element: <CompetenciasAdmin /> },
      { path: 'matriz', element: <MatrizAdmin /> },
      { path: 'certificacoes', element: <CertificacoesAdmin /> },
      { path: 'trilha-templates', element: <TrilhaTemplatesAdmin /> },
      { path: 'usuarios', element: <UsuariosAdmin /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
