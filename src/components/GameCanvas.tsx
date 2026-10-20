// src/components/GameCanvas.tsx
import { useEffect, useRef } from "react";
import { onValue, ref, set } from "firebase/database";
import { db } from "../lib/firebase";
import { PHYS, TILE, VIEW_W } from "../lib/constants";
import type { SlotInfo } from "../lib/types";
import { GameEngine } from "../game/engine";
import { attachInput } from "../game/input";
import { getLevel } from "../game/level";
import type { InputState, Snapshot } from "../game/protocol";
import { drawFrame, drawMessage, type DrawPlayer } from "../game/renderer";

interface Props {
  roomId: string;
  levelId: string;
  slots: Record<string, SlotInfo>;
  mySlot: string | null; // null = khán giả (admin)
  isHost: boolean;
}

export default function GameCanvas({ roomId, levelId, slots, mySlot, isHost }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // vòng vẽ luôn đọc thông tin tên/ảnh mới nhất mà không phải dựng lại effect
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  });

  const slotKey = Object.keys(slots).sort().join(",");
  const level = getLevel(levelId);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const lv = getLevel(levelId);
    const W = VIEW_W;
    const H = lv.h * TILE;

    const unsubs: Array<() => void> = [];
    const engine = isHost ? new GameEngine(lv, slotKey.split(",").filter(Boolean)) : null;
    let snap: Snapshot | null = null; // snapshot nhận được (client)
    const shown: Record<string, [number, number]> = {}; // vị trí đang hiển thị (đã làm mượt)
    let lastR = -1;

    if (engine) {
      // host: nghe input của người khác
      unsubs.push(
        onValue(ref(db, `rooms/${roomId}/inputs`), (s) => {
          const all = (s.val() ?? {}) as Record<string, Partial<InputState>>;
          for (const [slot, v] of Object.entries(all)) {
            if (slot === mySlot) continue; // input của host áp dụng trực tiếp, không qua DB
            engine.setInput(slot, { l: v.l === 1 ? 1 : 0, r: v.r === 1 ? 1 : 0, j: v.j === 1 ? 1 : 0 });
          }
        }),
      );
      const onKey = (e: KeyboardEvent) => {
        if (e.code === "KeyR" && engine.won) engine.restart();
      };
      window.addEventListener("keydown", onKey);
      unsubs.push(() => window.removeEventListener("keydown", onKey));
    } else {
      // client / admin: nghe snapshot của host
      unsubs.push(
        onValue(ref(db, `rooms/${roomId}/state`), (s) => {
          snap = s.val() as Snapshot | null;
        }),
      );
    }

    if (mySlot) {
      unsubs.push(
        attachInput((i) => {
          if (engine) engine.setInput(mySlot, i);
          else void set(ref(db, `rooms/${roomId}/inputs/${mySlot}`), i).catch(console.error);
        }),
      );
    }

    let raf = 0;
    let last = performance.now();
    let sentTick = 0;

    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      let cur: Snapshot | null;
      if (engine) {
        engine.update(dt);
        cur = engine.snapshot();
        if (engine.tick - sentTick >= PHYS.snapshotEvery) {
          sentTick = engine.tick;
          void set(ref(db, `rooms/${roomId}/state`), cur).catch(console.error);
        }
      } else {
        cur = snap;
      }

      if (!cur) {
        drawMessage(ctx, W, H, "Đang chờ host…");
      } else {
        const players: DrawPlayer[] = [];
        for (const [slot, pos] of Object.entries(cur.p ?? {})) {
          const tx = pos[0] / 100;
          const ty = pos[1] / 100;
          const prev = shown[slot];
          if (!prev || engine || cur.r !== lastR) {
            shown[slot] = [tx, ty]; // host / vừa reset / mới xuất hiện: đặt thẳng
          } else {
            shown[slot] = [prev[0] + (tx - prev[0]) * 0.35, prev[1] + (ty - prev[1]) * 0.35];
          }
          const info = slotsRef.current[slot];
          players.push({ slot, x: shown[slot][0], y: shown[slot][1], name: info?.name ?? slot, avatar: info?.avatar });
        }
        lastR = cur.r;
        drawFrame(ctx, lv, { players, hasKey: cur.k === 1, won: cur.w === 1 });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      unsubs.forEach((u) => u());
    };
  }, [roomId, levelId, mySlot, isHost, slotKey]);

  return <canvas ref={canvasRef} width={VIEW_W} height={level.h * TILE} />;
}
