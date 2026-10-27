// src/theme/tiles.ts
// Gạch nền theo thời kỳ (spec B9): họa tiết 32×32 vẽ sẵn thành pattern; mép trên viền sáng 3 px, mép dưới bóng 2 px.
import { TILE } from "../lib/constants";
import type { Level, Rect } from "../game/level";
import type { Theme } from "./palette";
import { mulberry32 } from "./rng";

const patterns = new Map<number, CanvasPattern>();

function tileCanvas(th: Theme): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TILE;
  c.height = TILE;
  const g = c.getContext("2d")!;
  const rnd = mulberry32(th.era * 101);
  g.fillStyle = th.tile.base;
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle = th.tile.joint;
  g.strokeStyle = th.tile.joint;
  switch (th.era) {
    case 1: // đất nện + đá ong nhẹ nhàng
      for (let i = 0; i < 10; i++) {
        g.globalAlpha = 0.12 + rnd() * 0.18;
        g.beginPath();
        g.arc(rnd() * TILE, rnd() * TILE, 1 + rnd() * 1.5, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      break;
    case 2: // gạch đỏ cũ ghép so le thanh nhã
      g.globalAlpha = 0.55;
      g.fillRect(0, 15, TILE, 1.5);
      g.fillRect(0, 31, TILE, 1);
      g.fillRect(15, 0, 1.5, 15);
      g.fillRect(0, 17, 1, 14);
      g.fillRect(31, 17, 1, 14);
      g.globalAlpha = 0.15;
      g.fillRect(4, 4, 5, 2.5); // vết sứt nhẹ
      g.globalAlpha = 1;
      break;
    case 3: // granite hạt mịn tao nhã, mạch gạch mờ tinh tế
      for (let i = 0; i < 10; i++) {
        g.globalAlpha = 0.08;
        g.fillRect(rnd() * TILE, rnd() * TILE, 1, 1);
      }
      g.globalAlpha = 0.12;
      g.lineWidth = 1;
      g.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
      g.globalAlpha = 1;
      break;
    case 4: // cẩm thạch trắng kẻ vân thanh lịch
      g.globalAlpha = 0.15;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, 8 + rnd() * 6);
      g.bezierCurveTo(10, 2, 18, 26, 32, 14 + rnd() * 6);
      g.stroke();
      g.globalAlpha = 0.12;
      g.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
      g.globalAlpha = 1;
      break;
    default: // 5: đá vàng chạm vòng tròn đồng tâm (trống đồng)
      g.globalAlpha = 0.3;
      g.lineWidth = 1.2;
      for (const r of [11, 6, 2]) {
        g.beginPath();
        g.arc(16, 16, r, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
  }
  return c;
}

export function getTilePattern(ctx: CanvasRenderingContext2D, th: Theme): CanvasPattern {
  let p = patterns.get(th.era);
  if (!p) {
    p = ctx.createPattern(tileCanvas(th), "repeat")!;
    patterns.set(th.era, p);
  }
  return p;
}

function visible(r: Rect, camX: number, W: number): boolean {
  return (r.x + r.w) * TILE >= camX - TILE && r.x * TILE <= camX + W + TILE;
}

/** Nền đặc (chỉ vẽ phần trong khung nhìn). Gọi khi ctx đã translate(-camX). */
export function drawSolids(ctx: CanvasRenderingContext2D, level: Level, th: Theme, camX: number, W: number): void {
  ctx.fillStyle = getTilePattern(ctx, th);
  for (const r of level.solids) if (visible(r, camX, W)) ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
  for (const r of level.solids) {
    if (!visible(r, camX, W)) continue;
    ctx.fillStyle = th.tile.edge; // mép trên sáng
    ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, 3);
    ctx.fillStyle = "rgba(0,0,0,0.12)"; // mép dưới tối nhẹ
    ctx.fillRect(r.x * TILE, (r.y + r.h) * TILE - 2, r.w * TILE, 2);
    if (th.era === 1 && r.y > 0 && r.y < level.h - 1) {
      ctx.fillStyle = "#7E994D"; // cỏ ở mép trên
      for (let x = r.x * TILE + 3; x < (r.x + r.w) * TILE; x += 9) ctx.fillRect(x, r.y * TILE - 3, 2, 3);
    }
  }
}

/** Gai: tam giác mực có vệt sáng. */
export function drawSpikes(ctx: CanvasRenderingContext2D, level: Level, camX: number, W: number): void {
  for (const sp of level.spikes) {
    if (!visible(sp, camX, W)) continue;
    const x = sp.x * TILE;
    const y = sp.y * TILE;
    ctx.fillStyle = "#4A4A4A";
    ctx.beginPath();
    ctx.moveTo(x + 2, y + TILE);
    ctx.lineTo(x + TILE / 2, y + TILE / 2);
    ctx.lineTo(x + TILE - 2, y + TILE);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.moveTo(x + TILE / 2, y + TILE / 2 + 3);
    ctx.lineTo(x + TILE / 2 + 3, y + TILE - 2);
    ctx.lineTo(x + TILE / 2, y + TILE - 2);
    ctx.fill();
  }
}
