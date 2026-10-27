// src/components/AdminRoomView.tsx
// Hình của một phòng cho trang admin, vẽ bằng đúng renderer của game:
//  - RoomThumb: ảnh thu nhỏ, vẽ lại mỗi khi có tóm tắt mới (1 lần/giây) → không tốn máy, không tốn mạng.
//  - FocusView: xem to một phòng, nhận 5 snapshot/giây rồi nội suy cho mượt (vẽ 60 hình/giây).
import { useEffect, useRef } from "react";
import { getLevel, nextLevelId } from "../game/level";
import { decodeObjView } from "../game/objects";
import type { Snapshot } from "../game/protocol";
import { createFx, drawFrame, drawMessage, type DrawPlayer } from "../game/renderer";
import { TILE, VIEW_W } from "../lib/constants";
import type { SlotInfo } from "../lib/types";
import { decodeSnapshot } from "../net/codec";
import { SnapshotBuffer } from "../net/interpolate";

const H = 16 * TILE;

function playersOf(snap: Snapshot, slots: Record<string, SlotInfo>, pos?: Record<string, [number, number]>): DrawPlayer[] {
  return Object.keys(snap.p)
    .sort()
    .map((slot) => {
      const [x, y] = pos?.[slot] ?? [snap.p[slot][0] / 100, snap.p[slot][1] / 100];
      return { slot, x, y, name: slots[slot]?.name ?? slot, avatar: slots[slot]?.avatar };
    });
}

function paint(ctx: CanvasRenderingContext2D, snap: Snapshot, slots: Record<string, SlotInfo>, fx: ReturnType<typeof createFx>, now: number, buf?: SnapshotBuffer): void {
  const level = getLevel(snap.lv);
  const sorted = Object.keys(snap.p).sort();
  drawFrame(ctx, level, {
    players: playersOf(snap, slots, buf?.positions(now)),
    hasKey: snap.k === 1,
    won: snap.w === 1,
    lose: snap.d === 1 && sorted[snap.c] ? { slot: sorted[snap.c], t: 0.5 } : null,
    levelName: level.name,
    isLastLevel: nextLevelId(level.id) === null,
    view: decodeObjView(snap.o),
    bodies: buf?.bodies(now),
    time: now / 1000,
    fx,
  });
}

/** Ảnh thu nhỏ (một nửa kích thước) — chỉ vẽ lại khi chuỗi snapshot đổi. */
export function RoomThumb({ snap, slots }: { snap: string | null; slots: Record<string, SlotInfo> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fx = useRef(createFx());
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    const s = snap ? decodeSnapshot(snap) : null;
    if (!s) drawMessage(ctx, VIEW_W, H, "Chưa có ai trong phòng");
    else paint(ctx, s, slots, fx.current, performance.now());
  }, [snap, slots]);
  return <canvas ref={ref} width={VIEW_W / 2} height={H / 2} className="admin-thumb" />;
}

/** Xem to: buffer nhận snapshot từ ngoài (pushFocus), vòng vẽ 60 hình/giây nội suy trễ 250 ms. */
export function FocusView({ buffer, slots }: { buffer: SnapshotBuffer; slots: Record<string, SlotInfo> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  });
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const fx = createFx();
    let raf = 0;
    const frame = (now: number) => {
      const s = buffer.latest();
      if (!s) drawMessage(ctx, VIEW_W, H, "Đang chờ dữ liệu phòng…");
      else paint(ctx, s, slotsRef.current, fx, now, buffer);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [buffer]);
  return <canvas ref={ref} width={VIEW_W} height={H} className="admin-focus-canvas" />;
}
