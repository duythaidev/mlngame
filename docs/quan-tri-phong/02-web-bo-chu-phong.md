# 02 · Web: bỏ "chủ phòng" (repo `mlngame`)

Người chơi vào phòng và chờ; không còn nút Bắt đầu, nhãn "Chủ phòng", phím R hay nút cảm ứng R. Màn chơi mở khi admin bắt đầu lượt.

**Thay toàn bộ** `src/pages/Room.tsx`:

````tsx
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
````

**Thay toàn bộ** `src/components/GameCanvas.tsx`:

````tsx
// src/components/GameCanvas.tsx
import { useEffect, useRef } from "react";
import { auth } from "../lib/firebase";
import { GAME_AUTH_OFF, GAME_SERVER_URL } from "../lib/gameServer";
import { TILE, VIEW_W } from "../lib/constants";
import type { SlotInfo } from "../lib/types";
import { attachInput } from "../game/input";
import { getLevel, nextLevelId } from "../game/level";
import { decodeObjView } from "../game/objects";
import type { Snapshot } from "../game/protocol";
import { ProgressTracker, type Progress } from "../game/progress";
import { drawFrame, drawMessage, type DrawPlayer } from "../game/renderer";
import { playSound, preloadSounds } from "../lib/sound";
import { connectGame, type GameStatus } from "../net/gameSocket";
import { SnapshotBuffer } from "../net/interpolate";
import { NetStats } from "../net/netStats";

interface Props {
  roomId: string;
  levelId: string;
  slots: Record<string, SlotInfo>;
  mySlot: string | null;
  /** Báo tiến độ (level / phần / thắng) mỗi khi đổi — cho thanh thời gian, khung tư liệu, poster kết. */
  onProgress?: (p: Progress) => void;
}

const INTERP_DELAY_MS = 50;

function statusText(status: GameStatus, detail: string): string {
  if (status === "connecting") return "Đang kết nối máy chủ…";
  if (status === "reconnecting") return "Mất kết nối — đang kết nối lại…";
  if (status === "error") {
    if (detail === "replaced") return "Bạn đã mở phòng này ở tab khác";
    if (detail === "not-in-room") return "Bạn chưa có chỗ trong phòng này — quay lại sảnh";
    if (detail === "auth") return "Phiên đăng nhập lỗi — tải lại trang";
    return "Không vào được phòng chơi — tải lại trang";
  }
  return "";
}

