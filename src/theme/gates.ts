// src/theme/gates.ts
// Cổng mốc mở đầu mỗi phần (spec B7) và cửa cuối level (B11).
// Cổng 4 ô × 5 ô đứng SAU người chơi (không cản đường), bảng năm treo giữa xà.
import { TILE } from "../lib/constants";
import type { Level, Rect } from "../game/level";
import type { Part } from "../game/story";
import { box, flag, flagPole, haloText, star } from "./draw";
import { mixColor, type Theme } from "./palette";

export interface Milestone {
  cp: number; // chỉ số trong level.checkpoints
  part: number; // 0-based
}

/** Các cột mốc mở đầu phần (cp 0 = xuất phát mở phần 1). */
export function milestones(level: Level): Milestone[] {
  const out: Milestone[] = [];
  level.checkpoints.forEach((c, cp) => {
    const part = level.partOf[c.seg] ?? 0;
    if (!out.some((m) => m.part === part)) out.push({ cp, part });
  });
  return out;
}

const GW = 4 * TILE;
const GH = 5 * TILE;

/**
 * Cổng mốc: x0 = mép trái (px), ground = mặt đất (px).
 * passed = nhóm đã tới; raise 0..1 = cờ đang kéo lên (600 ms sau khi qua).
 */
export function drawMilestone(ctx: CanvasRenderingContext2D, x0: number, ground: number, th: Theme, info: Part, passed: boolean, raise: number, t: number): void {
  ctx.save();
  if (!passed) ctx.globalAlpha = 0.6; // chưa qua: mờ, đèn tắt
  const top = ground - GH;
  const pillar = (x: number, color: string) => box(ctx, x, top + 30, 16, GH - 30, color);
  const dim = (c: string) => (passed ? c : mixColor(c, "#9E9E9E", 0.4));

  switch (th.era) {
    case 1: // cổng làng: trụ gạch đỏ sẫm, mái ngói hai mái, lồng đèn
      pillar(x0 + 6, dim("#8A3B2A"));
      pillar(x0 + GW - 22, dim("#8A3B2A"));
      ctx.fillStyle = dim("#6D2E21");
      ctx.beginPath();
      ctx.moveTo(x0 - 8, top + 34);
      ctx.quadraticCurveTo(x0 + 6, top + 26, x0 + 16, top + 10);
      ctx.lineTo(x0 + GW - 16, top + 10);
      ctx.quadraticCurveTo(x0 + GW - 6, top + 26, x0 + GW + 8, top + 34);
      ctx.closePath();
      ctx.fill();
      for (const lx of [x0 + 26, x0 + GW - 26]) {
        ctx.fillStyle = passed ? "#E53935" : "#8D6E63";
        ctx.beginPath();
        ctx.ellipse(lx, top + 52, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 2: // cổng nhà máy: trụ bê tông, xà thép chữ H, bóng đèn, sọc vàng–đen
      pillar(x0 + 6, dim("#9EA7AD"));
      pillar(x0 + GW - 22, dim("#9EA7AD"));
      box(ctx, x0, top + 22, GW, 12, dim("#5C6B73"));
      for (const px of [x0 + 6, x0 + GW - 22])
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 ? "#222" : "#F9A825";
          ctx.fillRect(px + 2, ground - 20 + i * 5, 12, 5);
        }
      ctx.fillStyle = passed ? "#FFF59D" : "#BDBDBD";
      ctx.beginPath();
      ctx.arc(x0 + GW / 2, top + 42, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 3: { // vòm đá trắng, rãnh dọc, sao ở đỉnh
      pillar(x0 + 6, dim("#F4F1EA"));
      pillar(x0 + GW - 22, dim("#F4F1EA"));
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 3;
      ctx.fillStyle = dim("#F4F1EA");
      ctx.beginPath();
      ctx.arc(x0 + GW / 2, top + 48, GW / 2 - 4, Math.PI, 0);
      ctx.lineTo(x0 + GW - 4, top + 58);
      ctx.lineTo(x0 + 4, top + 58);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      star(ctx, x0 + GW / 2, top + 16, 9, passed ? "#C62828" : "#9E9E9E");
      break;
    }
    case 4: // cổng kính: khung thép navy viền vàng, dải đèn LED
      box(ctx, x0 + 4, top + 20, GW - 8, GH - 20, "rgba(200,220,245,0.35)", 0);
      ctx.strokeStyle = dim("#14305C");
      ctx.lineWidth = 6;
      ctx.strokeRect(x0 + 6, top + 20, GW - 12, GH - 20);
      ctx.strokeStyle = th.gold;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x0 + 10, top + 24, GW - 20, GH - 26);
      ctx.fillStyle = passed ? "#FFFFFF" : "#90A4AE";
      for (let i = 0; i < 10; i++) ctx.fillRect(x0 + 14 + i * 10, top + 14, 6, 3);
      break;
    default: // 5: cổng vàng mái cong, hai cờ hai bên
      pillar(x0 + 6, dim("#E3B23C"));
      pillar(x0 + GW - 22, dim("#E3B23C"));
      ctx.fillStyle = dim("#B8861A");
      ctx.beginPath();
      ctx.moveTo(x0 - 10, top + 30);
      ctx.quadraticCurveTo(x0 + GW / 2, top - 6, x0 + GW + 10, top + 30);
      ctx.lineTo(x0 + GW - 10, top + 36);
      ctx.lineTo(x0 + 10, top + 36);
      ctx.closePath();
      ctx.fill();
      if (passed) {
        flag(ctx, x0 - 22, top + 50, 20, 14, Math.sin(t * 4) * 2);
        flag(ctx, x0 + GW + 2, top + 50, 20, 14, Math.sin(t * 4 + 1) * 2);
      }
  }

  // bảng năm treo giữa xà
  const bw = GW - 16;
  box(ctx, x0 + 8, top + 62, bw, 40, th.paper, 2);
  haloText(ctx, info.year, x0 + GW / 2, top + 78, "700 18px Oswald, sans-serif", passed ? th.accent : "#757575", bw - 6);
  haloText(ctx, info.phrase, x0 + GW / 2, top + 95, "600 9px Inter, sans-serif", "#222", bw - 6);

  ctx.restore();
  // cột cờ nhỏ trên cổng: cờ kéo lên khi đã qua
  if (passed) flagPole(ctx, x0 + GW - 4, top + 20, 34, raise, t);
}

/** Cờ nhỏ ở cột mốc hồi sinh không mở phần (đoạn nối tiếp). */
export function drawCheckpointFlag(ctx: CanvasRenderingContext2D, x: number, ground: number, reached: boolean): void {
  ctx.fillStyle = "#616161";
  ctx.fillRect(x - 1, ground - TILE, 2, TILE);
  ctx.fillStyle = reached ? "#43A047" : "#9E9E9E";
  ctx.beginPath();
  ctx.moveTo(x + 1, ground - TILE);
  ctx.lineTo(x + 14, ground - TILE + 6);
  ctx.lineTo(x + 1, ground - TILE + 12);
  ctx.closePath();
  ctx.fill();
}

/** Cửa cuối level theo thời kỳ; mở = hai cánh trượt + quầng sáng tràn ra. */
export function drawDoor(ctx: CanvasRenderingContext2D, d: Rect, th: Theme, open: boolean, t: number): void {
  const x = d.x * TILE;
  const y = d.y * TILE;
  const w = d.w * TILE;
  const h = d.h * TILE;
  const frame = ["#8A3B2A", "#5C6B73", "#F4F1EA", "#14305C", "#E3B23C"][th.era - 1] ?? "#8A3B2A";
  const leaf = ["#A0522D", "#78909C", "#D7CCC8", "#90CAF9", "#FFD54F"][th.era - 1] ?? "#A0522D";
  box(ctx, x - 6, y - 14, w + 12, h + 14, frame, 2);
  if (open) {
    const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, w);
    g.addColorStop(0, "rgba(255,248,200,1)");
    g.addColorStop(1, "rgba(255,213,79,0.15)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    const slide = Math.min(w / 2 - 4, 8 + Math.sin(t * 2) * 2 + w / 3);
    box(ctx, x, y, w / 2 - slide, h, leaf, 2);
    box(ctx, x + w / 2 + slide, y, w / 2 - slide, h, leaf, 2);
  } else {
    box(ctx, x, y, w / 2, h, leaf, 2);
    box(ctx, x + w / 2, y, w / 2, h, leaf, 2);
    star(ctx, x + w / 2, y + h / 2, 7, th.era === 5 ? "#C8102E" : "#FFD600");
  }
}
