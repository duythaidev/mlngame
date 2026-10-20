// src/pages/Room.tsx
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ref, set } from "firebase/database";
import GameCanvas from "../components/GameCanvas";
import { db } from "../lib/firebase";
import { useDbValue, useUser } from "../lib/hooks";
import { loadProfile, saveProfile } from "../lib/profile";
import { joinRoom } from "../lib/rooms";
import { fileToAvatar } from "../lib/avatar";
import type { Profile, RoomMeta, SlotInfo } from "../lib/types";

export default function Room() {
  const { id = "" } = useParams();
  const uid = useUser()?.uid ?? null;
  const meta = useDbValue<RoomMeta>(`roomList/${id}`);
  const slotsQ = useDbValue<Record<string, SlotInfo>>(`rooms/${id}/slots`);
  const [mySlot, setMySlot] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Hỗ trợ người vào thẳng qua link mà chưa có tên trong localStorage
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [needsName, setNeedsName] = useState(() => !loadProfile().name.trim());
  const [joinTrigger, setJoinTrigger] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const currentProfile = loadProfile();
    if (!currentProfile.name.trim()) {
      setNeedsName(true);
      return;
    }
    setNeedsName(false);
    let cancelled = false;
    let leave: (() => Promise<void>) | null = null;
    joinRoom(id, uid, currentProfile).then(
      (r) => {
        if (cancelled) {
          void r.leave();
          return;
        }
        leave = r.leave;
        setMySlot(r.slot);
      },
      (e: Error) => {
        if (!cancelled) setError(e.message);
      },
    );
    return () => {
      cancelled = true;
      void leave?.();
    };
  }, [id, uid, joinTrigger]);

  function submitName(e: FormEvent) {
    e.preventDefault();
    if (!profile.name.trim()) return;
    saveProfile(profile);
    setNeedsName(false);
    setJoinTrigger((t) => t + 1);
  }

  async function onPickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const avatar = await fileToAvatar(file);
      const updated = { ...profile, avatar };
      setProfile(updated);
      saveProfile(updated);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function copyLink() {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const setPhase = (phase: "lobby" | "playing") =>
    void set(ref(db, `roomList/${id}/phase`), phase).catch(console.error);

  const slots = slotsQ.value ?? {};
  const keys = Object.keys(slots).sort();
  const isHost = mySlot !== null && keys[0] === mySlot;

  if (error) {
    return (
      <div className="page">
        <h1>PICO ROPE</h1>
        <p className="err">{error}</p>
        <Link to="/">← Về trang chủ</Link>
      </div>
    );
  }
  if (!meta.ready || !slotsQ.ready) return <div className="page">Đang tải…</div>;
  if (!meta.value) {
    return (
      <div className="page">
        <h1>PICO ROPE</h1>
        <p>Phòng không tồn tại hoặc đã bị xóa.</p>
        <Link to="/">← Về trang chủ</Link>
      </div>
    );
  }
  const m = meta.value;

  if (needsName) {
    return (
      <div className="page">
        <h1>{m.name}</h1>
        <div className="card">
          <h3>Tham gia phòng chơi</h3>
          <p className="muted">Bạn chưa đặt tên. Vui lòng nhập tên để vào phòng:</p>
          <form onSubmit={submitName} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
            <input
              type="text"
              placeholder="Tên của bạn"
              maxLength={20}
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              autoFocus
            />
            <div className="muted">Ảnh nhân vật (tùy chọn):</div>
            <input type="file" accept="image/*" onChange={onPickAvatar} />
            <button className="btn" type="submit" disabled={!profile.name.trim()}>
              Vào phòng
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{m.name}</h1>
      <div className="row" style={{ marginBottom: 16 }}>
        <Link to="/" className="btn ghost">← Rời phòng</Link>
        <span className="tag">{keys.length}/{m.max} người</span>
        {isHost && <span className="tag host">Bạn là host</span>}
        <button className="btn ghost" onClick={copyLink}>
          {copied ? "Đã chép link!" : "Sao chép link mời"}
        </button>
      </div>

      {m.phase === "lobby" && (
        <div className="card">
          {Array.from({ length: m.max }, (_, i) => `s${i}`).map((s) => {
            const p = slots[s];
            return (
              <div className="slot" key={s}>
                {p?.avatar ? <img className="avatar" src={p.avatar} alt="" /> : <div className="avatar" />}
                <span>{p ? p.name : <span className="muted">(trống)</span>}</span>
                {p && s === keys[0] && <span className="tag host">host</span>}
                {p && s === mySlot && <span className="tag">bạn</span>}
              </div>
            );
          })}
          <div style={{ marginTop: 16 }}>
            {isHost ? (
              <button className="btn" disabled={keys.length < 1} onClick={() => setPhase("playing")}>
                Bắt đầu chơi
              </button>
            ) : (
              <p className="muted">Chờ host bắt đầu…</p>
            )}
          </div>
        </div>
      )}

      {m.phase === "playing" && (
        <>
          {mySlot === null ? (
            <p>Đang vào phòng…</p>
          ) : (
            <GameCanvas roomId={id} levelId={m.level} slots={slots} mySlot={mySlot} isHost={isHost} />
          )}
          <p className="muted" style={{ marginTop: 12 }}>
            ← → / A D: chạy · ↑ / W / Space: nhảy · Host bấm R để chơi lại sau khi thắng
          </p>
          {isHost && (
            <button className="btn ghost" onClick={() => setPhase("lobby")} style={{ marginTop: 8 }}>
              Về sảnh
            </button>
          )}
        </>
      )}
    </div>
  );
}