export default function GameCanvas({ roomId, levelId, slots, mySlot, onProgress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotsRef = useRef(slots);
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    slotsRef.current = slots;
    onProgressRef.current = onProgress;
  });
  const level = getLevel(levelId);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const W = VIEW_W;
    const H = getLevel(levelId).h * TILE;

    if (!mySlot) {
      drawMessage(ctx, W, H, "Chưa có chỗ trong phòng");
      return;
    }

    const buffer = new SnapshotBuffer(INTERP_DELAY_MS);
    const stats = new NetStats();
    const showNet = new URLSearchParams(window.location.search).has("net");
    let snap: Snapshot | null = null;
    let status: GameStatus = "connecting";
    let detail = "";
    let pingMs = 0;
    let lastD = 0;
    let loseStart = 0;
    let lastJump: number | null = null;
    const progress = new ProgressTracker();

    preloadSounds();

    const conn = connectGame({
      url: GAME_SERVER_URL,
      roomId,
      getIdToken: async () => {
        if (GAME_AUTH_OFF) return "";
        const u = auth.currentUser;
        if (!u) throw new Error("chưa đăng nhập");
        return u.getIdToken();
      },
      extraJoin: GAME_AUTH_OFF
        ? { slot: mySlot, name: slotsRef.current[mySlot]?.name ?? mySlot, levelId }
        : undefined,
      onSnap: (s) => {
        stats.countRecv();
        snap = s;
        buffer.push(s, performance.now());
      },
      onStatus: (s, d) => {
        status = s;
        detail = d ?? "";
      },
    });

    const offInput = attachInput((i) => conn.sendInput(i));

    const pinger = showNet
      ? window.setInterval(() => {
          conn.ping().then(
            (ms) => (pingMs = ms),
            () => (pingMs = -1),
          );
        }, 2000)
      : null;

    let raf = 0;
    const frame = (now: number) => {
      const cur = snap;
      if (!cur) {
        drawMessage(ctx, W, H, statusText(status, detail) || "Đang chờ dữ liệu…");
      } else {
        const frameLevel = getLevel(cur.lv);
        const sorted = Object.keys(cur.p).sort();
        const interp = buffer.positions(now);

        const players: DrawPlayer[] = sorted.map((slot) => {
          const [x, y] = interp[slot] ?? [cur.p[slot][0] / 100, cur.p[slot][1] / 100];
          const info = slotsRef.current[slot];
          return { slot, x, y, name: info?.name ?? slot, avatar: info?.avatar };
        });

        // "Thua": phát tiếng đúng lúc chuyển sang trạng thái thua
        const d = cur.d;
        if (d === 1 && lastD === 0) {
          playSound("restart");
          loseStart = now;
        }
        lastD = d;
        const loseSlot = d === 1 ? sorted[cur.c] : undefined;

        // tiếng nhảy: chỉ của chính mình, khi số lần nhảy thật sự (server đếm) tăng
        const n = cur.j[mySlot];
        if (n !== undefined) {
          if (lastJump !== null && n > lastJump) playSound("jump");
          lastJump = n;
        }

        const view = decodeObjView(cur.o);
        const isLast = nextLevelId(frameLevel.id) === null;
        drawFrame(ctx, frameLevel, {
          players,
          hasKey: cur.k === 1,
          won: cur.w === 1,
          lose: loseSlot ? { slot: loseSlot, t: Math.max(0, (now - loseStart) / 1000) } : null,
          levelName: frameLevel.name,
          isLastLevel: isLast,
          view,
          bodies: buffer.bodies(now),
          time: now / 1000,
        });

        // tiến độ ra React: chỉ khi đổi (level, phần, thắng)
        const pr = progress.update(frameLevel, view?.cp ?? 0, cur.w === 1);
        if (pr) onProgressRef.current?.(pr);

        if (status !== "playing") {
          ctx.fillStyle = "rgba(255, 214, 0, 0.95)";
          ctx.fillRect(0, 0, W, 22);
          ctx.fillStyle = "#212121";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(statusText(status, detail), W / 2, 16);
        }

        if (showNet) {
          const sm = stats.summary(now);
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.fillRect(8, H - 28, 330, 22);
          ctx.fillStyle = "#FFEB3B";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "left";
          ctx.fillText(`ping ${pingMs < 0 ? "?" : Math.round(pingMs)}ms · nhận ${sm.recvPerSec}/s · ${status}`, 14, H - 13);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      offInput();
      if (pinger !== null) clearInterval(pinger);
      conn.close();
    };
  }, [roomId, levelId, mySlot]);

  return (
    <div className="canvas-wrap">
      <canvas ref={canvasRef} width={VIEW_W} height={level.h * TILE} />
    </div>
  );
}
````

**Thay toàn bộ** `src/net/gameSocket.ts`:

````ts
// src/net/gameSocket.ts
import { io, type Socket } from "socket.io-client";
import type { InputState, Snapshot } from "../game/protocol";
import { decodeSnapshot } from "./codec";

export type GameStatus = "connecting" | "playing" | "reconnecting" | "error";

export interface ConnectOptions {
  url: string;
  roomId: string;
  getIdToken: () => Promise<string>;
  /** Chỉ dev (server AUTH_DISABLED=1): gửi kèm { slot, name, levelId }. */
  extraJoin?: Record<string, unknown>;
  onSnap: (s: Snapshot) => void;
  onStatus: (s: GameStatus, detail?: string) => void;
}

