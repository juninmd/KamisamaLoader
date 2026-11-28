import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@juninmd/sonido/styles.css'
import './index.css'
import App from './App.tsx'

// Sonido themes are selected with `data-theme`; "kamisama" is the app skin,
// bridged to the existing Tailwind tokens in index.css.
document.documentElement.dataset.theme = 'kamisama'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
