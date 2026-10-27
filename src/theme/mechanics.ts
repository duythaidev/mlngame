// src/theme/mechanics.ts
// Đồ họa từng cơ chế (spec B11) — chỉ VẼ; trạng thái (bật/tắt, đếm, góc…) do renderer tính rồi truyền vào.
// Mọi tọa độ là px thế giới (ctx đã translate theo camera). R = hình chữ nhật px.
import { PHYS, TILE } from "../lib/constants";
import { book, box, gear, label, star } from "./draw";
import type { Theme } from "./palette";

export interface R {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Ô (đơn vị ô) → px. */
export function px(r: { x: number; y: number; w: number; h: number }): R {
  return { x: r.x * TILE, y: r.y * TILE, w: r.w * TILE, h: r.h * TILE };
}

export type HazardStyle = "brick" | "hammer" | "pendulum" | "glove";

/** Khối đỏ theo thời kỳ: L1 gạch · L2 búa máy · L3 con lắc · L4–5 tay quyền lực. */
export function hazardStyle(levelId: string): HazardStyle {
  return ({ "2": "hammer", "3": "pendulum", "4": "glove", "5": "glove" } as Record<string, HazardStyle>)[levelId] ?? "brick";
}

export type PillarIcon = "book" | "gear" | "gavel";

/** Nút có nhãn Lập/Hành/Tư pháp → trụ đá có biểu tượng. */
export function pillarIcon(labelKey: string | undefined): PillarIcon | null {
  return labelKey === "lapphap" ? "book" : labelKey === "hanhphap" ? "gear" : labelKey === "tuphap" ? "gavel" : null;
}

/** Năm in trên cuốn Hiến pháp (chìa khóa) theo level. */
export function constitutionYear(levelId: string): string {
  return ({ "1": "1946", "3": "1992" } as Record<string, string>)[levelId] ?? "2013";
}

/** Độ lệch chữ chạy (marquee), luôn ≥ 0. */
export function marqueeOffset(t: number, speed: number, textW: number): number {
  return (((t * speed) % textW) + textW) % textW;
}

/** Số đếm ngược trên sàn sụp: "0.8s" … "0.0s". */
export function crumbleLabel(remain: number): string {
  return `${Math.max(0, remain).toFixed(1)}s`;
}

function dashedRect(ctx: CanvasRenderingContext2D, r: R, color: string, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  ctx.restore();
}

// ------------------------------------------------------------------ địa hình

/** Trần nguy hiểm: dải đỏ mờ + nét đứt mép dưới + chữ chạy "RANH GIỚI HIẾN PHÁP & PHÁP LUẬT". */
export function drawCeiling(ctx: CanvasRenderingContext2D, r: R, t: number, near: boolean): void {
  ctx.fillStyle = near ? "rgba(211,47,47,0.55)" : "rgba(211,47,47,0.38)";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.save();
  ctx.setLineDash([10, 6]);
  ctx.strokeStyle = near ? "#FF1744" : "#E53935";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r.x, r.y + r.h - 1);
  ctx.lineTo(r.x + r.w, r.y + r.h - 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  const text = "RANH GIỚI HIẾN PHÁP & PHÁP LUẬT  ★  ";
  ctx.font = "600 11px Oswald, sans-serif";
  const tw = ctx.measureText(text).width;
  const off = marqueeOffset(t, 40, tw);
  ctx.fillStyle = "#7F0000";
  ctx.textAlign = "left";
  for (let x = r.x - off; x < r.x + r.w; x += tw) ctx.fillText(text, x, r.y + r.h / 2 + 4);
  ctx.restore();
}

/** Cổng chặn theo thời kỳ; mở = khung nét đứt. */
export function drawGate(ctx: CanvasRenderingContext2D, r: R, th: Theme, open: boolean): void {
  if (open) return dashedRect(ctx, r, "#78909C", 0.6);
  const x = r.x + 4;
  const w = r.w - 8;
  if (th.era === 1) {
    box(ctx, x, r.y, w, r.h, "#A0522D");
    ctx.strokeStyle = "#5D4037";
    ctx.lineWidth = 3;
    for (let y = r.y; y < r.y + r.h - 20; y += 48) {
      ctx.beginPath(); // then cài chéo
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x + w, y + 40);
      ctx.stroke();
    }
  } else if (th.era === 2) {
    box(ctx, x, r.y, w, r.h, "rgba(84,110,122,0.25)");
    ctx.fillStyle = "#455A64";
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 2 + i * (w / 4), r.y, 3, r.h);
  } else if (th.era === 5) {
    box(ctx, x, r.y, w, r.h, "#FFD54F");
    for (let y = r.y + 20; y < r.y + r.h; y += 40) star(ctx, x + w / 2, y, 7, "#C8102E");
  } else {
    box(ctx, x, r.y, w, r.h, th.era === 3 ? "#ECEFF1" : "#CFD8DC");
    for (let y = r.y + 20; y < r.y + r.h; y += 48) star(ctx, x + w / 2, y, 6, th.accent);
  }
}

