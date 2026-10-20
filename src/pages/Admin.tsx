// src/pages/Admin.tsx
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { signInAnonymously, signInWithEmailAndPassword, signOut } from "firebase/auth";
import GameCanvas from "../components/GameCanvas";
import { auth } from "../lib/firebase";
import { useDbValue, useRoomList, useUser } from "../lib/hooks";
import { createRoom, deleteRoom } from "../lib/rooms";
import type { RoomMeta, SlotInfo } from "../lib/types";

function Spectate({ id }: { id: string }) {
  const meta = useDbValue<RoomMeta>(`roomList/${id}`);
  const slots = useDbValue<Record<string, SlotInfo>>(`rooms/${id}/slots`);
  if (!meta.value) return null;
  if (meta.value.phase !== "playing") return <p className="muted">Phòng đang ở sảnh, chưa bắt đầu.</p>;
  return <GameCanvas roomId={id} levelId={meta.value.level} slots={slots.value ?? {}} mySlot={null} isHost={false} />;
}

export default function Admin() {
  const user = useUser();
  const isAdmin = useDbValue<boolean>(user ? `admins/${user.uid}` : null);
  const rooms = useRoomList();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [max, setMax] = useState(4);
  const [watch, setWatch] = useState<string | null>(null);
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
      await createRoom(name.trim() || `Phòng ${rooms.length + 1}`, max);
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
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  if (!user) return <div className="page">Đang tải…</div>;

  if (user.isAnonymous) {
    return (
      <div className="page">
        <h1>Admin</h1>
        <form className="card row" onSubmit={login}>
          <input type="email" placeholder="Email admin" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Mật khẩu" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn" type="submit">Đăng nhập</button>
        </form>
        {error && <p className="err">{error}</p>}
        <Link to="/">← Về trang chủ</Link>
      </div>
    );
  }

  if (!isAdmin.ready) return <div className="page">Đang kiểm tra quyền…</div>;
  if (isAdmin.value !== true) {
    return (
      <div className="page">
        <h1>Admin</h1>
        <p className="err">Tài khoản này chưa phải admin.</p>
        <p>
          Vào Realtime Database, tạo <code>admins/{user.uid}</code> = <code>true</code>.
        </p>
        <button className="btn ghost" onClick={logout}>Đăng xuất</button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Admin</h1>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className="btn ghost" onClick={logout}>Đăng xuất</button>
        <Link to="/" className="btn ghost">← Trang chủ</Link>
      </div>

      <form className="card row" onSubmit={create}>
        <input type="text" placeholder="Tên phòng (ví dụ: Team 1 - Alpha)" value={name} onChange={(e) => setName(e.target.value)} />
        <label>
          Tối đa{" "}
          <input
            type="number"
            min={2}
            max={8}
            value={max}
            onChange={(e) => setMax(Math.min(8, Math.max(2, Number(e.target.value) || 2)))}
          />{" "}
          người
        </label>
        <button className="btn" type="submit">Tạo phòng</button>
      </form>
      {error && <p className="err">{error}</p>}

      <h2>Các phòng ({rooms.length})</h2>
      {rooms.map((r) => {
        const names = Object.values(r.players ?? {});
        return (
          <div className="card" key={r.id}>
            <div className="row">
              <strong style={{ minWidth: 160 }}>{r.name}</strong>
              <span className="tag">{names.length}/{r.max} người</span>
              <span className="tag">{r.phase === "playing" ? "Đang chơi" : "Sảnh"}</span>
              <button className="btn ghost" onClick={() => copyRoomLink(r.id)}>
                {copiedId === r.id ? "Đã copy link!" : "Copy link"}
              </button>
              <button className="btn ghost" onClick={() => setWatch(watch === r.id ? null : r.id)}>
                {watch === r.id ? "Ẩn" : "Xem"}
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  if (watch === r.id) setWatch(null);
                  void deleteRoom(r.id);
                }}
              >
                Xóa
              </button>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Thành viên: {names.length ? names.join(", ") : "(chưa có ai)"}
            </div>
            {watch === r.id && <Spectate id={r.id} />}
          </div>
        );
      })}
    </div>
  );
}
