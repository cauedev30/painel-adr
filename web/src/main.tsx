import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// fontes servidas pelo próprio site (OFL), só o subconjunto latino, que cobre o português
import '@fontsource/lexend-deca/latin-400.css'
import '@fontsource/lexend-deca/latin-600.css'
import '@fontsource/lexend-zetta/latin-400.css'
import './estilos/tokens.css'
import './estilos/base.css'
import { App } from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
