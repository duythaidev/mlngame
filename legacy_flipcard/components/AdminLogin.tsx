import { useState } from "react";

export default function AdminLogin({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ADMIN_EMAIL = "admin@gmail.com";
  const ADMIN_PASSWORD = "123456";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_logged_in", "true");
      onLoginSuccess();
    } else {
      setError("Email hoặc mật khẩu không đúng.");
    }
  };

  return (
    <div style={{ color: "white", padding: 40, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2>Đăng nhập Admin</h2>
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 10, width: 300, marginTop: 20 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #444", background: "#222", color: "white" }}
          required
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #444", background: "#222", color: "white" }}
          required
        />
        {error && <p style={{ color: "#e74c3c", margin: 0 }}>{error}</p>}
        <button type="submit" className="btn" style={{ marginTop: 10 }}>
          Đăng nhập
        </button>
      </form>
    </div>
  );
}
