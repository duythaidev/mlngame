// src/theme/backdrop.ts
// Nền 2 lớp của mỗi thời kỳ (spec B8): vẽ MỘT lần vào canvas phụ rồi mỗi khung chỉ drawImage (nhanh).
// Lớp xa cuộn 0,2×, lớp gần cuộn 0,5×, trời cố định. Hình dáng ngẫu nhiên theo hạt giống của level.
// Bản cập nhật: màu dịu nhẹ, hòa vào nền trời, không có viền đen sắc để người chơi tập trung vào màn chơi.
import { TILE, VIEW_W } from "../lib/constants";
import type { Level } from "../game/level";
import { box, flagPole, star, type Ctx } from "./draw";
import { dawnOf, skyFor, type Theme } from "./palette";
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
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, ground);
  ctx.quadraticCurveTo(x + 5, ground - h / 2, x + 10, ground - h);
  ctx.stroke();
  ctx.fillStyle = color;
  for (let i = 1; i <= 3; i++) {
    const yy = ground - (h * i) / 4;
    const xx = x + (10 * i) / 4;
    ctx.beginPath();
    ctx.ellipse(xx + 6, yy, 6, 2, -0.35, 0, Math.PI * 2);
    ctx.ellipse(xx - 5, yy - 3, 5, 1.8, 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Mái đình 2 tầng, dáng uốn cong nhẹ nhàng, không viền đen đậm. */
function communalHouse(ctx: Ctx, x: number, ground: number, w: number, roof: string): void {
  box(ctx, x + w * 0.12, ground - 46, w * 0.76, 46, "#F5EAD4", 0);
  for (let i = 0; i < 4; i++) box(ctx, x + w * 0.18 + i * w * 0.18, ground - 40, 4, 40, "#B89679", 0);
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
    ctx.strokeStyle = "rgba(120, 60, 30, 0.18)";
    ctx.lineWidth = 1;
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
  ctx.fillRect(x + w * 0.7, ground - h - 70, 10, 70); // ống khói
  ctx.fillRect(x + w * 0.2, ground - h - 50, 8, 50);
}

function columnsBuilding(ctx: Ctx, x: number, ground: number, w: number, h: number, wall: string, line: string): void {
  ctx.fillStyle = wall;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
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
  }
  for (let s = 0; s < 3; s++) ctx.fillRect(x - 10 - s * 6, ground - 12 + s * 4, w + 20 + s * 12, 4); // bậc thềm
}

function tower(ctx: Ctx, x: number, ground: number, w: number, h: number, wall: string, win: string, rnd: () => number): void {
  ctx.fillStyle = wall;
  ctx.fillRect(x, ground - h, w, h);
  for (let y = ground - h + 10; y < ground - 10; y += 18)
    for (let xx = x + 6; xx < x + w - 8; xx += 14) {
      ctx.fillStyle = rnd() < 0.25 ? win : "rgba(255,255,255,0.2)";
      ctx.fillRect(xx, y, 5, 7);
    }
}

function lamp(ctx: Ctx, x: number, ground: number, h: number, color: string, glow: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x - 1, ground - h, 2, h);
  ctx.fillRect(x - 5, ground - h, 10, 2);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, ground - h + 6, 4, 0, Math.PI * 2);
  ctx.fill();
}

