// src/pages/Room.tsx
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import CharacterPicker, { CharacterPreview } from "../components/CharacterPicker";
import GameCanvas from "../components/GameCanvas";
import GameStage from "../components/GameStage";
import { roleOf, type RoleId } from "../game/characters";
import { START, type Progress } from "../game/progress";
import TouchControls from "../components/TouchControls";
import badgeStar from "../assets/badge-star.svg";
import { SLOT_COLORS } from "../lib/constants";
import { useDbValue, useUser } from "../lib/hooks";
import { loadProfile, saveProfile } from "../lib/profile";
import { joinRoom } from "../lib/rooms";
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
  const [profile, setProfile] = useState<Profile>(() => {
    const p = loadProfile();
    p.avatar = roleOf(p.avatar); // nhân vật mặc định / chuyển ảnh cũ sang id vai
    return p;
  });
  const [needsName, setNeedsName] = useState(() => !loadProfile().name.trim());
  const [joinTrigger, setJoinTrigger] = useState(0);
  const [progress, setProgress] = useState<Progress>(START);

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

  function handleSelectRole(role: RoleId) {
    const updated = { ...profile, avatar: role };
    setProfile(updated);
    saveProfile(updated);
  }

  function copyLink() {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const slots = slotsQ.value ?? {};
  const keys = Object.keys(slots).sort();

  if (error) {
    return (
      <div className="page">
        <h1>
          <img src={badgeStar} alt="Star" style={{ width: 26, height: 26 }} />
          PICO ROPE: MLN131
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
        <h1>PICO ROPE: MLN131</h1>
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
                Chọn nhân vật:
              </div>
              <CharacterPicker value={profile.avatar} onChange={handleSelectRole} />
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
    <div className={m.phase === "playing" ? "page page-wide" : "page"}>
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
      </div>

      {/* Lobby Phase */}
      {m.phase === "lobby" && (
        <div className="card highlight">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: "var(--red-dark)" }}>
              ★ Danh Sách Người Chơi Trong Phòng
            </h3>
            <span className="muted" style={{ fontSize: 13 }}>
              Ban tổ chức sẽ bắt đầu lượt thi cho mọi phòng
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {Array.from({ length: m.max }, (_, i) => `s${i}`).map((s, idx) => {
              const p = slots[s];
              const isMe = p && s === mySlot;
              const slotColor = SLOT_COLORS[idx % SLOT_COLORS.length];

              return (
                <div
                  className={`slot ${isMe ? "current-user" : ""}`}
                  key={s}
                  style={{ borderLeftWidth: 6, borderLeftColor: slotColor }}
                >
                  {p ? (
                    <div className="avatar" style={{ display: "grid", placeItems: "center" }}>
                      <CharacterPreview role={roleOf(p.avatar, s)} scale={2} />
                    </div>
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
                      {isMe && <span className="tag" style={{ fontSize: 10, padding: "1px 6px" }}>Bạn</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24, textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--bg-subtle)", borderRadius: 8, border: "2px dashed var(--border)" }}>
              <span style={{ fontSize: 16 }}>⏳</span>
              <span className="muted" style={{ fontWeight: 600 }}>
                Đang chờ ban tổ chức bắt đầu lượt thi...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Playing Phase - Arcade Shell Frame */}
      {m.phase === "playing" && (
        <div className="arcade-shell">
          <div className="arcade-bezel-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src={badgeStar} alt="Star" style={{ width: 18, height: 18 }} />
              <span>NHÓM: {m.name.toUpperCase()}</span>
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
            <GameStage progress={progress} footnote="Chờ ban tổ chức mở lượt mới">
              <GameCanvas roomId={id} levelId={m.level} slots={slots} mySlot={mySlot} onProgress={setProgress} />
            </GameStage>
          )}
          {mySlot !== null && <TouchControls />}

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
          </div>
        </div>
      )}
    </div>
  );
}
