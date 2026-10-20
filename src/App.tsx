// src/App.tsx
import { Route, Routes } from "react-router-dom";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import Room from "./pages/Room";
import Sandbox from "./pages/Sandbox";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:id" element={<Room />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/sandbox" element={<Sandbox />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
