# 05 · Bố cục trang chơi `GameStage` (repo `mlngame`)

Thanh thời gian ở trên · canvas 800×512 có viền theo thời kỳ · khung tư liệu 296 px bên phải (dưới 960 px chuyển xuống dưới canvas) · thẻ mở level phủ canvas 2 giây · poster kết phủ canvas khi thắng Level 5.
Canvas báo tiến độ ra React qua `onProgress` (chỉ khi đổi level / phần / thắng) — UI theo level **thật** trong snapshot (server tự sang level kế), không theo prop.

## Bước 1 — Component mới

**Tạo mới** `src/components/GameStage.tsx`:

````tsx
// src/components/GameStage.tsx
// Bố cục trang chơi bản 5 (spec B1): thanh thời gian ở trên · canvas + khung tư liệu bên phải
// (dưới 960 px: khung tư liệu xuống dưới canvas) · thẻ mở level phủ canvas · poster kết.
import { useEffect, useState, type ReactNode } from "react";
import type { Progress } from "../game/progress";
import { eraImage, partImage } from "../game/story";
import { ConclusionPoster } from "./illustrations/ConclusionPoster";
import { EraSplashBanner } from "./illustrations/EraSplashBanner";
import { StoryPolaroidCard } from "./illustrations/StoryPolaroidCard";
import { TimelineRibbon } from "./illustrations/TimelineRibbon";
import "./illustrations/illustrations.css";
import "./game-stage.css";

interface Props {
  progress: Progress;
  children: ReactNode; // khung canvas
  onReplay?: () => void;
  footnote?: string;
}

const NARROW = "(max-width: 959px)";

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

function preload(src: string): void {
  new Image().src = src;
}

export default function GameStage({ progress, children, onReplay, footnote }: Props) {
  const { era, part, won, levelId } = progress;
  const narrow = useNarrow();
  const [splashEra, setSplashEra] = useState(0);
  const [lastEra, setLastEra] = useState(0);

  // vào level mới (kể cả lần đầu) → hiện thẻ mở level; level luyện tập (era 0) thì không
  if (era !== lastEra) {
    setLastEra(era);
    setSplashEra(era);
  }

  // tải trước ảnh phần kế và bìa level kế để khung tư liệu không bị trắng
  useEffect(() => {
    if (era <= 0) return;
    if (part < 4) preload(partImage(levelId, part + 1));
    if (era < 5) preload(eraImage(String(era + 1)));
  }, [era, part, levelId]);

  const ending = won && era === 5;

  return (
    <div className="game-stage" data-era={era > 0 ? era : undefined}>
      {era > 0 && <TimelineRibbon currentEra={era} currentPart={part} won={won} />}
      <div className={`game-stage-row ${narrow ? "is-narrow" : ""}`}>
        <div className="game-stage-canvas">
          {children}
          {splashEra > 0 && <EraSplashBanner key={splashEra} currentEra={splashEra} overlay onDone={() => setSplashEra(0)} />}
          {ending && (
            <div className="game-stage-ending">
              <ConclusionPoster stampsEarned={25} onReplay={onReplay} footnote={footnote} />
            </div>
          )}
        </div>
        {era > 0 && (
          <aside className="game-stage-side">
            <StoryPolaroidCard currentEra={era} currentStep={part + 1} variant={narrow ? "bottom" : "side"} />
          </aside>
        )}
      </div>
    </div>
  );
}
````

**Tạo mới** `src/components/game-stage.css`:

````css
/* src/components/game-stage.css — bố cục trang chơi bản 5 (spec B1), theme sáng */

/* trang chơi rộng hơn .page thường (900 px): canvas 800 + 16 + khung tư liệu 296 + lề */
.page.page-wide {
  max-width: 1180px;
}

