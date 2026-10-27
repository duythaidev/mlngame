// src/theme/backdrop.ts
// Nền 2 lớp của mỗi thời kỳ (spec B8): vẽ MỘT lần vào canvas phụ rồi mỗi khung chỉ drawImage (nhanh).
// Lớp xa cuộn 0,2×, lớp gần cuộn 0,5×, trời cố định. Hình dáng ngẫu nhiên theo hạt giống của level.
import { TILE, VIEW_W } from "../lib/constants";
import type { Level } from "../game/level";
import { box, flag, flagPole, star, type Ctx } from "./draw";
import { dawnOf, mixColor, skyFor, type Theme } from "./palette";
import { mulberry32, seedOf } from "./rng";

export const FAR = 0.2;
export const NEAR = 0.5;

export interface Backdrop {
  far: HTMLCanvasElement;
  near: HTMLCanvasElement;
}

const cache = new Map<string, Backdrop>();

function layer(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w);
  c.height = h;
  return [c, c.getContext("2d")!];
}

/** Nền của level (cache theo id). */
export function getBackdrop(level: Level, theme: Theme): Backdrop {
  const key = `${level.id}|${theme.era}`;
  let bd = cache.get(key);
  if (bd) return bd;
  const H = level.h * TILE;
  const worldW = level.w * TILE;
  const [far, fctx] = layer(worldW * FAR + VIEW_W, H);
  const [near, nctx] = layer(worldW * NEAR + VIEW_W, H);
  const rnd = mulberry32(seedOf(level.id));
  PAINT[theme.era](fctx, nctx, far.width, near.width, H, theme, rnd);
  bd = { far, near };
  cache.set(key, bd);
  return bd;
}

type Painter = (f: Ctx, n: Ctx, fw: number, nw: number, H: number, th: Theme, rnd: () => number) => void;

/** Mặt đất của lớp nền: đường chân ở hàng 12 (mặt nền level). */
const GROUND = 12 * TILE;

function hills(ctx: Ctx, w: number, base: number, amp: number, color: string, rnd: () => number): void {
  const ph = rnd() * 10;
  const k = 0.004 + rnd() * 0.004;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, GROUND + 60);
  for (let x = 0; x <= w; x += 16) ctx.lineTo(x, base - Math.abs(Math.sin(x * k + ph)) * amp - Math.sin(x * k * 3.1) * amp * 0.25);
  ctx.lineTo(w, GROUND + 60);
  ctx.closePath();
  ctx.fill();
}

