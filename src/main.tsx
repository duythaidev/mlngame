import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import FlipCardGame from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FlipCardGame />
  </StrictMode>,
)