/** Cầu hiện: chưa bật = khung nét đứt nhấp nháy; bật = ván/đá theo thời kỳ. */
export function drawBridge(ctx: CanvasRenderingContext2D, r: R, th: Theme, lit: boolean, t: number): void {
  if (!lit) return dashedRect(ctx, r, th.gold, 0.5 + 0.4 * Math.sin(t * 5));
  const plank = ["#A1887F", "#90A4AE", "#E0E0E0", "#E9ECF1", "#FFD54F"][th.era - 1] ?? "#A1887F";
  for (let x = r.x; x < r.x + r.w; x += 16) box(ctx, x, r.y, Math.min(16, r.x + r.w - x), r.h, plank, 1.5);
}

/** Băng: xanh nhạt, vệt phản chiếu chạy chéo. */
export function drawIce(ctx: CanvasRenderingContext2D, r: R, t: number): void {
  ctx.fillStyle = "#B3E5FC";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = "#4FC3F7";
  ctx.fillRect(r.x, r.y, r.w, 3);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const shine = (t * 60) % (r.w + 60);
  ctx.fillRect(r.x + shine - 40, r.y + 7, 18, 2);
  for (let x = r.x + 6; x < r.x + r.w - 10; x += 26) ctx.fillRect(x, r.y + 12, 8, 2);
}

