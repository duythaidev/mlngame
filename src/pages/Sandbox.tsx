// src/pages/Sandbox.tsx
import { useEffect, useRef } from "react";
import { GameEngine } from "../game/engine";
import { attachInput, KEYS_ARROWS, KEYS_WASD } from "../game/input";
import { getLevel } from "../game/level";
import { drawFrame } from "../game/renderer";
import { TILE, VIEW_W } from "../lib/constants";

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
    };
    window.addEventListener("keydown", onKey);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      engine.update((now - last) / 1000);
      last = now;
      const snap = engine.snapshot();
      drawFrame(ctx, level, {
        players: Object.entries(snap.p).map(([slot, [x, y]]) => ({ slot, x: x / 100, y: y / 100, name: slot })),
        hasKey: snap.k === 1,
        won: snap.w === 1,
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
      <h1>Sandbox (offline)</h1>
      <p className="muted">s0: W A D · s1: ← → ↑ · s2 đứng yên · R: chơi lại</p>
      <canvas ref={canvasRef} width={VIEW_W} height={level.h * TILE} />
    </div>
  );
}