const PAINT: Record<number, Painter> = {
  // L1 — đồi tre nhẹ nhàng, mái đình thanh thoát, không gây rối mắt
  1: (f, n, fw, nw, _H, th, rnd) => {
    hills(f, fw, GROUND - 150, 40, th.far[0], rnd);
    hills(f, fw, GROUND - 110, 34, th.far[1], rnd);
    hills(f, fw, GROUND - 70, 26, th.far[2], rnd);
    for (let x = 40; x < fw; x += 220 + rnd() * 100) bamboo(f, x, GROUND - 60, 60 + rnd() * 25, "#DDD0B5");
    for (let x = 120; x < nw; x += 260 + rnd() * 140) bamboo(n, x, GROUND, 80 + rnd() * 40, th.near[2]);
    for (let x = 320; x < nw; x += 750 + rnd() * 300) communalHouse(n, x, GROUND, 140, th.near[1]);
    for (let x = 600; x < nw; x += 1000 + rnd() * 400) {
      n.save();
      n.globalAlpha = 0.35;
      flagPole(n, x, GROUND, 110, 1, 0);
      n.fillStyle = "#A8886B"; // loa phóng thanh
      n.beginPath();
      n.moveTo(x + 2, GROUND - 86);
      n.lineTo(x + 16, GROUND - 93);
      n.lineTo(x + 16, GROUND - 79);
      n.closePath();
      n.fill();
      n.restore();
    }
  },
  // L2 — nhà máy xa, khối nhà tập thể thanh tao, không có viền đen thô
  2: (f, n, fw, nw, _H, th, rnd) => {
    hills(f, fw, GROUND - 90, 18, th.far[0], rnd);
    for (let x = 0; x < fw; x += 150 + rnd() * 90) factory(f, x, GROUND - 40, 90 + rnd() * 60, 40 + rnd() * 30, th.far[2]);
    for (let x = 60; x < nw; x += 300 + rnd() * 160) {
      const w = 110 + rnd() * 50;
      box(n, x, GROUND - 120, w, 120, th.near[0], 0);
      for (let y = GROUND - 112; y < GROUND - 14; y += 26) {
        for (let xx = x + 10; xx < x + w - 16; xx += 22) {
          box(n, xx, y, 11, 13, "rgba(255,255,255,0.7)", 0);
        }
      }
    }
    for (let x = 0; x < nw; x += 260) {
      n.fillStyle = "rgba(130, 145, 155, 0.35)";
      n.fillRect(x, GROUND - 140, 2, 140);
      n.fillRect(x - 8, GROUND - 136, 18, 2);
      n.strokeStyle = "rgba(130, 145, 155, 0.22)";
      n.lineWidth = 1;
      n.beginPath();
      n.moveTo(x + 1, GROUND - 135);
      n.quadraticCurveTo(x + 130, GROUND - 114, x + 261, GROUND - 135);
      n.stroke();
    }
    for (let x = 200; x < nw; x += 600 + rnd() * 200) {
      n.strokeStyle = "rgba(110, 125, 135, 0.3)";
      n.lineWidth = 1.5;
      n.beginPath();
      n.arc(x, GROUND - 9, 8, 0, Math.PI * 2);
      n.arc(x + 26, GROUND - 9, 8, 0, Math.PI * 2);
      n.moveTo(x, GROUND - 9);
      n.lineTo(x + 12, GROUND - 22);
      n.lineTo(x + 26, GROUND - 9);
      n.stroke();
    }
  },
  // L3 — trụ sở cột trắng, hàng cây tỉa tao nhã, lan can, đèn cổ điển (mờ dịu, thoáng đãng)
  3: (f, n, fw, nw, _H, th, rnd) => {
    hills(f, fw, GROUND - 70, 12, th.far[2], rnd);
    for (let x = 80; x < fw; x += 480 + rnd() * 160) columnsBuilding(f, x, GROUND - 40, 190, 100, th.far[0], "rgba(195, 215, 208, 0.35)");
    for (let x = 60; x < nw; x += 180 + rnd() * 80) {
      n.fillStyle = "rgba(160, 175, 170, 0.25)";
      n.fillRect(x - 1, GROUND - 32, 2, 32);
      n.fillStyle = th.near[0];
      n.beginPath();
      n.arc(x, GROUND - 40, 14, 0, Math.PI * 2);
      n.fill();
    }
    n.fillStyle = "rgba(180, 198, 192, 0.25)"; // lan can đá mờ nhạt, khoảng cách thoáng đãng
    for (let x = 0; x < nw; x += 48) n.fillRect(x, GROUND - 14, 3, 14);
    n.fillRect(0, GROUND - 16, nw, 2.5);
    for (let x = 180; x < nw; x += 480) {
      lamp(n, x, GROUND, 90, "rgba(130,150,155,0.3)", "#FFFDF0");
    }
  },
  // L4 — thành phố kính trang nhã, dải cờ giữa cột đèn (màu pastel mỏng, không rối)
  4: (f, n, fw, nw, _H, th, rnd) => {
    for (let x = 0; x < fw; x += 75 + rnd() * 50) tower(f, x, GROUND - 30, 36 + rnd() * 32, 110 + rnd() * 150, th.far[0], "rgba(255,255,255,0.22)", rnd);
    for (let x = 60; x < nw; x += 320 + rnd() * 140) {
      const w = 90 + rnd() * 50;
      tower(n, x, GROUND, w, 85 + rnd() * 45, th.near[0], "rgba(255,255,255,0.25)", rnd);
      n.fillStyle = "rgba(255,255,255,0.12)"; // vệt phản chiếu kính mờ dịu
      n.beginPath();
      n.moveTo(x + 10, GROUND - 10);
      n.lineTo(x + 30, GROUND - 75);
      n.lineTo(x + 38, GROUND - 75);
      n.lineTo(x + 18, GROUND - 10);
      n.fill();
    }
    for (let x = 0; x < nw; x += 360) {
      lamp(n, x, GROUND, 130, "rgba(110,135,160,0.25)", "#FFFFFF");
      for (let i = 0; i < 8; i++) {
        const px = x + 14 + i * 30;
        const py = GROUND - 120 + Math.sin((i / 7) * Math.PI) * 18;
        n.fillStyle = i % 2 ? "rgba(235, 195, 95, 0.22)" : "rgba(215, 115, 115, 0.22)";
        n.beginPath();
        n.moveTo(px, py);
        n.lineTo(px + 10, py);
        n.lineTo(px + 5, py + 10);
        n.fill();
      }
    }
  },
  // L5 — panorama 4 thời kỳ trái → phải, nhẹ nhàng và thanh lịch
  5: (f, n, fw, nw, _H, th, rnd) => {
    hills(f, fw, GROUND - 60, 16, th.far[0], rnd);
    const q = fw / 4;
    for (let x = 20; x < q; x += 180) communalHouse(f, x, GROUND - 40, 100, "#C79585");
    for (let x = q; x < 2 * q; x += 170) factory(f, x, GROUND - 40, 95, 45, "#D8C2AC");
    for (let x = 2 * q; x < 3 * q; x += 280) columnsBuilding(f, x, GROUND - 40, 160, 85, "#FFF7E4", "#E0CCA2");
    for (let x = 3 * q; x < fw; x += 60) tower(f, x, GROUND - 30, 34, 90 + rnd() * 110, "#EED8A8", "rgba(255,255,255,0.6)", rnd);
    for (let x = 80; x < nw; x += 300) {
      n.save();
      n.globalAlpha = 0.35;
      flagPole(n, x, GROUND, 100, 1, 0);
      n.restore();
    }
    for (let x = 20; x < nw; x += 45 + rnd() * 30) {
      n.fillStyle = "rgba(70, 130, 65, 0.55)";
      n.fillRect(x, GROUND - 12, 1.5, 12);
      star(n, x + 0.5, GROUND - 14, 5, "rgba(245, 195, 50, 0.7)");
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
    ctx.fillStyle = theme.era === 2 ? `rgba(255,220,180,${0.18 + dawn * 0.28})` : "rgba(255,245,210,0.28)"; // mặt trời dịu êm
    ctx.beginPath();
    ctx.arc(W * 0.78, H * 0.22 + (1 - dawn) * 30, 46, 0, Math.PI * 2);
    ctx.fill();
  }

  const bd = getBackdrop(level, theme);

  // Lớp xa (cuộn 0.2x): mờ xa, hòa vào nền trời (era 3 & 4 mờ hơn hẳn để tập trung chơi)
  const farAlpha = (theme.era === 3 || theme.era === 4) ? 0.2 : 0.45;
  ctx.save();
  ctx.globalAlpha = farAlpha;
  ctx.drawImage(bd.far, -Math.round(camX * FAR), 0);
  ctx.restore();

  // khói ống khói L2: mây khói trắng hồng bồng bềnh, mỏng nhẹ
  if (theme.era === 2) {
    ctx.fillStyle = dawn > 0 ? "rgba(255, 235, 225, 0.5)" : "rgba(255, 255, 255, 0.45)";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 180 - camX * FAR) % (W + 100) + W + 100) % (W + 100) - 50;
      const y = GROUND - 170 - ((t * 12 + i * 28) % 55);
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.arc(x, y, 12 + ((t * 12 + i * 28) % 55) / 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Lớp gần (cuộn 0.5x): nhẹ nhàng, làm nền cho màn chơi
  const nearAlpha = (theme.era === 3 || theme.era === 4) ? 0.25 : 0.6;
  ctx.save();
  ctx.globalAlpha = nearAlpha;
  ctx.drawImage(bd.near, -Math.round(camX * NEAR), 0);
  ctx.restore();

  // tia nắng xiên nhẹ (L3; L2 từ phần 4)
  if (theme.era === 3 || dawn > 0) {
    ctx.fillStyle = theme.era === 3 ? "rgba(255,255,255,0.04)" : `rgba(255,230,190,${0.16 * dawn})`;
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
    ctx.fillStyle = theme.era === 1 ? "rgba(180,140,80,0.22)" : "rgba(227,178,60,0.38)";
    for (let i = 0; i < 18; i++) {
      const x = (i * 97 + t * 12) % W;
      const y = theme.era === 1 ? (i * 53 + Math.sin(t + i) * 10) % H : H - ((i * 71 + t * 30) % H);
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // ô cửa sổ L4 bật/tắt chậm (rất mờ nhẹ)
  if (theme.era === 4) {
    ctx.fillStyle = "rgba(242,210,122,0.2)";
    for (let i = 0; i < 4; i++) if (Math.sin(t * 0.7 + i * 2.3) > 0.75) ctx.fillRect((i * 113 + 40) % W, 120 + ((i * 37) % 120), 4, 6);
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
