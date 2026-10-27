// src/App.tsx
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";

const Room = lazy(() => import("./pages/Room"));
const Admin = lazy(() => import("./pages/Admin"));
const Sandbox = lazy(() => import("./pages/Sandbox"));

export default function App() {
  return (
    <Suspense fallback={<div className="page"><p className="muted">Đang tải…</p></div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:id" element={<Room />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/sandbox" element={<Sandbox />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Suspense>
  );
}
