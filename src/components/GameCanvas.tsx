// src/components/GameCanvas.tsx
import { useEffect, useRef } from "react";
import { onValue, ref, set } from "firebase/database";
import { db } from "../lib/firebase";
import { PHYS, TILE, VIEW_W } from "../lib/constants";
import type { SlotInfo } from "../lib/types";
import { GameEngine } from "../game/engine";
import { attachInput } from "../game/input";
import { getLevel, LEVEL_IDS, nextLevelId } from "../game/level";
import { EMPTY_INPUT, type InputState, type Snapshot } from "../game/protocol";
import { drawFrame, drawMessage, type DrawPlayer } from "../game/renderer";
import { playSound, preloadSounds } from "../lib/sound";
import { changeKey, decodeSnapshot, encodeSnapshot } from "../net/codec";
import { extrapolate } from "../net/extrapolate";
import { NetStats } from "../net/netStats";
import { predictSelf } from "../net/selfPredict";
import { StateSender } from "../net/stateSender";

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
    const stats = new NetStats();
    const showNetStats = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("net");
    const engine = isHost ? new GameEngine(lv, slotKey.split(",").filter(Boolean)) : null;
    const sender = engine
      ? new StateSender(async (p) => {
          stats.countSend();
          await set(ref(db, `rooms/${roomId}/state`), p);
        })
      : null;
    let snap: Snapshot | null = null; // snapshot nhận được (client)
    let isOutdated = false;
    const shown: Record<string, [number, number]> = {}; // vị trí đang hiển thị (đã làm mượt)
    let lastR = -1;

    let receivedAt = performance.now();
    if (engine) {
      // host: nghe input của người khác
      unsubs.push(
        onValue(ref(db, `rooms/${roomId}/inputs`), (s) => {
          const all = (s.val() ?? {}) as Record<string, Partial<InputState & { q?: number }>>;
          for (const [slot, v] of Object.entries(all)) {
            if (slot === mySlot) continue; // input của host áp dụng trực tiếp, không qua DB
            engine.setInput(
              slot,
              { l: v.l === 1 ? 1 : 0, r: v.r === 1 ? 1 : 0, j: v.j === 1 ? 1 : 0 },
              typeof v.q === "number" ? v.q : undefined,
            );
          }
        }),
      );
      const onKey = (e: KeyboardEvent) => {
        if (e.code !== "KeyR" || !engine.won) return;
        if (nextLevelId(engine.levelId)) engine.restart();
        else engine.setLevel(getLevel(LEVEL_IDS[0])); // hết level cuối: chơi lại từ Level 1
      };
      window.addEventListener("keydown", onKey);
      unsubs.push(() => window.removeEventListener("keydown", onKey));
    } else {
      // client / admin: nghe snapshot của host
      unsubs.push(
        onValue(ref(db, `rooms/${roomId}/state`), (s) => {
          stats.countRecv();
          receivedAt = performance.now();
          const raw = s.val();
          if (raw !== null && raw !== undefined) {
            const decoded = decodeSnapshot(raw);
            if (!decoded) {
              isOutdated = true;
              snap = null;
            } else {
              isOutdated = false;
              snap = decoded;
              if (snap.a && mySlot && typeof snap.a[mySlot] === "number") {
                stats.markAcked(snap.a[mySlot], performance.now());
              }
            }
          } else {
            snap = null;
          }
        }),
      );
    }

    let seq = 0;
    let myInput: InputState = EMPTY_INPUT; // phím mình đang giữ (để dự đoán nhân vật của mình)
    let jumpSeq = 0; // seq của lần bấm nhảy gần nhất
    if (mySlot) {
      unsubs.push(
        attachInput((i) => {
          if (engine) {
            engine.setInput(mySlot, i);
          } else {
            seq++;
            if (i.j === 1 && myInput.j === 0) jumpSeq = seq;
            myInput = i;
            stats.markSent(seq, performance.now());
            stats.countSend();
            void set(ref(db, `rooms/${roomId}/inputs/${mySlot}`), { ...i, q: seq }).catch(console.error);
          }
        }),
      );
    }

    let isHidden = false;
    let hiddenInterval: number | null = null;
    if (engine) {
      const onVisibility = () => {
        isHidden = document.hidden;
        if (isHidden) {
          if (hiddenInterval === null) {
            hiddenInterval = window.setInterval(() => {
              frame(performance.now());
            }, 50);
          }
        } else {
          if (hiddenInterval !== null) {
            clearInterval(hiddenInterval);
            hiddenInterval = null;
          }
        }
      };
      document.addEventListener("visibilitychange", onVisibility);
      unsubs.push(() => {
        document.removeEventListener("visibilitychange", onVisibility);
        if (hiddenInterval !== null) clearInterval(hiddenInterval);
      });
    }

    preloadSounds();
    let raf = 0;
    let last = performance.now();
    let winSince: number | null = null; // host: lúc bắt đầu hiện "hoàn thành" (để tự qua màn)
    let lastD = 0; // trạng thái "Thua" ở frame trước (để phát tiếng đúng 1 lần)
    let loseStart = 0; // client: lúc nhận thấy bắt đầu "Thua" (host dùng engine.lose.t chính xác hơn)
    let lastJump: number | null = null; // số lần nhảy của chính mình ở snapshot trước

    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      let cur: Snapshot | null;
      if (engine && sender) {
        engine.update(dt);
        // tự qua level kế sau winDelay giây (level cuối thì chờ host bấm R)
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
        cur = engine.snapshot();
        if (isHidden) cur.h = 1;
        sender.offer(encodeSnapshot(cur), changeKey(cur), now);
      } else {
        cur = snap;
      }

      if (isOutdated) {
        drawMessage(ctx, W, H, "Phiên bản cũ — tải lại trang (Ctrl+F5)");
      } else if (!cur) {
        drawMessage(ctx, W, H, "Đang chờ host…");
      } else {
        const frameLevel = getLevel(cur.lv ?? levelId);
        const sorted = Object.keys(cur.p ?? {}).sort();
        const d = cur.d ?? 0;
        const ageSec = (now - receivedAt) / 1000;
        const players: DrawPlayer[] = [];
        for (const [slot, pos] of Object.entries(cur.p ?? {})) {
          const px = pos[0] / 100;
          const py = pos[1] / 100;
          const prev = shown[slot];
          if (!prev || engine || cur.r !== lastR || d === 1) {
            shown[slot] = [px, py]; // host / vừa reset / mới xuất hiện / đang Thua: đặt thẳng
          } else if (slot === mySlot) {
            // nhân vật của mình: vẽ ở chỗ host SẼ đặt khi nhận input → bấm là thấy chạy ngay
            const vRaw = cur.v?.[slot] ?? [0, 0];
            const acked = cur.a?.[slot] ?? 0;
            const inputDelay = (stats.summary(now).p50 || 150) / 1000;
            const [targetX, targetY] = predictSelf({
              pos: [px, py],
              vel: [vRaw[0] / 100, vRaw[1] / 100],
              input: myInput,
              jumpPending: jumpSeq > acked,
              lookahead: ageSec + inputDelay,
              level: frameLevel,
            });
            shown[slot] = [prev[0] + (targetX - prev[0]) * 0.5, prev[1] + (targetY - prev[1]) * 0.5];
          } else {
            const vRaw = cur.v?.[slot] ?? [0, 0];
            const vx = vRaw[0] / 100;
            const vy = vRaw[1] / 100;
            const [targetX, targetY] = extrapolate([px, py], [vx, vy], ageSec);
            shown[slot] = [
              prev[0] + (targetX - prev[0]) * 0.6,
              prev[1] + (targetY - prev[1]) * 0.6,
            ];
          }
          const info = slotsRef.current[slot];
          players.push({ slot, x: shown[slot][0], y: shown[slot][1], name: info?.name ?? slot, avatar: info?.avatar });
        }
        lastR = cur.r;

        // "Thua": phát tiếng đúng lúc chuyển sang trạng thái thua; thời gian hoạt ảnh lấy từ engine (host) hoặc đồng hồ cục bộ
        if (d === 1 && lastD === 0) {
          playSound("restart");
          loseStart = now;
        }
        lastD = d;
        const loseT = engine?.lose ? engine.lose.t : (now - loseStart) / 1000;
        const loseSlot = d === 1 ? sorted[cur.c ?? -1] : undefined;

        // tiếng nhảy: chỉ của chính mình, khi số lần nhảy thật sự (engine đếm) tăng
        if (mySlot) {
          const n = cur.j?.[mySlot];
          if (n !== undefined) {
            if (lastJump !== null && n > lastJump) playSound("jump");
            lastJump = n;
          }
        }

        drawFrame(ctx, frameLevel, {
          players,
          hasKey: cur.k === 1,
          won: cur.w === 1,
          lose: loseSlot ? { slot: loseSlot, t: Math.max(0, loseT) } : null,
          levelName: frameLevel.name,
          isLastLevel: nextLevelId(frameLevel.id) === null,
        });

        if (cur.h === 1) {
          ctx.fillStyle = "rgba(255, 214, 0, 0.95)";
          ctx.fillRect(0, 0, W, 22);
          ctx.fillStyle = "#212121";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("⚠ Host đang ẩn tab — trò chơi có thể giật", W / 2, 16);
        }

        if (showNetStats) {
          const sm = stats.summary(now);
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.fillRect(8, H - 28, 380, 22);
          ctx.fillStyle = "#FFEB3B";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "left";
          ctx.fillText(
            `trễ p50 ${sm.p50}ms p95 ${sm.p95}ms · gửi ${sm.sendPerSec}/s · nhận ${sm.recvPerSec}/s`,
            14,
            H - 13,
          );
        }
      }
    };
    // CHỈ vòng rAF này tự lặp lại. frame() không tự đặt lịch, nên khi tab host ẩn (setInterval gọi frame)
    // sẽ không còn xếp hàng hàng trăm rAF rồi bung ra thành nhiều vòng lặp song song khi tab hiện lại.
    const loop = (now: number) => {
      if (!document.hidden) frame(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      unsubs.forEach((u) => u());
    };
  }, [roomId, levelId, mySlot, isHost, slotKey]);

  return <canvas ref={canvasRef} width={VIEW_W} height={level.h * TILE} />;
}
