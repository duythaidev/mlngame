// src/pages/Home.tsx
import { useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fileToAvatar } from "../lib/avatar";
import { useRoomList, useUser } from "../lib/hooks";
import { loadProfile, saveProfile } from "../lib/profile";
import type { Profile } from "../lib/types";

export default function Home() {
  useUser(); // đảm bảo đã đăng nhập ẩn danh
  const rooms = useRoomList();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [error, setError] = useState("");

  async function onPickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const avatar = await fileToAvatar(file);
      const updated = { ...profile, avatar };
      setProfile(updated);
      saveProfile(updated);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleNameChange(name: string) {
    const updated = { ...profile, name };
    setProfile(updated);
    saveProfile(updated);
  }

  function join(id: string) {
    if (!profile.name.trim()) {
      setError("Nhập tên trước khi vào phòng");
      return;
    }
    saveProfile(profile);
    navigate(`/room/${id}`);
  }

  return (
    <div className="page">
      <h1>PICO ROPE</h1>

      <div className="card">
        <div className="row">
          {profile.avatar ? <img className="avatar" src={profile.avatar} alt="avatar" /> : <div className="avatar" />}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              type="text"
              placeholder="Tên của bạn"
              maxLength={20}
              value={profile.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
            <div className="muted">Ảnh nhân vật (tự cắt vuông, thu về 32×32):</div>
            <input type="file" accept="image/*" onChange={onPickAvatar} />
          </div>
        </div>
        {error && <p className="err">{error}</p>}
      </div>

      <h2>Danh sách phòng</h2>
      {rooms.length === 0 && <p className="muted">Chưa có phòng nào. Nhờ admin tạo phòng.</p>}
      {rooms.map((r) => {
        const count = Object.keys(r.players ?? {}).length;
        const full = count >= r.max;
        return (
          <div className="card row" key={r.id}>
            <strong style={{ minWidth: 140 }}>{r.name}</strong>
            <span className="tag">{count}/{r.max} người</span>
            <span className="tag">{r.phase === "playing" ? "Đang chơi" : "Sảnh"}</span>
            <button className="btn" disabled={full} onClick={() => join(r.id)}>
              {full ? "Đầy" : "Vào"}
            </button>
          </div>
        );
      })}

      <p className="muted" style={{ marginTop: 24, display: "flex", gap: 16 }}>
        <Link to="/admin">Trang admin</Link>
        <span>·</span>
        <Link to="/sandbox">Chế độ offline (Sandbox)</Link>
      </p>
    </div>
  );
}
