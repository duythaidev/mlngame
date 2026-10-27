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
        snap = s;
        buffer.push(s, performance.now());
      },
      onStatus: (s, d) => {
        status = s;
        detail = d ?? "";
      },
    });

    const offInput = attachInput((i) => conn.sendInput(i));

    const runPing = () => {
      conn.ping().then(
        (ms) => (pingMs = Math.round(ms)),
        () => (pingMs = -1),
      );
    };
    runPing();
    const pinger = window.setInterval(runPing, 2000);

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
        } else {
          // Huy hiệu ping gọn ở góc dưới trái (chỉ hiện ms)
          const pingText = pingMs > 0 ? `${pingMs}ms` : pingMs < 0 ? "-- ms" : "… ms";
          const dotColor = pingMs <= 0 ? "#888" : pingMs < 60 ? "#4ade80" : pingMs < 120 ? "#facc15" : "#f87171";
          ctx.save();
          ctx.font = "bold 11px monospace";
          const tw = ctx.measureText(pingText).width;
          const bw = tw + 20;
          ctx.fillStyle = "rgba(20, 14, 10, 0.65)";
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(8, H - 24, bw, 17, 4);
            ctx.fill();
          } else {
            ctx.fillRect(8, H - 24, bw, 17);
          }
          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(15, H - 15.5, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(pingText, 22, H - 15.5);
          ctx.restore();
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
