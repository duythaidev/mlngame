// src/pages/Room.tsx
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ref, set } from "firebase/database";
import GameCanvas from "../components/GameCanvas";
import TouchControls from "../components/TouchControls";
import badgeStar from "../assets/badge-star.svg";
import { db } from "../lib/firebase";
import { PRESET_AVATARS } from "../lib/avatars";
import { SLOT_COLORS } from "../lib/constants";
import { useDbValue, useUser } from "../lib/hooks";
import { loadProfile, saveProfile } from "../lib/profile";
import { joinRoom } from "../lib/rooms";
import { fileToAvatar } from "../lib/avatar";
import type { Profile, RoomMeta, SlotInfo } from "../lib/types";

// Level được thiết kế cho nhóm 2–5 người. Thử một mình: tạo .env.local với VITE_MIN_PLAYERS=1
const MIN_PLAYERS = Number(import.meta.env.VITE_MIN_PLAYERS ?? 2);

export default function Room() {
  const { id = "" } = useParams();
  const uid = useUser()?.uid ?? null;
  const meta = useDbValue<RoomMeta>(`roomList/${id}`);
  const slotsQ = useDbValue<Record<string, SlotInfo>>(`rooms/${id}/slots`);
  const [mySlot, setMySlot] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Hỗ trợ người vào thẳng qua link mà chưa có tên trong localStorage
  const [profile, setProfile] = useState<Profile>(() => {
    const p = loadProfile();
    if (!p.avatar && PRESET_AVATARS[0]) {
      p.avatar = PRESET_AVATARS[0].src;
    }
    return p;
  });
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
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleSelectPreset(src: string) {
    const updated = { ...profile, avatar: src };
    setProfile(updated);
    saveProfile(updated);
  }

  function copyLink() {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const setPhase = async (phase: "lobby" | "playing") => {
    await set(ref(db, `roomList/${id}/phase`), phase).catch(console.error);
  };

  const slots = slotsQ.value ?? {};
  const keys = Object.keys(slots).sort();
  const isCoordinator = mySlot !== null && keys[0] === mySlot;
  const isHost = isCoordinator;

  if (error) {
    return (
      <div className="page">
        <h1>
          <img src={badgeStar} alt="Star" style={{ width: 26, height: 26 }} />
          PICO ROPE: ĐẠI ĐOÀN KẾT
        </h1>
        <p className="err">{error}</p>
        <Link to="/" className="btn ghost sm">← Về trang chủ</Link>
      </div>
    );
  }

  if (!meta.ready || !slotsQ.ready) {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: 40 }}>
        <h2>Đang tải thông tin phòng…</h2>
      </div>
    );
  }

  if (!meta.value) {
    return (
      <div className="page">
        <h1>PICO ROPE: ĐẠI ĐOÀN KẾT</h1>
        <div className="card">
          <p className="err">Phòng không tồn tại hoặc đã bị đóng.</p>
          <Link to="/" className="btn ghost">← Về danh sách phòng</Link>
        </div>
      </div>
    );
  }

  const m = meta.value;

  if (needsName) {
    return (
      <div className="page">
        <h1>
          <img src={badgeStar} alt="Star" style={{ width: 28, height: 28 }} />
          {m.name}
        </h1>
        <div className="card highlight">
          <h3 style={{ margin: "0 0 8px", color: "var(--red-dark)" }}>
            Tham Gia Phòng Chơi
          </h3>
          <p className="muted" style={{ margin: "0 0 16px" }}>
            Bạn đang truy cập qua liên kết mời trực tiếp. Vui lòng nhập tên của bạn để gia nhập đội:
          </p>

          <form onSubmit={submitName} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input
              type="text"
              placeholder="Nhập tên của bạn..."
              maxLength={20}
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              style={{ maxWidth: 320 }}
              autoFocus
            />

            <div>
              <div className="muted" style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Chọn hình đại diện:
              </div>
              <div className="preset-avatars-grid">
                {PRESET_AVATARS.map((pa) => {
                  const isSelected = profile.avatar === pa.src;
                  return (
                    <button
                      type="button"
                      key={pa.id}
                      className={`preset-avatar-btn ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectPreset(pa.src)}
                    >
                      <img className="avatar" src={pa.src} alt={pa.name} />
                      <span>{pa.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="muted" style={{ fontSize: 12 }}>Tự tải ảnh riêng:</span>
              <input type="file" accept="image/*" onChange={onPickAvatar} style={{ fontSize: 12 }} />
            </div>

            <button
              className="btn gold"
              type="submit"
              disabled={!profile.name.trim()}
              style={{ alignSelf: "flex-start", marginTop: 8 }}
            >
              Gia Nhập Phòng Ngay
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>
          <img src={badgeStar} alt="Star" style={{ width: 28, height: 28 }} />
          {m.name}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="tag host">{keys.length}/{m.max} người</span>
          <span className={`tag ${m.phase === "playing" ? "playing" : "waiting"}`}>
            {m.phase === "playing" ? "● Đang chơi" : "○ Sảnh chờ"}
          </span>
        </div>
      </div>

      {/* Control bar */}
      <div className="row" style={{ marginBottom: 16, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/" className="btn ghost sm">
            ← Rời Phòng
          </Link>
          <button className="btn sm" onClick={copyLink}>
            {copied ? "✓ Đã Chép Link!" : "🔗 Sao Chép Link Mời"}
          </button>
        </div>

        {isHost && (
          <span className="tag host" style={{ fontSize: 13 }}>
            ★ Bạn là Chủ Phòng (Host)
          </span>
        )}
      </div>

      {/* Lobby Phase */}
      {m.phase === "lobby" && (
        <div className="card highlight">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: "var(--red-dark)" }}>
              ★ Danh Sách Người Chơi Trong Phòng
            </h3>
            <span className="muted" style={{ fontSize: 13 }}>
              Cần ít nhất 1 người chơi để bắt đầu
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {Array.from({ length: m.max }, (_, i) => `s${i}`).map((s, idx) => {
              const p = slots[s];
              const isSlotHost = p && s === keys[0];
              const isMe = p && s === mySlot;
              const slotColor = SLOT_COLORS[idx % SLOT_COLORS.length];

              return (
                <div
                  className={`slot ${isMe ? "current-user" : ""}`}
                  key={s}
                  style={{ borderLeftWidth: 6, borderLeftColor: slotColor }}
                >
                  {p?.avatar ? (
                    <img className="avatar" src={p.avatar} alt="" />
                  ) : (
                    <div className="avatar" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#888" }}>
                      Trống
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
                    <span style={{ fontWeight: 700, fontSize: 14, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {p ? p.name : <span className="muted" style={{ fontStyle: "italic" }}>(Đang đợi...)</span>}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {isSlotHost && <span className="tag host" style={{ fontSize: 10, padding: "1px 6px" }}>Chủ phòng</span>}
                      {isMe && <span className="tag" style={{ fontSize: 10, padding: "1px 6px" }}>Bạn</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24, textAlign: "center" }}>
            {isHost ? (
              <button
                className="btn gold"
                style={{ fontSize: 18, padding: "12px 28px" }}
                disabled={keys.length < MIN_PLAYERS}
                title={keys.length < MIN_PLAYERS ? `Cần ít nhất ${MIN_PLAYERS} người` : undefined}
                onClick={() => setPhase("playing")}
              >
                ★ BẮT ĐẦU CHƠI NGAY ★
              </button>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--bg-subtle)", borderRadius: 8, border: "2px dashed var(--border)" }}>
                <span style={{ fontSize: 16 }}>⏳</span>
                <span className="muted" style={{ fontWeight: 600 }}>
                  Đang chờ chủ phòng nhấn bắt đầu...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Playing Phase - Arcade Shell Frame */}
      {m.phase === "playing" && (
        <div className="arcade-shell">
          <div className="arcade-bezel-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src={badgeStar} alt="Star" style={{ width: 18, height: 18 }} />
              <span>PICO ROPE · {m.name.toUpperCase()}</span>
            </div>
            <div className="arcade-bezel-lights">
              <span className="red" />
              <span className="yellow" />
              <span className="green" />
            </div>
          </div>

          {mySlot === null ? (
            <div style={{ padding: 40, textAlign: "center", background: "#FFF", borderRadius: "0 0 6px 6px" }}>
              <p className="muted">Đang kết nối tín hiệu vào phòng…</p>
            </div>
          ) : (
            <GameCanvas roomId={id} levelId={m.level} slots={slots} mySlot={mySlot} />
          )}
          {mySlot !== null && <TouchControls showRestart={isHost} />}

          <div className="arcade-controls-guide">
            <div>
              <span className="key-pill">A</span>
              <span className="key-pill">D</span> hoặc <span className="key-pill">←</span>
              <span className="key-pill">→</span> Di chuyển
            </div>
            <div>
              <span className="key-pill">W</span> hoặc <span className="key-pill">Space</span>
              <span className="key-pill">↑</span> Bật nhảy
            </div>
            {isHost && (
              <div>
                <span className="key-pill">R</span> Chơi lại khi thắng
              </div>
            )}
          </div>

          {isHost && (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn ghost sm" onClick={() => setPhase("lobby")}>
                ⤺ Kết Thúc & Về Sảnh Chờ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
