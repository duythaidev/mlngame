// src/components/GameCanvas.tsx
import { useEffect, useRef } from "react";
import { onValue, ref, set } from "firebase/database";
import { db } from "../lib/firebase";
import { TILE, VIEW_W } from "../lib/constants";
import type { SlotInfo } from "../lib/types";
import { GameEngine } from "../game/engine";
import { attachInput } from "../game/input";
import { getLevel, LEVEL_IDS, nextLevelId } from "../game/level";
import { drawFrame, drawMessage, type DrawPlayer } from "../game/renderer";
import { playSound, preloadSounds } from "../lib/sound";
import { changeKeyPos, decodePos, encodePos, POS_FLAG } from "../net/posCodec";
import { RemoteTrack } from "../net/interpolate";
import { StateSender } from "../net/stateSender";
import { NetStats } from "../net/netStats";
import { dispatchGameEvent, getServerTime, initServerTimeOffset } from "../net/gameSync";
import type { GameState } from "../net/gameState";

interface Props {
  roomId: string;
  levelId: string;
  slots: Record<string, SlotInfo>;
  mySlot: string | null; // null = khán giả (admin)
  isHost?: boolean;
  isCoordinator?: boolean;
}

export default function GameCanvas({
  roomId,
  levelId,
  slots,
  mySlot,
  isHost,
  isCoordinator: isCoordProp,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  });

  const slotKeys = Object.keys(slots).sort();
  const slotKeyStr = slotKeys.join(",");
  const isCoordinator = isCoordProp ?? isHost ?? (mySlot !== null && slotKeys[0] === mySlot);
  const level = getLevel(levelId);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const W = VIEW_W;
    const H = level.h * TILE;

    const unsubs: Array<() => void> = [];
    const stats = new NetStats();
    const showNetStats = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("net");

    void initServerTimeOffset();

    const sortedSlots = slotKeyStr.split(",").filter(Boolean);
    const tracks = new Map<string, RemoteTrack>();
    for (const s of sortedSlots) {
      if (s !== mySlot) tracks.set(s, new RemoteTrack(80));
    }

    let currentGame: GameState | null = null;
    let currentLvId = levelId;
    let currentEpoch = 1;
    let wonReportedForLv: string | null = null;
    let lastGameStatus: string = "play";

    const engine = new GameEngine(getLevel(levelId), sortedSlots, {
      localSlots: mySlot ? [mySlot] : [],
      onDied: (slot) => {
        if (currentGame && currentGame.status === "play") {
          void dispatchGameEvent(roomId, { type: "died", slot, epoch: currentGame.epoch });
        }
      },
      onGotKey: () => {
        if (currentGame && currentGame.status === "play" && currentGame.key === 0) {
          void dispatchGameEvent(roomId, { type: "gotKey", epoch: currentGame.epoch });
        }
      },
    });

    const sender = mySlot
      ? new StateSender(
          async (payload) => {
            stats.countSend();
            await set(ref(db, `rooms/${roomId}/pos/${mySlot}`), payload);
          },
          { minIntervalMs: 50, heartbeatMs: 1000, maxInFlight: 3 },
        )
      : null;

    // 1. Nghe rooms/{roomId}/game
    unsubs.push(
      onValue(ref(db, `rooms/${roomId}/game`), (snap) => {
        const g = snap.val() as GameState | null;
        if (!g) {
          currentGame = null;
          return;
        }

        // Đổi level
        if (g.lv && g.lv !== currentLvId) {
          currentLvId = g.lv;
          engine.setLevel(getLevel(g.lv));
        }

        // Đổi epoch (restart, qua level mới, v.v.)
        if (g.epoch !== currentEpoch) {
          currentEpoch = g.epoch;
          engine.respawn(sortedSlots);
          for (const track of tracks.values()) track.reset();
        }

        // Chìa khóa
        engine.setKey(g.key === 1);

        // Âm thanh thua (phát cho mọi máy khi chuyển sang lose)
        if (g.status === "lose" && lastGameStatus !== "lose") {
          playSound("restart");
        }
        lastGameStatus = g.status;

        // Báo kết quả hoàn thành cho admin (điều phối viên ghi 1 lần)
        if (isCoordinator && g.status === "won" && wonReportedForLv !== g.lv) {
          wonReportedForLv = g.lv;
          const secs = Math.round(((g.at - g.levelStart) / 1000) * 10) / 10;
          void set(ref(db, `roomList/${roomId}/results/${g.lv}`), secs).catch(console.error);
        }

        currentGame = g;
      }),
    );

    // 2. Nghe rooms/{roomId}/pos cho các slot khác
    unsubs.push(
      onValue(ref(db, `rooms/${roomId}/pos`), (snap) => {
        stats.countRecv();
        const all = (snap.val() ?? {}) as Record<string, unknown>;
        const now = performance.now();
        for (const [slot, raw] of Object.entries(all)) {
          if (slot === mySlot) continue;
          const decoded = decodePos(raw);
          if (!decoded) continue;

          let track = tracks.get(slot);
          if (!track) {
            track = new RemoteTrack(80);
            tracks.set(slot, track);
          }
          track.push(
            {
              ms: decoded.ms,
              epoch: decoded.epoch,
              x: decoded.x / 100,
              y: decoded.y / 100,
              vx: decoded.vx / 100,
              vy: decoded.vy / 100,
              flags: decoded.flags,
            },
            now,
          );
        }
      }),
    );

    // 3. Phím bấm điều khiển nhân vật local
    if (mySlot) {
      unsubs.push(
        attachInput((i) => {
          engine.setInput(mySlot, i);
        }),
      );
    }

    // 4. Bấm R khi hoàn thành để chơi lại
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyR" || !currentGame || currentGame.status !== "won") return;
      const isLast = nextLevelId(currentGame.lv) === null;
      if (isLast) {
        void dispatchGameEvent(roomId, { type: "replay", epoch: currentGame.epoch, lv: LEVEL_IDS[0] });
      } else {
        void dispatchGameEvent(roomId, { type: "replay", epoch: currentGame.epoch });
      }
    };
    window.addEventListener("keydown", onKey);
    unsubs.push(() => window.removeEventListener("keydown", onKey));

    preloadSounds();
    let raf = 0;
    let last = performance.now();
    let lastJumpCount = 0;

    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const nowServer = getServerTime();

      // Cập nhật vị trí remote vào engine
      for (const [slot, track] of tracks.entries()) {
        const sample = track.sample(now);
        if (sample) {
          engine.setRemote(slot, sample.x, sample.y, sample.vx, sample.vy);
        }
      }

      // Cập nhật vật lý
      if (currentGame?.status === "play") {
        engine.update(dt);
      } else {
        engine.freeze();
      }

      // Âm thanh nhảy: chỉ phát cho máy mình khi số lần nhảy tăng
      if (mySlot) {
        const jCount = engine.jumps[mySlot] ?? 0;
        if (jCount > lastJumpCount) {
          playSound("jump");
          lastJumpCount = jCount;
        }
      }

      // Gửi vị trí local lên Firebase
      if (mySlot && sender) {
        const local = engine.getLocalPos(mySlot);
        if (local) {
          const flags =
            (local.grounded ? POS_FLAG.GROUNDED : 0) |
            (local.inDoor ? POS_FLAG.IN_DOOR : 0) |
            (currentGame?.status === "lose" ? POS_FLAG.FROZEN : 0);

          const posMsg = {
            ms: now,
            epoch: currentGame?.epoch ?? 1,
            x: local.x,
            y: local.y,
            vx: local.vx,
            vy: local.vy,
            flags,
          };
          sender.offer(encodePos(posMsg), changeKeyPos(posMsg), now);
        }
      }

      // Logic điều phối viên và fallback cho mọi máy
      if (currentGame) {
        // Kiểm tra cả nhóm vào cửa
        if (currentGame.status === "play" && currentGame.key === 1 && sortedSlots.length > 0) {
          let allInside = true;
          for (const slot of sortedSlots) {
            if (slot === mySlot) {
              const local = engine.getLocalPos(slot);
              if (!local?.inDoor) allInside = false;
            } else {
              const s = tracks.get(slot)?.sample(now);
              if (!s || (s.flags & POS_FLAG.IN_DOOR) === 0) allInside = false;
            }
          }
          if (allInside && isCoordinator) {
            void dispatchGameEvent(roomId, { type: "allInDoor", epoch: currentGame.epoch });
          }
        }

        // Restart sau 1 giây thua
        if (currentGame.status === "lose") {
          const elapsed = nowServer - currentGame.at;
          if (isCoordinator && elapsed >= 1000) {
            void dispatchGameEvent(roomId, { type: "restart", epoch: currentGame.epoch });
          } else if (!isCoordinator && elapsed >= 2500) {
            // Fallback khi điều phối viên ẩn tab / rớt mạng
            void dispatchGameEvent(roomId, { type: "restart", epoch: currentGame.epoch });
          }
        }

        // Tự qua màn sau 3 giây thắng
        if (currentGame.status === "won") {
          const elapsed = nowServer - currentGame.at;
          const next = nextLevelId(currentGame.lv);
          if (next) {
            if (isCoordinator && elapsed >= 3000) {
              void dispatchGameEvent(roomId, { type: "nextLevel", epoch: currentGame.epoch, nextLv: next });
            } else if (!isCoordinator && elapsed >= 4500) {
              // Fallback
              void dispatchGameEvent(roomId, { type: "nextLevel", epoch: currentGame.epoch, nextLv: next });
            }
          }
        }
      }

      // Vẽ khung hình
      if (!currentGame) {
        drawMessage(ctx, W, H, "Đang kết nối phòng chơi…");
      } else {
        const frameLevel = getLevel(currentGame.lv ?? levelId);
        const players: DrawPlayer[] = [];
        const snap = engine.snapshot();

        for (const slot of sortedSlots) {
          const info = slotsRef.current[slot];
          let x: number;
          let y: number;

          if (slot === mySlot) {
            // Máy mình: lấy thẳng từ engine (0 trễ)
            const p = snap.p[slot] ?? [level.spawn.x * 100, level.spawn.y * 100];
            x = p[0] / 100;
            y = p[1] / 100;
          } else {
            // Máy người khác: nội suy mượt từ RemoteTrack
            const sampled = tracks.get(slot)?.sample(now);
            if (sampled) {
              x = sampled.x;
              y = sampled.y;
            } else {
              const p = snap.p[slot] ?? [level.spawn.x * 100, level.spawn.y * 100];
              x = p[0] / 100;
              y = p[1] / 100;
            }
          }
          players.push({ slot, x, y, name: info?.name ?? slot, avatar: info?.avatar });
        }

        const loseT =
          currentGame.status === "lose" ? Math.max(0, (nowServer - currentGame.at) / 1000) : 0;
        const loseSlot =
          currentGame.status === "lose" ? currentGame.loseBy ?? sortedSlots[0] : undefined;

        drawFrame(ctx, frameLevel, {
          players,
          hasKey: currentGame.key === 1,
          won: currentGame.status === "won",
          lose: loseSlot ? { slot: loseSlot, t: loseT } : null,
          levelName: frameLevel.name,
          isLastLevel: nextLevelId(frameLevel.id) === null,
        });

        if (showNetStats) {
          const sm = stats.summary(now);
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.fillRect(8, H - 28, 380, 22);
          ctx.fillStyle = "#FFEB3B";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "left";
          ctx.fillText(
            `gửi ${sm.sendPerSec}/s · nhận ${sm.recvPerSec}/s · epoch ${currentGame.epoch}`,
            14,
            H - 13,
          );
        }
      }
    };

    const loop = (now: number) => {
      frame(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      unsubs.forEach((u) => u());
    };
  }, [roomId, levelId, mySlot, slotKeyStr, isCoordinator, level.h]);

  return <canvas ref={canvasRef} width={VIEW_W} height={level.h * TILE} />;
}
