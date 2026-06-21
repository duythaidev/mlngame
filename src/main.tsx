import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import AdminDashboard from './components/AdminDashboard.tsx'
import PlayerBoard from './components/PlayerBoard.tsx'
import Demo from './Demo.tsx'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/play" replace />} />
        <Route path="/test" element={<App />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/play" element={<PlayerBoard />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
