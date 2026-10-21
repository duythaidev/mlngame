// src/pages/Sandbox.tsx
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import badgeStar from "../assets/badge-star.svg";
import { GameEngine } from "../game/engine";
import { attachInput, KEYS_ARROWS, KEYS_WASD } from "../game/input";
import { getLevel, LEVEL_IDS, nextLevelId } from "../game/level";
import { drawFrame } from "../game/renderer";
import { PHYS, TILE, VIEW_W } from "../lib/constants";
import { playSound, preloadSounds } from "../lib/sound";

export default function Sandbox() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const level = getLevel("1");

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const engine = new GameEngine(level, ["s0", "s1"]);
    const off1 = attachInput((i) => engine.setInput("s0", i), KEYS_WASD);
    const off2 = attachInput((i) => engine.setInput("s1", i), KEYS_ARROWS);
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyR") engine.restart();
      const n = /^Digit([1-9])$/.exec(e.code)?.[1]; // phím 1..n: chọn level để thử
      if (n && LEVEL_IDS.includes(n)) engine.setLevel(getLevel(n));
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
      drawFrame(ctx, lv, {
        players: Object.entries(snap.p).map(([slot, [x, y]]) => ({ slot, x: x / 100, y: y / 100, name: slot })),
        hasKey: snap.k === 1,
        won: snap.w === 1,
        lose: snap.d === 1 ? { slot: sorted[snap.c], t: engine.lose?.t ?? (now - loseStart) / 1000 } : null,
        levelName: lv.name,
        isLastLevel: nextLevelId(lv.id) === null,
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      off1();
      off2();
      window.removeEventListener("keydown", onKey);
    };
  }, [level]);

  return (
    <div className="page">
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
            <span>MÁY MÔ PHỎNG VẬT LÝ DÂY THỪNG · 2 NGƯỜI CHƠI LOCAL</span>
          </div>
          <div className="arcade-bezel-lights">
            <span className="red" />
            <span className="yellow" />
            <span className="green" />
          </div>
        </div>

        <canvas ref={canvasRef} width={VIEW_W} height={level.h * TILE} />

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
          <div>
            <strong>Chọn level:</strong> Bấm <span className="key-pill">1</span> <span className="key-pill">2</span> <span className="key-pill">3</span>
          </div>
        </div>
      </div>
    </div>
  );
}