/** Băng chuyền: L1 dải biểu ngữ đỏ · L2 băng tải con lăn · L3–5 dải đèn. Mũi tên trôi đúng chiều/tốc độ. */
export function drawConveyor(ctx: CanvasRenderingContext2D, r: R, th: Theme, speed: number, t: number): void {
  const base = th.era === 1 ? "#C62828" : th.era === 2 ? "#607D8B" : "#37474F";
  box(ctx, r.x, r.y, r.w, r.h, base, 2);
  const dir = Math.sign(speed);
  const shift = (((t * speed * TILE) % 16) + 16) % 16;
  if (th.era === 2) {
    ctx.fillStyle = "#263238";
    for (let x = r.x + 8; x < r.x + r.w; x += 16) {
      ctx.beginPath();
      ctx.arc(x, r.y + r.h - 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = th.era === 1 ? "#FFD600" : th.era === 2 ? "#ECEFF1" : th.gold;
  for (let x = r.x + shift - 16; x < r.x + r.w; x += 16) {
    if (x < r.x) continue;
    ctx.beginPath();
    ctx.moveTo(x, r.y + 5);
    ctx.lineTo(x + dir * 6, r.y + 11);
    ctx.lineTo(x, r.y + 17);
    ctx.fill();
  }
}

/** Sàn sụp: L2 ghép tem phiếu ố vàng, còn lại gạch/đá nứt; rung + số đếm ngược; đã sụp = nét đứt. */
export function drawCrumble(ctx: CanvasRenderingContext2D, r: R, th: Theme, remain: number, broken: boolean, t: number): void {
  if (broken) return dashedRect(ctx, r, "#A1887F", 0.6);
  const shaking = remain >= 0 && remain <= PHYS.crumbleShake;
  ctx.save();
  if (shaking) ctx.translate(Math.sin(t * 80) * 2, 0);
  if (th.era === 2) {
    for (let x = r.x; x < r.x + r.w; x += 16) {
      box(ctx, x + 1, r.y + 1, 14, r.h - 2, "#F3E2A9", 1, "#8D6E63"); // tem phiếu
      ctx.fillStyle = "#B5382A";
      ctx.fillRect(x + 4, r.y + 5, 8, 2);
      ctx.fillStyle = "#8D6E63";
      for (let y = r.y + 2; y < r.y + r.h; y += 4) ctx.fillRect(x, y, 1, 2); // răng cưa
    }
  } else {
    box(ctx, r.x, r.y, r.w, r.h, th.era >= 3 ? "#CFD8DC" : "#A1887F", 2);
  }
  ctx.strokeStyle = "#4E342E";
  ctx.lineWidth = 2;
  ctx.beginPath(); // vết nứt, lan dần khi sắp sụp
  const k = remain >= 0 ? 1 - Math.max(0, remain) / Math.max(0.01, PHYS.crumbleShake) : 0.3;
  ctx.moveTo(r.x + 8, r.y);
  ctx.lineTo(r.x + 14, r.y + 10 * (0.6 + k));
  ctx.lineTo(r.x + 8 + r.w * 0.5 * Math.min(1, k + 0.3), r.y + r.h - 4);
  ctx.stroke();
  if (remain >= 0) {
    ctx.font = `bold ${r.w >= 2 * TILE ? 14 : 11}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(30,20,10,0.75)";
    const tw = ctx.measureText("0.0s").width + 6;
    ctx.fillRect(r.x + r.w / 2 - tw / 2, r.y + r.h / 2 - 8, tw, 16);
    ctx.fillStyle = shaking ? "#FF5252" : "#FFFFFF";
    ctx.fillText(crumbleLabel(remain), r.x + r.w / 2, r.y + r.h / 2 + 1);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
}

/** Vùng chậm: giấy tờ bay lơ lửng + con dấu nảy. */
export function drawSlowZone(ctx: CanvasRenderingContext2D, r: R, t: number, text?: string): void {
  ctx.fillStyle = "rgba(121,85,72,0.12)";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  for (let i = 0; i < Math.max(4, Math.floor(r.w / 20)); i++) {
    const x = r.x + ((i * 37 + t * 18) % r.w);
    const y = r.y + 10 + ((i * 53 + Math.sin(t * 2 + i) * 14) % (r.h - 20));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 1.5 + i) * 0.5);
    box(ctx, -6, -8, 12, 16, "#FFFFFF", 1, "#8D6E63");
    ctx.fillStyle = "#BDBDBD";
    ctx.fillRect(-4, -4, 8, 1);
    ctx.fillRect(-4, 0, 8, 1);
    ctx.restore();
  }
  const sx = r.x + r.w / 2;
  const sy = r.y + r.h - 14 - Math.abs(Math.sin(t * 3)) * 14;
  ctx.fillStyle = "#C62828";
  ctx.beginPath();
  ctx.arc(sx, sy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5D4037";
  ctx.fillRect(sx - 3, sy - 18, 6, 10);
  if (text) label(ctx, text, sx, r.y - 2);
}

/** Ô đích của khối: nét đứt xanh. */
export function drawGoal(ctx: CanvasRenderingContext2D, r: R, text?: string): void {
  dashedRect(ctx, r, "#43A047");
  if (text) label(ctx, text, r.x + r.w / 2, r.y - 4, "#2E7D32");
}

// ------------------------------------------------------------------ vật mang + nơi nhận

/** Phiếu bầu: giấy trắng có dấu ✓ đỏ, góc cuộn. */
export function drawBallot(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  box(ctx, cx - 9, cy - 11, 18, 22, "#FFFFFF");
  ctx.fillStyle = "#E0E0E0";
  ctx.beginPath();
  ctx.moveTo(cx + 9, cy + 5);
  ctx.lineTo(cx + 3, cy + 11);
  ctx.lineTo(cx + 9, cy + 11);
  ctx.fill();
  ctx.strokeStyle = "#D32F2F";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy);
  ctx.lineTo(cx - 1, cy + 5);
  ctx.lineTo(cx + 6, cy - 6);
  ctx.stroke();
}

/** Mảnh chữ: thẻ đá khắc chữ, viền nét trống đồng. */
export function drawWordTile(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string): void {
  ctx.font = "700 11px Inter, sans-serif";
  const w = Math.max(44, ctx.measureText(text).width + 12);
  box(ctx, cx - w / 2, cy - 10, w, 20, "#ECEFF1");
  ctx.strokeStyle = "#B8861A";
  ctx.setLineDash([2, 2]);
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - w / 2 + 3, cy - 7, w - 6, 14);
  ctx.setLineDash([]);
  ctx.fillStyle = "#3E2723";
  ctx.textAlign = "center";
  ctx.fillText(text, cx, cy + 4);
}

/** Vật mang (phiếu / Hiến pháp / mảnh chữ) tâm (cx, cy); glow = vầng sáng khi chưa nhặt. */
export function drawCarryItem(ctx: CanvasRenderingContext2D, kind: "ballot" | "key" | "word", cx: number, cy: number, text: string, year: string, t: number, glow: boolean): void {
  if (glow) {
    ctx.fillStyle = "rgba(255,213,79,0.35)";
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();
    if (kind === "key") {
      ctx.strokeStyle = "rgba(255,193,7,0.7)"; // tia sáng quay chậm
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = t * 0.8 + (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
        ctx.lineTo(cx + Math.cos(a) * 24, cy + Math.sin(a) * 24);
        ctx.stroke();
      }
    }
  }
  if (kind === "ballot") drawBallot(ctx, cx, cy);
  else if (kind === "key") book(ctx, cx, cy, 20, 24, year);
  else drawWordTile(ctx, cx, cy, text);
}

/** Hòm phiếu gỗ có khe, dán cờ, số k/n; đủ thì phát sáng vàng. */
export function drawBallotBox(ctx: CanvasRenderingContext2D, r: R, done: number, total: number, t: number): void {
  const full = done >= total;
  if (full) {
    ctx.fillStyle = `rgba(255,213,79,${0.35 + 0.2 * Math.sin(t * 4)})`;
    ctx.fillRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12);
  }
  box(ctx, r.x, r.y + 8, r.w, r.h - 8, "#8D5A35");
  box(ctx, r.x - 3, r.y + 4, r.w + 6, 8, "#6D4126");
  ctx.fillStyle = "#222";
  ctx.fillRect(r.x + r.w / 2 - 10, r.y + 6, 20, 3); // khe
  ctx.fillStyle = "#D32F2F"; // dải cờ trên mặt hòm
  ctx.fillRect(r.x + 4, r.y + 18, r.w - 8, 10);
  star(ctx, r.x + r.w / 2, r.y + 23, 4, "#FFD600");
  box(ctx, r.x + r.w / 2 - 18, r.y + r.h - 24, 36, 18, "#FFF8E1", 1);
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = full ? "#2E7D32" : "#E65100";
  ctx.fillText(`${done}/${total}`, r.x + r.w / 2, r.y + r.h - 10);
}

/** Khung chữ = vòm đá 3 ô; ô đã nộp hiện chữ; đủ thì vòm sáng. */
export function drawWordArch(ctx: CanvasRenderingContext2D, r: R, words: { text: string; got: boolean }[], t: number): void {
  const full = words.every((w) => w.got);
  ctx.fillStyle = full ? `rgba(255,213,79,${0.4 + 0.2 * Math.sin(t * 4)})` : "rgba(0,0,0,0)";
  ctx.fillRect(r.x - 6, r.y - 14, r.w + 12, r.h + 14);
  ctx.fillStyle = "#ECEFF1";
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r.x, r.y + r.h);
  ctx.lineTo(r.x, r.y + 8);
  ctx.quadraticCurveTo(r.x + r.w / 2, r.y - 16, r.x + r.w, r.y + 8);
  ctx.lineTo(r.x + r.w, r.y + r.h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const rowH = (r.h - 12) / Math.max(1, words.length);
  words.forEach((w, i) => {
    const y = r.y + 10 + i * rowH;
    box(ctx, r.x + 4, y, r.w - 8, rowH - 3, w.got ? "#FFF8E1" : "#546E7A", 1);
    ctx.font = "700 9px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = w.got ? "#3E2723" : "#CFD8DC";
    ctx.fillText(w.got ? w.text : "· · ·", r.x + r.w / 2, y + rowH / 2 + 2, r.w - 10);
  });
}

// ------------------------------------------------------------------ máy móc

/** Nút đỏ: đế kim loại + nút nổi; bấm = lún, đèn xanh. icon = trụ Lập/Hành/Tư pháp. */
export function drawPad(ctx: CanvasRenderingContext2D, r: R, down: boolean, icon: PillarIcon | null, t: number): void {
  const ground = r.y + r.h;
  const cx = r.x + r.w / 2;
  if (icon) {
    box(ctx, cx - 9, ground - 46, 18, 38, down ? "#FFF8E1" : "#E0E0E0", 2); // trụ đá
    const iy = ground - 58;
    if (icon === "book") book(ctx, cx, iy, 14, 16);
    else if (icon === "gear") gear(ctx, cx, iy, 9, down ? "#14305C" : "#78909C", t * (down ? 1 : 0));
    else {
      ctx.save(); // búa thẩm phán
      ctx.translate(cx, iy);
      ctx.rotate(-0.5);
      box(ctx, -8, -5, 16, 8, "#6D4C41", 1);
      ctx.fillStyle = "#4E342E";
      ctx.fillRect(-1.5, 3, 3, 12);
      ctx.restore();
    }
    if (down) {
      ctx.fillStyle = "rgba(255,213,79,0.45)";
      ctx.beginPath();
      ctx.arc(cx, iy, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  box(ctx, r.x + 2, ground - 5, r.w - 4, 5, "#9E9E9E", 1); // đế
  const h = down ? 3 : 8;
  ctx.fillStyle = down ? "#43A047" : "#E53935";
  ctx.fillRect(r.x + 6, ground - 5 - h, r.w - 12, h);
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(r.x + 6, ground - 5 - h, r.w - 12, h);
  if (!down && Math.sin(t * 3) > 0) {
    ctx.fillStyle = "rgba(255,82,82,0.5)";
    ctx.fillRect(r.x + 8, ground - 12, r.w - 16, 2);
  }
}

/** Số to trên bục / khối: xanh khi đủ, cam khi thiếu. */
function bigNumber(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, ok: boolean): void {
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = ok ? "#2E7D32" : "#E65100";
  ctx.fillText(text, cx, cy + 7);
}

/** Bục số / thang: bục màu nhấn; drop = biển số trên cột. */
export function drawLift(ctx: CanvasRenderingContext2D, b: R, th: Theme, need: number, sign: boolean): void {
  box(ctx, b.x, b.y, b.w, b.h, th.era === 4 ? "#5C6BC0" : "#7E57C2", 2);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let x = b.x + 6; x < b.x + b.w - 6; x += 12) ctx.fillRect(x, b.y + 4, 6, 3);
  if (sign) {
    const cx = b.x + b.w / 2;
    const top = b.y - 38;
    ctx.fillStyle = "#5D4037";
    ctx.fillRect(cx - 2, top + 24, 4, 14);
    box(ctx, cx - 16, top, 32, 26, "#FFF8E1", 2);
    bigNumber(ctx, String(need), cx, top + 12, false);
  }
}

/** Sàn chở: L1 bè tre · L2 phà sắt · L3–4 thang máy kính · L5 kiệu vàng; ghế đỏ = nút; lộ trình nét đứt. */
export function drawMover(ctx: CanvasRenderingContext2D, b: R, th: Theme, seats: number, path: R[] | null, t: number): void {
  if (path && path.length > 1) {
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(38,166,154,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
  }
  if (th.era === 1) {
    for (let x = b.x; x < b.x + b.w; x += 8) box(ctx, x, b.y, 8, b.h, "#C8A86B", 1, "#6D4C41");
  } else if (th.era === 2) {
    box(ctx, b.x, b.y, b.w, b.h, "#78909C", 2);
    ctx.fillStyle = "#455A64";
    for (let x = b.x + 6; x < b.x + b.w; x += 14) ctx.fillRect(x, b.y + b.h - 6, 3, 3);
  } else if (th.era === 5) {
    box(ctx, b.x, b.y, b.w, b.h, "#FFD54F", 2);
    ctx.fillStyle = "#C8102E";
    ctx.fillRect(b.x, b.y + b.h - 5, b.w, 3);
  } else {
    box(ctx, b.x, b.y, b.w, b.h, "rgba(144,202,249,0.75)", 2, "#14305C");
    ctx.fillStyle = "#14305C";
    ctx.fillRect(b.x + 2, b.y - 14, 3, 14); // tay vịn
    ctx.fillRect(b.x + b.w - 5, b.y - 14, 3, 14);
    ctx.fillRect(b.x + 2, b.y - 14, b.w - 4, 2);
  }
  for (let k = 0; k < seats; k++) box(ctx, b.x + k * TILE + 5, b.y - 6, TILE - 10, 6, "#E53935", 1); // ghế đỏ = nút
  ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.3 * Math.sin(t * 6)})`; // đèn pha
  ctx.fillRect(b.x + b.w - 6, b.y + 3, 4, 4);
}

/** Khối số (đá kem viền cam, số khắc) · "Bãi bỏ" = chồng hồ sơ buộc dây · "Kiểm soát" = khối có con dấu. */
export function drawBox(ctx: CanvasRenderingContext2D, b: R, need: number, labelKey: string | undefined, text: string | undefined): void {
  if (labelKey === "baibo") {
    for (let i = 0; i < 4; i++) box(ctx, b.x + 2 + (i % 2) * 2, b.y + 2 + i * ((b.h - 4) / 4), b.w - 6, (b.h - 4) / 4, i % 2 ? "#FFF8E1" : "#F5E6C8", 1, "#8D6E63");
    ctx.strokeStyle = "#8D6E63"; // dây gai buộc chéo
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x + b.w / 2, b.y);
    ctx.lineTo(b.x + b.w / 2, b.y + b.h);
    ctx.moveTo(b.x, b.y + b.h / 2);
    ctx.lineTo(b.x + b.w, b.y + b.h / 2);
    ctx.stroke();
    ctx.fillStyle = "#C62828"; // ghim đỏ
    ctx.beginPath();
    ctx.arc(b.x + 8, b.y + 8, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    box(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, "#FFF3E0", 3, "#FF8A50");
    if (labelKey === "kiemsoat") {
      ctx.strokeStyle = "rgba(198,40,40,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x + b.w - 14, b.y + 14, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  bigNumber(ctx, String(need), b.x + b.w / 2, b.y + b.h / 2, false);
  if (text) label(ctx, text, b.x + b.w / 2, b.y - 4);
}

/** Khối đỏ theo thời kỳ (búa máy có piston, găng có ngón trỏ chỉ xuống, con lắc treo xích). */
export function drawHazard(ctx: CanvasRenderingContext2D, rects: R[], style: HazardStyle): void {
  const [b, ...rest] = rects;
  if (style === "pendulum") {
    const cx = b.x + b.w / 2;
    ctx.strokeStyle = "#616161"; // dây xích lên tới trần
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, TILE);
    ctx.lineTo(cx, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#D32F2F";
    ctx.strokeStyle = "#222";
    ctx.beginPath();
    ctx.ellipse(cx, b.y + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(cx - b.w / 6, b.y + b.h / 3, Math.min(b.w, b.h) / 6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  for (const q of rest) box(ctx, q.x + q.w * 0.3, q.y, q.w * 0.4, q.h, style === "hammer" ? "#90A4AE" : "#B71C1C", 1.5); // cán / piston
  if (style === "glove") {
    box(ctx, b.x, b.y, b.w, b.h, "#C62828", 2);
    ctx.fillStyle = "#B71C1C"; // ngón trỏ chỉ xuống
    const fw = Math.max(6, b.w * 0.28);
    ctx.fillRect(b.x + b.w - fw - 2, b.y + b.h, fw, 9);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, 3);
  } else {
    box(ctx, b.x, b.y, b.w, b.h, style === "hammer" ? "#D84315" : "#C62828", 2);
    if (style === "brick") {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (let y = b.y + 8; y < b.y + b.h; y += 10) ctx.fillRect(b.x, y, b.w, 1);
    }
    ctx.fillStyle = "#7F0000"; // răng cưa mặt dưới
    for (let x = b.x; x < b.x + b.w; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, b.y + b.h);
      ctx.lineTo(x + 4, b.y + b.h + 6);
      ctx.lineTo(x + 8, b.y + b.h);
      ctx.fill();
    }
  }
}

/** Bập bênh = cán cân công lý: đòn cân nghiêng theo góc thật, 2 đĩa treo, kim thăng bằng. */
export function drawSeesaw(ctx: CanvasRenderingContext2D, r: R, ang: number): void {
  const cx = r.x + r.w / 2;
  const cy = r.y + (PHYS.seesawThick / 2) * TILE;
  ctx.fillStyle = "#795548"; // trụ
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - 11, r.y + TILE);
  ctx.lineTo(cx + 11, r.y + TILE);
  ctx.fill();
  const slip = Math.abs(ang) > PHYS.seesawSlip;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  const hw = r.w / 2;
  const th = PHYS.seesawThick * TILE;
  box(ctx, -hw, -th / 2, r.w, th, "#C9A24A", 3, slip ? "#4FC3F7" : "#5D4037");
  for (const s of [-1, 1]) {
    const ex = s * (hw - 10);
    ctx.save(); // đĩa cân luôn treo thẳng đứng
    ctx.translate(ex, th / 2);
    ctx.rotate(-ang);
    ctx.strokeStyle = "#5D4037";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, 10);
    ctx.moveTo(0, 0);
    ctx.lineTo(8, 10);
    ctx.stroke();
    ctx.fillStyle = "#E3B23C";
    ctx.beginPath();
    ctx.ellipse(0, 11, 10, 3, 0, 0, Math.PI);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // kim thăng bằng ở trục
  ctx.strokeStyle = Math.abs(ang) < 0.05 ? "#43A047" : "#E65100";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 2);
  ctx.lineTo(cx + Math.sin(ang) * 14, cy - 2 - Math.cos(ang) * 14);
  ctx.stroke();
}

/** Cờ đỏ sau lưng người dẫn đường đang đứng nút (spec B11 "Dãy nút dẫn đường"). */
export function drawLeaderFlag(ctx: CanvasRenderingContext2D, x: number, top: number, t: number): void {
  ctx.fillStyle = "#5D4037";
  ctx.fillRect(x - 12, top - 26, 2, 30);
  ctx.fillStyle = "#D32F2F";
  ctx.beginPath();
  ctx.moveTo(x - 10, top - 26);
  ctx.quadraticCurveTo(x + 2, top - 30 + Math.sin(t * 6) * 3, x + 12, top - 26);
  ctx.lineTo(x + 12, top - 14);
  ctx.quadraticCurveTo(x + 2, top - 18 + Math.sin(t * 6) * 3, x - 10, top - 14);
  ctx.fill();
  star(ctx, x + 1, top - 20, 3.5, "#FFD600");
}
