// src/theme/draw.ts
// Nét vẽ dùng chung cho nền, đạo cụ, cổng mốc, cơ chế.

export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const INK = "#222222";

/** Ngôi sao 5 cánh tâm (cx, cy), bán kính r. */
export function star(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** Cờ đỏ sao vàng: góc trên-trái (x, y) cạnh cán; wave = độ phấp phới (px). */
export function flag(ctx: Ctx, x: number, y: number, w: number, h: number, wave = 0): void {
  ctx.fillStyle = "#D32F2F";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + w / 2, y - wave, x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.quadraticCurveTo(x + w / 2, y + h - wave, x, y + h);
  ctx.closePath();
  ctx.fill();
  star(ctx, x + w / 2, y + h / 2 - wave / 3, Math.min(w, h) * 0.32, "#FFD600");
}

/** Cột cờ cao `h` đứng tại (x, ground), lá cờ kéo lên theo `raise` 0..1. */
export function flagPole(ctx: Ctx, x: number, ground: number, h: number, raise: number, t: number): void {
  ctx.fillStyle = "#5D4037";
  ctx.fillRect(x - 1.5, ground - h, 3, h);
  const fh = Math.min(16, h * 0.3);
  const top = ground - h + 2 + (1 - raise) * (h - fh - 4);
  flag(ctx, x + 1.5, top, fh * 1.5, fh, Math.sin(t * 4 + x) * 2);
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Hình chữ nhật tô + viền mực. */
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, line = 2, stroke = INK): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (line > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.strokeRect(x + line / 2, y + line / 2, w - line, h - line);
  }
}

/** Chữ có viền sáng (halo) để không chìm trên nền họa tiết (spec B13). */
export function haloText(ctx: Ctx, text: string, x: number, y: number, font: string, color: string, maxW?: number): void {
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.strokeText(text, x, y, maxW);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y, maxW);
  ctx.textBaseline = "alphabetic";
}

/** Nhãn nhỏ trên nền kem (≤ 3 từ); y = mép dưới nhãn. */
export function label(ctx: Ctx, text: string, cx: number, y: number, color = INK): void {
  ctx.font = "600 11px Inter, sans-serif";
  const w = ctx.measureText(text).width;
  ctx.fillStyle = "rgba(255,250,235,0.92)";
  ctx.fillRect(cx - w / 2 - 5, y - 15, w + 10, 16);
  ctx.strokeStyle = "rgba(34,34,34,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - w / 2 - 4.5, y - 14.5, w + 9, 15);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, cx, y - 3);
}

/** Bánh răng tâm (cx, cy). */
export function gear(ctx: Ctx, cx: number, cy: number, r: number, color: string, rot = 0): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  const teeth = 8;
  for (let i = 0; i < teeth * 2; i++) {
    const a = rot + (i * Math.PI) / teeth;
    const rr = i % 2 === 0 ? r : r * 0.78;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

/** Cuốn sách bìa đỏ sao vàng (cuốn Hiến pháp). */
export function book(ctx: Ctx, cx: number, cy: number, w: number, h: number, year?: string): void {
  box(ctx, cx - w / 2, cy - h / 2, w, h, "#C62828");
  ctx.fillStyle = "#E3B23C";
  ctx.fillRect(cx - w / 2 + 2, cy - h / 2 + 2, 3, h - 4); // gáy vàng
  star(ctx, cx + 1.5, cy - h * 0.12, Math.min(w, h) * 0.24, "#FFD600");
  if (year) {
    ctx.font = `700 ${Math.max(6, Math.round(h * 0.22))}px Oswald, sans-serif`;
    ctx.fillStyle = "#FFE082";
    ctx.textAlign = "center";
    ctx.fillText(year, cx + 1.5, cy + h * 0.36);
  }
}
