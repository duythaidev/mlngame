import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import FlipCardGame from './App.tsx'
import Demo from './Demo.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FlipCardGame />} />
        <Route path="/demo" element={<Demo />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
