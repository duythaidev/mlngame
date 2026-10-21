// src/pages/Admin.tsx
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { signInAnonymously, signInWithEmailAndPassword, signOut } from "firebase/auth";
import badgeStar from "../assets/badge-star.svg";
import { auth } from "../lib/firebase";
import { useDbValue, useRoomList, useUser } from "../lib/hooks";
import { LEVEL_IDS, getLevel } from "../game/level";
import { createRoom, deleteRoom } from "../lib/rooms";

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const sec = (secs % 60).toFixed(1).padStart(4, "0");
  return m > 0 ? `${m}:${sec}` : `${sec}s`;
}

export default function Admin() {
  const user = useUser();
  const isAdmin = useDbValue<boolean>(user ? `admins/${user.uid}` : null);
  const rooms = useRoomList();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [max, setMax] = useState(4);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function login(e: FormEvent) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function logout() {
    await signOut(auth);
    await signInAnonymously(auth); // quay lại user ẩn danh
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await createRoom(name.trim() || `Tổ thi đua ${rooms.length + 1}`, max);
      setName("");
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function copyRoomLink(roomId: string) {
    const url = `${window.location.origin}/room/${roomId}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedId(roomId);
      setTimeout(() => setCopiedId(null), 2500);
    });
  }

  if (!user) return <div className="page">Đang kiểm tra tài khoản…</div>;

  if (user.isAnonymous) {
    return (
      <div className="page">
        <h1>
          <img src={badgeStar} alt="Star" style={{ width: 26, height: 26 }} />
          Bàn Quản Trị (Admin)
        </h1>
        <div className="card highlight" style={{ maxWidth: 440 }}>
          <h3 style={{ margin: "0 0 8px", color: "var(--red-dark)" }}>Đăng Nhập Quản Trị Viên</h3>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            Vui lòng đăng nhập bằng tài khoản quản trị để tạo và giám sát các phòng thi đua.
          </p>

          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email"
              placeholder="Email quản trị"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Mật khẩu"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />
            <button className="btn gold" type="submit" style={{ marginTop: 4 }}>
              Đăng Nhập Admin
            </button>
          </form>

          {error && <p className="err">{error}</p>}

          <div style={{ marginTop: 16 }}>
            <Link to="/" className="btn ghost sm">← Về trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin.ready) return <div className="page">Đang kiểm tra quyền hạn…</div>;

  if (isAdmin.value !== true) {
    return (
      <div className="page">
        <h1>Bàn Quản Trị</h1>
        <div className="card">
          <p className="err">Tài khoản này chưa được cấp quyền quản trị (UID: {user.uid}).</p>
          <p className="muted">
            Vui lòng vào Firebase Realtime Database, thêm bản ghi <code>admins/{user.uid}</code> = <code>true</code>.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn ghost sm" onClick={logout}>Đăng xuất</button>
            <Link to="/" className="btn ghost sm">← Về trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>
          <img src={badgeStar} alt="Star" style={{ width: 28, height: 28 }} />
          Bàn Quản Trị Thi Đua
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/" className="btn ghost sm">← Trang Chủ</Link>
          <button className="btn ghost sm" onClick={logout}>Đăng Xuất</button>
        </div>
      </div>

      {/* Tạo phòng mới */}
      <div className="card highlight">
        <h3 style={{ margin: "0 0 12px", color: "var(--red-dark)" }}>
          ★ Mở Phòng Thi Đua Mới
        </h3>
        <form className="row" onSubmit={create}>
          <input
            type="text"
            placeholder="Tên phòng (ví dụ: Đội 1 - Sao Vàng)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14 }}>
            Tối đa:
            <input
              type="number"
              min={2}
              max={8}
              value={max}
              onChange={(e) => setMax(Math.min(8, Math.max(2, Number(e.target.value) || 2)))}
              style={{ width: 64 }}
            />
            người
          </label>
          <button className="btn gold" type="submit">
            + Tạo Phòng
          </button>
        </form>
        {error && <p className="err">{error}</p>}
      </div>

      {/* Danh sách phòng */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>
          ★ Các Phòng Đang Hoạt Động ({rooms.length})
        </h2>
      </div>

      {rooms.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 24 }}>
          <p className="muted">Chưa có phòng nào. Hãy tạo phòng thi đua đầu tiên ở trên.</p>
        </div>
      ) : (
        rooms.map((r) => {
          const names = Object.values(r.players ?? {});
          return (
            <div className="card" key={r.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 16 }}>{r.name}</strong>
                  <span className="tag host">{names.length}/{r.max} người</span>
                  <span className={`tag ${r.phase === "playing" ? "playing" : "waiting"}`}>
                    {r.phase === "playing" ? "● Đang chơi" : "○ Sảnh chờ"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn ghost sm" onClick={() => copyRoomLink(r.id)}>
                    {copiedId === r.id ? "✓ Đã Chép" : "🔗 Link Mời"}
                  </button>
                  <button
                    className="btn ghost sm"
                    onClick={() => void deleteRoom(r.id)}
                    style={{ color: "var(--red-dark)" }}
                  >
                    Xóa
                  </button>
                </div>
              </div>

              <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                <strong>Thành viên:</strong> {names.length ? names.join(", ") : "(chưa có người vào)"}
              </div>

              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                <strong>Thời gian hoàn thành:</strong>{" "}
                {LEVEL_IDS.map((lv) => {
                  const t = r.results?.[lv];
                  return (
                    <span key={lv} className="tag" style={{ marginRight: 6 }}>
                      {getLevel(lv).name.split(" — ")[0]}: {t !== undefined ? fmtTime(t) : "—"}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