function bamboo(ctx: Ctx, x: number, ground: number, h: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, ground);
  ctx.quadraticCurveTo(x + 6, ground - h / 2, x + 12, ground - h);
  ctx.stroke();
  ctx.fillStyle = color;
  for (let i = 1; i <= 4; i++) {
    const yy = ground - (h * i) / 5;
    const xx = x + (12 * i) / 5;
    ctx.beginPath();
    ctx.ellipse(xx + 7, yy, 9, 3, -0.4, 0, Math.PI * 2);
    ctx.ellipse(xx - 6, yy - 4, 8, 2.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Mái đình 2 tầng, góc mái cong. */
function communalHouse(ctx: Ctx, x: number, ground: number, w: number, roof: string): void {
  box(ctx, x + w * 0.12, ground - 46, w * 0.76, 46, "#E9D9B4", 2);
  for (let i = 0; i < 4; i++) box(ctx, x + w * 0.18 + i * w * 0.18, ground - 40, 5, 40, "#8A5A35", 0);
  for (const [y, ww] of [[ground - 46, w], [ground - 70, w * 0.7]] as const) {
    const xx = x + (w - ww) / 2;
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(xx - 8, y + 2);
    ctx.quadraticCurveTo(xx, y - 4, xx + ww * 0.15, y - 18);
    ctx.lineTo(xx + ww * 0.85, y - 18);
    ctx.quadraticCurveTo(xx + ww, y - 4, xx + ww + 8, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function factory(ctx: Ctx, x: number, ground: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, ground - h, w, h);
  ctx.beginPath(); // mái răng cưa
  for (let i = 0; i < w; i += 24) {
    ctx.moveTo(x + i, ground - h);
    ctx.lineTo(x + i + 24, ground - h - 14);
    ctx.lineTo(x + i + 24, ground - h);
  }
  ctx.fill();
  ctx.fillRect(x + w * 0.7, ground - h - 70, 12, 70); // ống khói
  ctx.fillRect(x + w * 0.2, ground - h - 50, 10, 50);
}

function columnsBuilding(ctx: Ctx, x: number, ground: number, w: number, h: number, wall: string, line: string): void {
  ctx.fillStyle = wall;
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.beginPath(); // mái tam giác
  ctx.moveTo(x - 6, ground - h);
  ctx.lineTo(x + w / 2, ground - h - h * 0.28);
  ctx.lineTo(x + w + 6, ground - h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(x - 4, ground - h, w + 8, 8);
  for (let i = 0; i < 6; i++) {
    const cx = x + 6 + (i * (w - 18)) / 5;
    ctx.fillRect(cx, ground - h + 8, 8, h - 20);
    ctx.strokeRect(cx, ground - h + 8, 8, h - 20);
  }
  for (let s = 0; s < 3; s++) ctx.fillRect(x - 10 - s * 6, ground - 12 + s * 4, w + 20 + s * 12, 4); // bậc thềm
}

function tower(ctx: Ctx, x: number, ground: number, w: number, h: number, wall: string, win: string, rnd: () => number): void {
  ctx.fillStyle = wall;
  ctx.fillRect(x, ground - h, w, h);
  for (let y = ground - h + 8; y < ground - 10; y += 14)
    for (let xx = x + 5; xx < x + w - 8; xx += 11) {
      ctx.fillStyle = rnd() < 0.35 ? win : "rgba(255,255,255,0.45)";
      ctx.fillRect(xx, y, 6, 8);
    }
}

function lamp(ctx: Ctx, x: number, ground: number, h: number, color: string, glow: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x - 1.5, ground - h, 3, h);
  ctx.fillRect(x - 6, ground - h, 12, 3);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, ground - h + 7, 5, 0, Math.PI * 2);
  ctx.fill();
}

const PAINT: Record<number, Painter> = {
  // L1 — đồi tre, mái đình, cột cờ, loa
  1: (f, n, fw, nw, _H, th, rnd) => {
    hills(f, fw, GROUND - 150, 40, th.far[0], rnd);
    hills(f, fw, GROUND - 110, 34, th.far[1], rnd);
    hills(f, fw, GROUND - 70, 26, th.far[2], rnd);
    for (let x = 30; x < fw; x += 180 + rnd() * 80) bamboo(f, x, GROUND - 60, 70 + rnd() * 30, "#A89160");
    for (let x = 60; x < nw; x += 70 + rnd() * 50) bamboo(n, x, GROUND, 90 + rnd() * 50, th.near[2]);
    for (let x = 300; x < nw; x += 650 + rnd() * 250) communalHouse(n, x, GROUND, 150, th.near[1]);
    for (let x = 520; x < nw; x += 900 + rnd() * 300) {
      flagPole(n, x, GROUND, 120, 1, 0);
      n.fillStyle = "#5D4037"; // loa phóng thanh
      n.beginPath();
      n.moveTo(x + 2, GROUND - 92);
      n.lineTo(x + 18, GROUND - 100);
      n.lineTo(x + 18, GROUND - 84);
      n.closePath();
      n.fill();
    }
  },
  // L2 — nhà máy, nhà tập thể, cột điện
  2: (f, n, fw, nw, _H, th, rnd) => {
    hills(f, fw, GROUND - 90, 18, th.far[0], rnd);
    for (let x = 0; x < fw; x += 140 + rnd() * 90) factory(f, x, GROUND - 40, 90 + rnd() * 60, 40 + rnd() * 30, th.far[2]);
    for (let x = 40; x < nw; x += 260 + rnd() * 140) {
      const w = 120 + rnd() * 60;
      box(n, x, GROUND - 130, w, 130, th.near[0], 2);
      for (let y = GROUND - 120; y < GROUND - 14; y += 26) for (let xx = x + 10; xx < x + w - 16; xx += 22) box(n, xx, y, 12, 14, "#F3E9DC", 1);
    }
    for (let x = 0; x < nw; x += 220) {
      n.fillStyle = "#5C4A3F";
      n.fillRect(x, GROUND - 150, 4, 150);
      n.fillRect(x - 10, GROUND - 146, 24, 3);
      n.strokeStyle = "rgba(60,50,40,0.6)";
      n.lineWidth = 1;
      n.beginPath();
      n.moveTo(x + 2, GROUND - 144);
      n.quadraticCurveTo(x + 112, GROUND - 120, x + 222, GROUND - 144);
      n.stroke();
    }
    for (let x = 180; x < nw; x += 520 + rnd() * 200) {
      n.strokeStyle = "#37474F"; // xe đạp
      n.lineWidth = 2;
      n.beginPath();
      n.arc(x, GROUND - 10, 9, 0, Math.PI * 2);
      n.arc(x + 30, GROUND - 10, 9, 0, Math.PI * 2);
      n.moveTo(x, GROUND - 10);
      n.lineTo(x + 14, GROUND - 26);
      n.lineTo(x + 30, GROUND - 10);
      n.stroke();
    }
  },
  // L3 — trụ sở cột trắng, hàng cây tỉa, lan can, đèn cổ điển
  3: (f, n, fw, nw, _H, th, rnd) => {
    hills(f, fw, GROUND - 70, 12, th.far[2], rnd);
    for (let x = 80; x < fw; x += 420 + rnd() * 160) columnsBuilding(f, x, GROUND - 40, 200, 110, th.far[0], "#B9C6C1");
    for (let x = 30; x < nw; x += 90 + rnd() * 40) {
      n.fillStyle = "#6B4E2E";
      n.fillRect(x - 2, GROUND - 40, 4, 40);
      n.fillStyle = th.near[0];
      n.beginPath();
      n.arc(x, GROUND - 52, 22, 0, Math.PI * 2);
      n.fill();
    }
    n.fillStyle = th.near[1]; // lan can đá
    for (let x = 0; x < nw; x += 18) n.fillRect(x, GROUND - 22, 5, 22);
    n.fillRect(0, GROUND - 26, nw, 5);
    for (let x = 140; x < nw; x += 360) {
      lamp(n, x, GROUND, 110, "#37474F", "#FFF3C4");
      flag(n, x + 2, GROUND - 100, 18, 12, 0);
    }
  },
  // L4 — thành phố kính, dải cờ giữa cột đèn
  4: (f, n, fw, nw, _H, th, rnd) => {
    for (let x = 0; x < fw; x += 36 + rnd() * 40) tower(f, x, GROUND - 30, 30 + rnd() * 30, 110 + rnd() * 160, th.far[0], th.far[1], rnd);
    for (let x = 30; x < nw; x += 240 + rnd() * 120) {
      const w = 90 + rnd() * 60;
      tower(n, x, GROUND, w, 90 + rnd() * 50, th.near[0], "#E8F1FF", rnd);
      n.fillStyle = "rgba(255,255,255,0.35)"; // vệt phản chiếu kính
      n.beginPath();
      n.moveTo(x + 10, GROUND - 10);
      n.lineTo(x + 30, GROUND - 80);
      n.lineTo(x + 40, GROUND - 80);
      n.lineTo(x + 20, GROUND - 10);
      n.fill();
    }
    for (let x = 0; x < nw; x += 300) {
      lamp(n, x, GROUND, 150, th.near[2], "#FFFFFF");
      for (let i = 0; i < 12; i++) {
        const px = x + 10 + i * 24;
        const py = GROUND - 140 + Math.sin((i / 11) * Math.PI) * 26;
        n.fillStyle = i % 2 ? th.gold : th.near[1];
        n.beginPath();
        n.moveTo(px, py);
        n.lineTo(px + 14, py);
        n.lineTo(px + 7, py + 14);
        n.fill();
      }
    }
  },
  // L5 — panorama 4 thời kỳ trái → phải, cờ dọc đường, hoa vàng
  5: (f, n, fw, nw, _H, th, rnd) => {
    hills(f, fw, GROUND - 60, 16, th.far[0], rnd);
    const q = fw / 4;
    for (let x = 20; x < q; x += 160) communalHouse(f, x, GROUND - 40, 110, "#B5382A");
    for (let x = q; x < 2 * q; x += 150) factory(f, x, GROUND - 40, 100, 50, "#C9A27A");
    for (let x = 2 * q; x < 3 * q; x += 260) columnsBuilding(f, x, GROUND - 40, 170, 90, "#FFF6E0", "#D9B36A");
    for (let x = 3 * q; x < fw; x += 50) tower(f, x, GROUND - 30, 36, 100 + rnd() * 120, "#E9C98A", "#FFF1C2", rnd);
    for (let x = 60; x < nw; x += 260) flagPole(n, x, GROUND, 110, 1, 0);
    for (let x = 20; x < nw; x += 34 + rnd() * 30) {
      n.fillStyle = "#3E7B3A";
      n.fillRect(x, GROUND - 14, 2, 14);
      star(n, x + 1, GROUND - 16, 6, "#FFC107");
    }
  },
};

/** Vẽ trời + 2 lớp nền + không khí (tọa độ màn hình). */
export function drawBackdrop(ctx: CanvasRenderingContext2D, level: Level, theme: Theme, part: number, camX: number, W: number, H: number, t: number): void {
  const [top, bottom] = skyFor(theme, part);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const dawn = dawnOf(theme, part);
  if (theme.era === 2 || theme.era === 5 || theme.era === 1) {
    ctx.fillStyle = theme.era === 2 ? `rgba(255,190,120,${0.25 + dawn * 0.55})` : "rgba(255,230,160,0.55)"; // mặt trời mờ
    ctx.beginPath();
    ctx.arc(W * 0.78, H * 0.22 + (1 - dawn) * 30, 46, 0, Math.PI * 2);
    ctx.fill();
  }

  const bd = getBackdrop(level, theme);
  ctx.drawImage(bd.far, -Math.round(camX * FAR), 0);

  // khói ống khói L2: xám lúc khó khăn → trắng hồng khi Đổi mới
  if (theme.era === 2) {
    ctx.fillStyle = dawn > 0 ? mixColor("#B0B7BB", "#FFD8C8", dawn) : "#A9B1B6";
    for (let i = 0; i < 6; i++) {
      const x = ((i * 157 - camX * FAR) % (W + 100) + W + 100) % (W + 100) - 50;
      const y = GROUND - 170 - ((t * 14 + i * 30) % 60);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(x, y, 14 + ((t * 14 + i * 30) % 60) / 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.drawImage(bd.near, -Math.round(camX * NEAR), 0);

  // tia nắng xiên (L3; L2 từ phần 4)
  if (theme.era === 3 || dawn > 0) {
    ctx.fillStyle = theme.era === 3 ? "rgba(255,255,255,0.22)" : `rgba(255,220,170,${0.25 * dawn})`;
    for (const x0 of [120, 420]) {
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x0 + 70, 0);
      ctx.lineTo(x0 + 330, H);
      ctx.lineTo(x0 + 240, H);
      ctx.closePath();
      ctx.fill();
    }
  }

  // bụi vàng trôi chậm (L1) / hạt vàng bay lên (L5)
  if (theme.era === 1 || theme.era === 5) {
    ctx.fillStyle = theme.era === 1 ? "rgba(160,120,60,0.35)" : "rgba(227,178,60,0.6)";
    for (let i = 0; i < 24; i++) {
      const x = (i * 97 + t * 12) % W;
      const y = theme.era === 1 ? (i * 53 + Math.sin(t + i) * 10) % H : H - ((i * 71 + t * 30) % H);
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // ô cửa sổ L4 bật/tắt chậm
  if (theme.era === 4) {
    ctx.fillStyle = "rgba(242,210,122,0.8)";
    for (let i = 0; i < 8; i++) if (Math.sin(t * 0.7 + i * 2.3) > 0.6) ctx.fillRect((i * 113 + 40) % W, 120 + ((i * 37) % 120), 6, 8);
  }
}

/** Góc tối kiểu phim cũ (vignette), vẽ sau cùng trên màn chơi. */
export function drawVignette(ctx: CanvasRenderingContext2D, theme: Theme, W: number, H: number): void {
  if (theme.vignette <= 0) return;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, "rgba(60,40,20,0)");
  g.addColorStop(1, `rgba(60,40,20,${theme.vignette})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
