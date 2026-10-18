import { Route, Routes } from "react-router-dom";
import Sandbox from "./pages/Sandbox";

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<Sandbox />} />
    </Routes>
  );
}
