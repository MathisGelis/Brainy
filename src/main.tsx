import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { Providers } from '@/app/Providers'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
)

// Service worker (app installable, hors ligne) : build de prod seulement, après le premier rendu.
if (import.meta.env.PROD && 'serviceWorker' in navigator)
  void import('@/app/pwa/register').then((m) => m.registerServiceWorker())
