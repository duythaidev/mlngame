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
            <span>MÁY MÔ PHỎNG VẬT LÝ DÂY THỪNG · {n} NGƯỜI CHƠI LOCAL</span>
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