export interface GameConnection {
  sendInput(i: InputState): void;
  /** Độ trễ vòng đi-về tới server (ms). Reject nếu quá 2 giây. */
  ping(): Promise<number>;
  close(): void;
}

export function connectGame(opts: ConnectOptions): GameConnection {
  const socket: Socket = io(opts.url, {
    transports: ["websocket"], // không long-polling: ổn định hơn qua Cloudflare Tunnel
    reconnection: true,
    reconnectionDelay: 300,
    reconnectionDelayMax: 3000,
  });
  let seq = 0;
  let closed = false;

  async function join(): Promise<void> {
    let idToken: string;
    try {
      idToken = await opts.getIdToken();
    } catch {
      if (!closed) opts.onStatus("error", "auth");
      return;
    }
    socket.emit("join", { roomId: opts.roomId, idToken, ...opts.extraJoin }, (res: { ok: boolean; error?: string }) => {
      if (closed) return;
      if (res.ok) opts.onStatus("playing");
      else opts.onStatus("error", res.error);
    });
  }

  socket.on("connect", () => void join());
  socket.on("connect_error", () => {
    if (!closed) opts.onStatus("reconnecting");
  });
  socket.on("disconnect", (reason) => {
    if (closed) return;
    // "io server disconnect" = server chủ động ngắt (bạn mở phòng này ở tab khác) → không tự nối lại
    if (reason === "io server disconnect") opts.onStatus("error", "replaced");
    else opts.onStatus("reconnecting");
  });
  socket.on("snap", (raw: string) => {
    const s = decodeSnapshot(raw);
    if (s) opts.onSnap(s);
  });

  return {
    sendInput(i) {
      socket.emit("in", { ...i, q: ++seq });
    },
    ping() {
      return new Promise<number>((resolve, reject) => {
        const t0 = performance.now();
        socket.timeout(2000).emit("echo", (err: Error | null) => {
          if (err) reject(err);
          else resolve(performance.now() - t0);
        });
      });
    },
    close() {
      closed = true;
      socket.disconnect();
    },
  };
}
````

**Thay toàn bộ** `src/components/TouchControls.tsx`:

````tsx
// src/components/TouchControls.tsx
// Nút cảm ứng cho điện thoại. Bấm/thả nút = phát sự kiện bàn phím giả (ArrowLeft/Right/Up)
// nên mọi chỗ đang nghe bàn phím (attachInput) hoạt động y hệt, không cần sửa logic game.
import { useEffect, useState, type PointerEvent } from "react";

function sendKey(type: "keydown" | "keyup", code: string): void {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
}

function HoldButton({ code, label, wide }: { code: string; label: string; wide?: boolean }) {
  const down = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId); // ngón tay trượt ra ngoài nút vẫn giữ phím
    sendKey("keydown", code);
  };
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    sendKey("keyup", code);
  };
  return (
    <button
      type="button"
      className={`touch-btn${wide ? " wide" : ""}`}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

/** Chỉ hiện trên thiết bị cảm ứng (hoặc khi URL có ?touch=1 để thử trên máy tính). */
export default function TouchControls() {
  const [enabled, setEnabled] = useState(
    () =>
      new URLSearchParams(window.location.search).has("touch") ||
      window.matchMedia("(pointer: coarse)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const onChange = () => setEnabled(mq.matches || new URLSearchParams(window.location.search).has("touch"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!enabled) return null;
  return (
    <div className="touch-controls">
      <div className="touch-group">
        <HoldButton code="ArrowLeft" label="◀" />
        <HoldButton code="ArrowRight" label="▶" />
      </div>
      <HoldButton code="ArrowUp" label="NHẢY" wide />
    </div>
  );
}
````


✅ **Kiểm tra**

Làm liền file 03 rồi mới chạy `tsc` (Admin cũ còn dùng đường dẫn cũ).