.game-stage {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: var(--era-bg, #f4ebd9);
  transition: background-color 600ms ease;
}

.game-stage .ui-block-ribbon {
  --w: 1136px;
}

.game-stage-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.game-stage-row.is-narrow {
  flex-direction: column;
  align-items: stretch;
}

.game-stage-canvas {
  position: relative;
  flex: 1 1 800px;
  max-width: 800px;
  min-width: 0;
  overflow: hidden;
  border: 8px solid var(--stage-frame, #8a5a35);
  border-radius: 6px;
  box-shadow: 0 0 0 2px #231811, 0 6px 0 #231811;
  background: #fff;
}
.game-stage-row.is-narrow .game-stage-canvas {
  max-width: none;
  flex-basis: auto;
}
.game-stage-canvas canvas {
  width: 100%;
  height: auto;
  border: none;
  border-radius: 0;
}

.game-stage-side {
  flex: 0 0 296px;
  width: 296px;
}
.game-stage-side .ui-block-polaroid-wrapper {
  --w: 296px;
  margin: 0;
}
.game-stage-row.is-narrow .game-stage-side {
  flex: none;
  width: 100%;
}

/* viền canvas theo thời kỳ (B1): gỗ · sắt · granite · navy viền vàng · vàng */
.game-stage[data-era="1"] { --stage-frame: #8a5a35; }
.game-stage[data-era="2"] { --stage-frame: #8fa3ad; }
.game-stage[data-era="3"] { --stage-frame: #b9bec2; }
.game-stage[data-era="4"] { --stage-frame: #14305c; }
.game-stage[data-era="5"] { --stage-frame: #e3b23c; }
.game-stage[data-era="1"] .game-stage-canvas { /* đinh tán */
  background-image: radial-gradient(circle, #3e2716 2px, transparent 2.5px);
}
.game-stage[data-era="4"] .game-stage-canvas { box-shadow: 0 0 0 2px #d9a92b, 0 6px 0 #231811; }

/* poster kết phủ khung canvas, cuộn được */
.game-stage-ending {
  position: absolute;
  inset: 0;
  z-index: 25;
  overflow-y: auto;
  padding: 10px;
  background: rgba(255, 248, 232, 0.96);
}
.game-stage-ending .ui-block-conclusion-poster {
  --w: 760px;
}
````

## Bước 2 — Canvas báo tiến độ, bỏ EndingPanel

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
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyR") conn.restart(); // server tự kiểm tra: chỉ ô nhỏ nhất, chỉ khi đã thắng
    };
    window.addEventListener("keydown", onKey);

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
      window.removeEventListener("keydown", onKey);
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

**Xóa** file `src/components/EndingPanel.tsx`.

**Sửa** `src/index.css` — 1 chỗ (mỗi chỗ: tìm đúng đoạn TÌM, thay bằng đoạn THAY):

1. TÌM:

````css
/* ---------- Khung canvas + màn kết (EndingPanel) ---------- */
.canvas-wrap {
  position: relative;
}
.ending-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 40px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--ink);
  text-align: center;
  font-family: var(--font-body);
}
.ending-question {
  margin: 0 0 6px;
  font-size: 16px;
  font-style: italic;
  color: var(--ink-light);
}
.ending-panel h2 {
  margin: 0 0 14px;
  font-family: var(--font-title);
  font-size: 40px;
  color: var(--red-dark);
}
.ending-panel ol {
  max-width: 620px;
  margin: 0;
  padding-left: 22px;
  text-align: left;
  font-size: 15px;
  line-height: 1.6;
}
````

   THAY bằng:

````css
/* ---------- Khung canvas (màn kết nằm trong GameStage) ---------- */
.canvas-wrap {
  position: relative;
}
````

## Bước 3 — Gắn vào 2 trang

**Thay toàn bộ** `src/pages/Sandbox.tsx`:

````tsx
// src/pages/Sandbox.tsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import badgeStar from "../assets/badge-star.svg";
import { GameEngine } from "../game/engine";
import GameStage from "../components/GameStage";
import { attachInput, KEYS_ARROWS, KEYS_WASD, type KeyMap } from "../game/input";
import { getLevel, LEVEL_IDS, nextLevelId, TRAINING_IDS } from "../game/level";
import { decodeObjView } from "../game/objects";
import { ProgressTracker, START, type Progress } from "../game/progress";
import { drawFrame } from "../game/renderer";
import { PHYS, TILE, VIEW_W } from "../lib/constants";
import { playSound, preloadSounds } from "../lib/sound";

// người 3–5 trên cùng bàn phím: I J L · T F H · 8 4 6 (bàn phím số)
const EXTRA_KEYS: KeyMap[] = [
  { left: ["KeyJ"], right: ["KeyL"], jump: ["KeyI"] },
  { left: ["KeyF"], right: ["KeyH"], jump: ["KeyT"] },
  { left: ["Numpad4"], right: ["Numpad6"], jump: ["Numpad8"] },
];

export default function Sandbox() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const level = getLevel("1");
  const [progress, setProgress] = useState<Progress>(START);
  const engineRef = useRef<GameEngine | null>(null);
  // ?n=3 → 3 người (2–5)
  const n = Math.max(2, Math.min(5, Number(new URLSearchParams(window.location.search).get("n")) || 2));

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const slots = Array.from({ length: n }, (_, i) => `s${i}`);
    const engine = new GameEngine(level, slots);
    engineRef.current = engine;
    const maps = [KEYS_WASD, KEYS_ARROWS, ...EXTRA_KEYS];
    const offs = slots.map((s, i) => attachInput((inp) => engine.setInput(s, inp), maps[i]));
    const tracker = new ProgressTracker();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyR") engine.restart();
      if (e.code === "KeyP") engine.respawnAtCheckpoint(); // về cột mốc gần nhất (thử lại một đoạn)
      const d = /^Digit([1-9])$/.exec(e.code)?.[1]; // phím 1..5: chọn chương để thử
      if (d && LEVEL_IDS.includes(d)) engine.setLevel(getLevel(d));
      if (e.code === "Digit0") engine.setLevel(getLevel(TRAINING_IDS[0])); // 0: level luyện tập
    };
    preloadSounds();
    let lastD = 0;
    let loseStart = 0;
    let winSince: number | null = null;
    const lastJump: Record<string, number> = {};
    window.addEventListener("keydown", onKey);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      engine.update((now - last) / 1000);
      last = now;
      if (engine.won) {
        winSince ??= now;
        const next = nextLevelId(engine.levelId);
        if (next && now - winSince >= PHYS.winDelay * 1000) {
          engine.setLevel(getLevel(next));
          winSince = null;
        }
      } else {
        winSince = null;
      }
      const snap = engine.snapshot();
      const lv = getLevel(snap.lv);
      const sorted = Object.keys(snap.p).sort();
      if (snap.d === 1 && lastD === 0) {
        playSound("restart");
        loseStart = now;
      }
      lastD = snap.d;
      for (const [slot, n] of Object.entries(snap.j)) {
        if (slot in lastJump && n > lastJump[slot]) playSound("jump"); // sandbox: nghe cả hai người chơi local
        lastJump[slot] = n;
      }
      const players = Object.entries(snap.p).map(([slot, [x, y]]) => ({ slot, x: x / 100, y: y / 100, name: slot }));
      const view = decodeObjView(snap.o);
      const isLast = nextLevelId(lv.id) === null;
      drawFrame(ctx, lv, {
        players,
        hasKey: snap.k === 1,
        won: snap.w === 1,
        lose: snap.d === 1 ? { slot: sorted[snap.c], t: engine.lose?.t ?? (now - loseStart) / 1000 } : null,
        levelName: lv.name,
        isLastLevel: isLast,
        view,
        time: now / 1000,
      });
      const pr = tracker.update(lv, view?.cp ?? 0, snap.w === 1);
      if (pr) setProgress(pr);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      offs.forEach((off) => off());
      window.removeEventListener("keydown", onKey);
    };
  }, [level, n]);

  return (
    <div className="page page-wide">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>
          <img src={badgeStar} alt="Star" style={{ width: 28, height: 28 }} />
          Chế Độ Luyện Tập (Offline Sandbox)
        </h1>
        <Link to="/" className="btn ghost sm">← Về Trang Chủ</Link>
      </div>

      <div className="arcade-shell">
        <div className="arcade-bezel-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={badgeStar} alt="Star" style={{ width: 16, height: 16 }} />
            <span>MÁY MÔ PHỎNG VẬT LÝ DÂY THỪNG · {n} NGƯỜI CHƠI LOCAL (?n=2..5)</span>
          </div>
          <div className="arcade-bezel-lights">
            <span className="red" />
            <span className="yellow" />
            <span className="green" />
          </div>
        </div>

        <GameStage progress={progress} onReplay={() => engineRef.current?.setLevel(getLevel(LEVEL_IDS[0]))}>
          <div className="canvas-wrap">
            <canvas ref={canvasRef} width={VIEW_W} height={level.h * TILE} />
          </div>
        </GameStage>

        <div className="arcade-controls-guide">
          <div>
            <strong>Người chơi 1 (s0):</strong> <span className="key-pill">W</span> <span className="key-pill">A</span> <span className="key-pill">D</span>
          </div>
          <div>
            <strong>Người chơi 2 (s1):</strong> <span className="key-pill">↑</span> <span className="key-pill">←</span> <span className="key-pill">→</span>
          </div>
          <div>
            <strong>Chơi lại:</strong> Bấm phím <span className="key-pill">R</span>
          </div>
          {n >= 3 && (
            <div>
              <strong>Người 3–5:</strong> <span className="key-pill">I J L</span> <span className="key-pill">T F H</span> <span className="key-pill">8 4 6</span>
            </div>
          )}
          <div>
            <strong>Chọn chương:</strong> Bấm <span className="key-pill">1</span>…<span className="key-pill">5</span> · <span className="key-pill">0</span> luyện tập · <span className="key-pill">P</span> về cột mốc
          </div>
        </div>
      </div>
    </div>
  );
}
````

**Sửa** `src/pages/Room.tsx` — 4 chỗ (mỗi chỗ: tìm đúng đoạn TÌM, thay bằng đoạn THAY):

1. TÌM:

````tsx
import GameCanvas from "../components/GameCanvas";
````

   THAY bằng:

````tsx
import GameCanvas from "../components/GameCanvas";
import GameStage from "../components/GameStage";
import { START, type Progress } from "../game/progress";
````

2. TÌM:

````tsx
  const [joinTrigger, setJoinTrigger] = useState(0);
````

   THAY bằng:

````tsx
  const [joinTrigger, setJoinTrigger] = useState(0);
  const [progress, setProgress] = useState<Progress>(START);
````

3. TÌM:

````tsx
  return (
    <div className="page">
      {/* Top Header */}
````

   THAY bằng:

````tsx
  return (
    <div className={m.phase === "playing" ? "page page-wide" : "page"}>
      {/* Top Header */}
````

4. TÌM:

````tsx
            <GameCanvas roomId={id} levelId={m.level} slots={slots} mySlot={mySlot} />
````

   THAY bằng:

````tsx
            <GameStage progress={progress} footnote={isHost ? "Bấm R để cả phòng chơi lại" : "Chờ chủ phòng bấm R để chơi lại"}>
              <GameCanvas roomId={id} levelId={m.level} slots={slots} mySlot={mySlot} onProgress={setProgress} />
            </GameStage>
````

Phòng online không có nút "Chơi lại" trên poster (server chỉ nhận phím R của chủ phòng) — poster ghi dòng nhắc. Sandbox có nút "Chơi lại từ Level 1".

✅ **Kiểm tra**

Làm xong file 06 rồi mới chạy được (renderer còn import `storyTracker`). Danh sách thử tay ở file 08.
