// src/pages/Home.tsx
import { useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import heroBanner from "../assets/hero-banner.jpg";
import badgeStar from "../assets/badge-star.svg";
import { fileToAvatar } from "../lib/avatar";
import { PRESET_AVATARS } from "../lib/constants";
import { useRoomList, useUser } from "../lib/hooks";
import { loadProfile, saveProfile } from "../lib/profile";
import type { Profile } from "../lib/types";

export default function Home() {
  useUser(); // đảm bảo đã đăng nhập ẩn danh
  const rooms = useRoomList();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(() => {
    const p = loadProfile();
    // Gán avatar mặc định nếu chưa có
    if (!p.avatar && PRESET_AVATARS[0]) {
      p.avatar = PRESET_AVATARS[0].src;
    }
    return p;
  });
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

  function handleSelectPreset(src: string) {
    const updated = { ...profile, avatar: src };
    setProfile(updated);
    saveProfile(updated);
  }

  function handleNameChange(name: string) {
    const updated = { ...profile, name };
    setProfile(updated);
    saveProfile(updated);
  }

  function join(id: string) {
    if (!profile.name.trim()) {
      setError("Vui lòng nhập tên của bạn trước khi vào phòng!");
      return;
    }
    saveProfile(profile);
    navigate(`/room/${id}`);
  }

  return (
    <>
      <div className="top-ribbon">
        <span>★</span>
        <span>PHONG TRÀO THI ĐUA ĐOÀN KẾT · MÔN HỌC MLN131</span>
        <span>★</span>
      </div>

      <div className="page">
        {/* Hero Banner Card */}
        <div className="hero-card">
          <img
            className="hero-banner-img"
            src={heroBanner}
            alt="Pico Rope Đại Đoàn Kết"
          />
          <div className="hero-overlay">
            <div className="hero-title-group">
              <h1>
                <img src={badgeStar} alt="Star" style={{ width: 28, height: 28 }} />
                PICO ROPE: ĐẠI ĐOÀN KẾT
              </h1>
              <div className="hero-subtitle">
                Trò chơi đồng đội vượt thử thách · Sức mạnh của sự gắn kết
              </div>
            </div>
            <div className="tag host">
              ★ PHIÊN BẢN 2026
            </div>
          </div>
        </div>

        {/* Thẻ người chơi / Profile */}
        <div className="card highlight">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, color: "var(--red-dark)" }}>
              ★ Thẻ Người Chơi
            </h2>
            <span className="muted" style={{ fontSize: 12 }}>Chọn nhân vật hoặc tải ảnh riêng</span>
          </div>

          <div className="row" style={{ alignItems: "flex-start", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              {profile.avatar ? (
                <img className="avatar" style={{ width: 64, height: 64, borderWidth: 3 }} src={profile.avatar} alt="avatar" />
              ) : (
                <div className="avatar" style={{ width: 64, height: 64 }} />
              )}
              <span className="tag sm" style={{ fontSize: 11 }}>Đang chọn</span>
            </div>

            <div className="avatar-selector-box" style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Nhập họ tên / bí danh của bạn..."
                maxLength={20}
                value={profile.name}
                onChange={(e) => handleNameChange(e.target.value)}
                style={{ width: "100%", maxWidth: 320 }}
              />

              <div style={{ marginTop: 4 }}>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                  Chọn nhanh nhân vật:
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

              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="muted" style={{ fontSize: 12 }}>Hoặc tự tải ảnh lên (thu 32×32):</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onPickAvatar}
                  style={{ fontSize: 12 }}
                />
              </div>
            </div>
          </div>
          {error && <p className="err">{error}</p>}
        </div>

        {/* Danh sách phòng */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>
            ★ Danh Sách Phòng Thi Đua
          </h2>
          <span className="muted" style={{ fontSize: 13 }}>
            Hiện có {rooms.length} phòng đang mở
          </span>
        </div>

        {rooms.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "32px 16px" }}>
            <p className="muted" style={{ margin: "0 0 12px", fontSize: 15 }}>
              Hiện chưa có phòng nào được tạo.
            </p>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              Vui lòng liên hệ Admin tạo phòng thi đua cho đội của bạn.
            </p>
          </div>
        ) : (
          rooms.map((r) => {
            const count = Object.keys(r.players ?? {}).length;
            const full = count >= r.max;
            const isPlaying = r.phase === "playing";
            return (
              <div className="card room-card" key={r.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img src={badgeStar} alt="Star" style={{ width: 22, height: 22 }} />
                  <div>
                    <strong style={{ fontSize: 16, display: "block" }}>{r.name}</strong>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <span className="tag">{count}/{r.max} người</span>
                      <span className={`tag ${isPlaying ? "playing" : "waiting"}`}>
                        {isPlaying ? "● Đang chơi" : "○ Sẵn sàng"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  className="btn gold"
                  disabled={full}
                  onClick={() => join(r.id)}
                  style={{ minWidth: 100 }}
                >
                  {full ? "Đã đầy" : "Vào Chơi"}
                </button>
              </div>
            );
          })
        )}

        {/* Quick Footer Links */}
        <div
          className="card"
          style={{
            marginTop: 32,
            background: "var(--bg-subtle)",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            padding: "12px 16px",
          }}
        >
          <Link to="/admin" className="btn ghost sm">
            ⚙ Bàn Quản Trị (Admin)
          </Link>
          <span className="muted">·</span>
          <Link to="/sandbox" className="btn ghost sm">
            🎮 Chế Độ Luyện Tập (Offline Sandbox)
          </Link>
        </div>
      </div>
    </>
  );
}
