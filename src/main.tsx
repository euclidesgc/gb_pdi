import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './routes'
import { initTheme } from './store/themeStore'
import { DatabaseProvider } from './data/DatabaseProvider'

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DatabaseProvider>
      <RouterProvider router={router} />
    </DatabaseProvider>
  </StrictMode>,
)
