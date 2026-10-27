# 06 · Đồ họa trong canvas — bộ áo sáng 5 thời kỳ (repo `mlngame`)

Thư mục mới `src/theme/` (chỉ web, server không dùng). `renderer.ts` chỉ còn điều phối thứ tự vẽ; mọi hình nằm trong `theme/`.

| File | Vẽ gì |
|------|-------|
| `palette.ts` | bảng màu sáng 5 thời kỳ, trộn màu, trời L2 chuyển bình minh ở phần 4–5 |
| `rng.ts` | số ngẫu nhiên có hạt giống (nền/đạo cụ giống nhau mọi máy) |
| `draw.ts` | nét dùng chung: sao, cờ đỏ sao vàng, cột cờ, sách Hiến pháp, bánh răng, nhãn |
| `backdrop.ts` | trời + nền xa (0,2×) + nền gần (0,5×) vẽ sẵn 1 lần/level; khói, tia nắng, bụi, góc tối |
| `tiles.ts` | gạch 32×32 theo thời kỳ (đất nện · gạch đỏ · granite · cẩm thạch · đá vàng trống đồng), gai |
| `gates.ts` | cổng mốc 4×5 ô (cổng làng · nhà máy · vòm đá · cổng kính · cổng vàng) + bảng năm; cửa cuối level |
| `mechanics.ts` | 17 cơ chế: trần chữ chạy, cổng chặn, cầu, băng, băng chuyền, sàn sụp tem phiếu, vùng giấy tờ, phiếu, Hiến pháp, mảnh chữ, hòm phiếu, vòm chữ, nút / 3 trụ Lập–Hành–Tư pháp, bục số, sàn chở (bè · phà · thang kính · kiệu), khối số / hồ sơ "Bãi bỏ", khối đỏ (gạch · búa · con lắc · găng), cán cân, cờ người dẫn |
| `props.ts` | 4 đạo cụ/phần × 25 phần (bảng B10), tự đặt lên ô nền trống, không đè vật thể |
| `particles.ts` | ≤ 200 hạt (bụi, chim giấy, hạt vàng, pháo hoa) + rung màn 2 px |

Đo trên bản sao: **~3,5 ms/khung** với 5 người (ngân sách 60 FPS là 16,7 ms).

## Bước 1 — Thư mục `src/theme/`

**Tạo mới** `src/theme/palette.ts`:

````ts
// src/theme/palette.ts
// "Bộ áo" màu của 5 thời kỳ trên canvas — THEME SÁNG (nền nhạt, màu đậm chỉ làm nhấn/viền).
// Level luyện tập dùng theme Level 1.

export interface Theme {
  era: number; // 1..5
  sky: [string, string]; // gradient trời trên → dưới
  skyDawn?: [string, string]; // L2: trời bình minh ở phần 4–5
  far: string[]; // màu lớp nền xa (cuộn 0,2×)
  near: string[]; // màu lớp nền gần (cuộn 0,5×)
  tile: { base: string; joint: string; edge: string }; // gạch: nền · mạch · viền sáng mép trên
  accent: string; // màu nhấn (cờ, viền, chữ năm)
  gold: string;
  ink: string;
  paper: string; // nền bảng chữ
  vignette: number; // độ tối góc 0..1
}

export const THEMES: Record<number, Theme> = {
  1: {
    era: 1,
    sky: ["#FBF3DF", "#F1E2BC"],
    far: ["#E2CFA4", "#D6BF8E", "#C9AE7C"],
    near: ["#B9A06E", "#8A3B2A", "#6C5A33"],
    tile: { base: "#C89B6A", joint: "#9C6B3F", edge: "#E9C99A" },
    accent: "#B5382A",
    gold: "#C9A24A",
    ink: "#222222",
    paper: "#FBF5E6",
    vignette: 0.15,
  },
  2: {
    era: 2,
    sky: ["#E7EDF0", "#D3DDE2"],
    skyDawn: ["#FFE6D2", "#FFF6EA"],
    far: ["#B7C4CB", "#A3B2BA", "#8FA3AD"],
    near: ["#C98A6F", "#8FA3AD", "#6E8290"],
    tile: { base: "#C4705A", joint: "#8F4E3C", edge: "#E0B7A5" },
    accent: "#A4533A",
    gold: "#D9B84A",
    ink: "#222222",
    paper: "#F6F3EC",
    vignette: 0.08,
  },
  3: {
    era: 3,
    sky: ["#E6F4EF", "#FAF7EE"],
    far: ["#E9EFEC", "#DDE6E2", "#CFDCD7"],
    near: ["#9CCBBE", "#B9BEC2", "#2E8B7A"],
    tile: { base: "#D5D9DC", joint: "#A9AEB3", edge: "#FFFFFF" },
    accent: "#2E8B7A",
    gold: "#D4A338",
    ink: "#222222",
    paper: "#FAF8F0",
    vignette: 0,
  },
  4: {
    era: 4,
    sky: ["#E4ECF6", "#F7F9FC"],
    far: ["#C3D2E6", "#F2D27A", "#B0C2DA"],
    near: ["#9DB2CF", "#C62828", "#14305C"],
    tile: { base: "#D9E0EA", joint: "#B3BFD2", edge: "#D9A92B" },
    accent: "#14305C",
    gold: "#D9A92B",
    ink: "#222222",
    paper: "#FFFFFF",
    vignette: 0,
  },
  5: {
    era: 5,
    sky: ["#FFE9C7", "#FFF7E6"],
    far: ["#F3D9A0", "#E8C27A", "#DDB066"],
    near: ["#E8B96A", "#C8102E", "#B8861A"],
    tile: { base: "#EBC25E", joint: "#B8861A", edge: "#FFF1C2" },
    accent: "#C8102E",
    gold: "#E3B23C",
    ink: "#222222",
    paper: "#FFF8E8",
    vignette: 0,
  },
};

/** Theme của level ("1".."5"); level lạ / luyện tập → Level 1. */
export function themeFor(levelId: string): Theme {
  return THEMES[Number(levelId)] ?? THEMES[1];
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Trộn 2 màu #rrggbb, t kẹp trong 0..1. */
export function mixColor(a: string, b: string, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const x = hex(a);
  const y = hex(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("");
}

/** Trời theo phần: L2 chuyển dần sang bình minh (phần 0–2 lạnh, 3 nửa, 4 bình minh); level khác giữ nguyên. */
export function skyFor(theme: Theme, part: number): [string, string] {
  const t = dawnOf(theme, part);
  if (!theme.skyDawn || t === 0) return theme.sky;
  return [mixColor(theme.sky[0], theme.skyDawn[0], t), mixColor(theme.sky[1], theme.skyDawn[1], t)];
}

/** 0..1: L2 đã sang bình minh tới đâu (khói nhà máy đổi màu, tia nắng). */
export function dawnOf(theme: Theme, part: number): number {
  if (!theme.skyDawn) return 0;
  return part <= 2 ? 0 : part === 3 ? 0.5 : 1;
}
````

**Tạo mới** `src/theme/rng.ts`:

````ts
// src/theme/rng.ts
// Số ngẫu nhiên có hạt giống: cùng level → cùng nền / đạo cụ ở mọi máy, mọi lần vẽ.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash chuỗi → số nguyên dương (FNV-1a). */
export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
````

**Tạo mới** `src/theme/draw.ts`:

````ts
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
````

**Tạo mới** `src/theme/backdrop.ts`:

````ts
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
````

**Tạo mới** `src/theme/tiles.ts`:

````ts
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
    case 1: // đất nện + đá ong lỗ chỗ
      for (let i = 0; i < 14; i++) {
        g.globalAlpha = 0.35 + rnd() * 0.4;
        g.beginPath();
        g.arc(rnd() * TILE, rnd() * TILE, 1 + rnd() * 2, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      break;
    case 2: // gạch đỏ cũ ghép so le
      g.fillRect(0, 15, TILE, 2);
      g.fillRect(0, 31, TILE, 1);
      g.fillRect(15, 0, 2, 15);
      g.fillRect(0, 17, 1, 14);
      g.fillRect(31, 17, 1, 14);
      g.globalAlpha = 0.25;
      g.fillRect(4, 4, 6, 3); // vết sứt
      g.globalAlpha = 1;
      break;
    case 3: // granite hạt mịn, đường ghép đá vuông
      for (let i = 0; i < 30; i++) {
        g.globalAlpha = 0.3;
        g.fillRect(rnd() * TILE, rnd() * TILE, 1, 1);
      }
      g.globalAlpha = 1;
      g.lineWidth = 1;
      g.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
      break;
    case 4: // cẩm thạch trắng kẻ vân
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, 8 + rnd() * 6);
      g.bezierCurveTo(10, 2, 18, 26, 32, 14 + rnd() * 6);
      g.stroke();
      g.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
      break;
    default: // 5: đá vàng chạm vòng tròn đồng tâm (trống đồng)
      g.globalAlpha = 0.45;
      g.lineWidth = 1.5;
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
    ctx.fillStyle = "rgba(0,0,0,0.18)"; // mép dưới tối
    ctx.fillRect(r.x * TILE, (r.y + r.h) * TILE - 2, r.w * TILE, 2);
    if (th.era === 1 && r.y > 0 && r.y < level.h - 1) {
      ctx.fillStyle = "#6E8B3D"; // cỏ ở mép trên
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
````

**Tạo mới** `src/theme/gates.ts`:

````ts
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
````

**Tạo mới** `src/theme/mechanics.ts`:

````ts
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
````

**Tạo mới** `src/theme/props.ts`:

````ts
// src/theme/props.ts
// Đạo cụ trang trí theo phần (spec B10) — chỉ để nhìn, không va chạm, không gửi qua server.
// Vị trí tự chọn: rải đều trong phần, mỗi đạo cụ đứng trên ô nền trống gần nhất (không đứng giữa hố / vật thể);
// đạo cụ treo (hang) treo dưới trần ở chỗ trống.
import { TILE } from "../lib/constants";
import type { Level } from "../game/level";
import { book, box, flag, flagPole, gear, star } from "./draw";
import type { Theme } from "./palette";

export type PropKind =
  | "flag" | "loudspeaker" | "lamp" | "scroll" | "straw" | "crate" | "table" | "hut" | "fence" | "board"
  | "hats" | "book" | "bicycle" | "chimney" | "gear" | "seats" | "podium" | "carpet" | "scale" | "column"
  | "vase" | "torch" | "files" | "stamp" | "pillars" | "frame"
  // treo
  | "chain" | "banner" | "bulb" | "garland" | "sun";

export const HANGING: ReadonlySet<PropKind> = new Set<PropKind>(["chain", "banner", "bulb", "garland", "sun"]);

/** PROPS[level][phần] — đúng bảng B10 (gộp đạo cụ giống nhau về cùng một kiểu vẽ). */
export const PROPS: Record<string, PropKind[][]> = {
  "1": [
    ["lamp", "scroll", "straw", "fence"],
    ["flag", "flag", "loudspeaker", "crate"],
    ["table", "hut", "fence", "board"],
    ["flag", "straw", "hats", "fence"],
    ["table", "flag", "lamp", "book"],
  ],
  "2": [
    ["scroll", "flag", "banner", "crate"],
    ["crate", "scroll", "board", "bicycle"],
    ["chimney", "gear", "crate", "chain"],
    ["banner", "bulb", "seats", "flag"],
    ["straw", "chimney", "sun", "straw"],
  ],
  "3": [
    ["table", "files", "lamp", "crate"],
    ["podium", "flag", "carpet", "column"],
    ["scale", "column", "vase", "column"],
    ["column", "torch", "torch", "vase"],
    ["column", "garland", "vase", "flag"],
  ],
  "4": [
    ["book", "scroll", "board", "lamp"],
    ["pillars", "lamp", "garland", "vase"],
    ["board", "lamp", "scale", "lamp"],
    ["files", "stamp", "files", "lamp"],
    ["flag", "lamp", "garland", "book"],
  ],
  "5": [
    ["book", "flag", "vase", "garland"],
    ["frame", "carpet", "flag", "vase"],
    ["files", "crate", "stamp", "garland"],
    ["board", "lamp", "flag", "vase"],
    ["vase", "garland", "flag", "vase"],
  ],
};

export interface PlacedProp {
  kind: PropKind;
  x: number; // px tâm
  y: number; // px: mặt đất (đạo cụ đứng) hoặc mép trần (đạo cụ treo)
}

const placed = new Map<string, PlacedProp[]>();

/** Lưới ô bị chiếm: nền, gai, vùng chết, vật thể, cửa, cột mốc (đạo cụ không đè lên). */
function occupancy(level: Level): { solid: boolean[][]; busy: boolean[][] } {
  const mk = () => Array.from({ length: level.h }, () => new Array<boolean>(level.w).fill(false));
  const solid = mk();
  const busy = mk();
  const mark = (g: boolean[][], r: { x: number; y: number; w: number; h: number }) => {
    for (let y = Math.max(0, r.y); y < Math.min(level.h, r.y + r.h); y++)
      for (let x = Math.max(0, r.x); x < Math.min(level.w, r.x + r.w); x++) g[y][x] = true;
  };
  level.solids.forEach((r) => mark(solid, r));
  [...level.spikes, ...level.hazards, ...level.objects.map((o) => o.rect)].forEach((r) => mark(busy, r));
  if (level.door) mark(busy, { ...level.door, x: level.door.x - 1, w: level.door.w + 2 });
  level.checkpoints.forEach((c) => mark(busy, { x: c.x, y: c.y - 4, w: 5, h: 5 })); // chỗ cổng mốc + hồi sinh
  return { solid, busy };
}

/** Vị trí đạo cụ của cả level (cache theo id). */
export function placeProps(level: Level): PlacedProp[] {
  const hit = placed.get(level.id);
  if (hit) return hit;
  const out: PlacedProp[] = [];
  const kinds = PROPS[level.id];
  if (kinds) {
    const { solid, busy } = occupancy(level);
    const free = (x: number, y: number) => x > 0 && x < level.w - 1 && !solid[y][x] && !busy[y][x];
    const starts = level.partOf.map((p, si) => (si === 0 || level.partOf[si - 1] !== p ? level.segX[si] : -1)).filter((x) => x >= 0);
    kinds.forEach((list, part) => {
      const x0 = starts[part];
      const x1 = starts[part + 1] ?? level.w - 1;
      list.forEach((kind, i) => {
        const target = Math.round(x0 + ((i + 0.5) * (x1 - x0)) / list.length);
        for (let d = 0; d < (x1 - x0) / 2; d++) {
          for (const x of [target + d, target - d]) {
            if (x < x0 || x >= x1) continue;
            if (HANGING.has(kind)) {
              if (solid[0][x] && free(x, 1) && free(x, 2) && free(x, 3)) {
                out.push({ kind, x: (x + 0.5) * TILE, y: TILE });
                return;
              }
            } else {
              for (let y = 11; y >= 3; y--) {
                if (free(x, y) && solid[y + 1]?.[x] && free(x, y - 1)) {
                  out.push({ kind, x: (x + 0.5) * TILE, y: (y + 1) * TILE });
                  return;
                }
              }
            }
          }
        }
      });
    });
  }
  placed.set(level.id, out);
  return out;
}

type Paint = (ctx: CanvasRenderingContext2D, x: number, y: number, th: Theme, t: number) => void;

const PAINT: Record<PropKind, Paint> = {
  flag: (c, x, y, _th, t) => flagPole(c, x, y, 70, 1, t),
  loudspeaker: (c, x, y) => {
    c.fillStyle = "#6D4C41";
    c.fillRect(x - 2, y - 70, 4, 70);
    for (const s of [-1, 1]) {
      c.fillStyle = "#757575";
      c.beginPath();
      c.moveTo(x, y - 64);
      c.lineTo(x + s * 16, y - 72);
      c.lineTo(x + s * 16, y - 56);
      c.closePath();
      c.fill();
    }
  },
  lamp: (c, x, y, th, t) => {
    if (th.era === 1) {
      c.fillStyle = "#6D4C41"; // cột gỗ + đèn dầu treo
      c.fillRect(x - 2, y - 46, 4, 46);
      c.fillRect(x, y - 46, 12, 3);
      c.fillStyle = `rgba(255,183,77,${0.7 + 0.2 * Math.sin(t * 8)})`;
      c.beginPath();
      c.arc(x + 12, y - 36, 5, 0, Math.PI * 2);
      c.fill();
      return;
    }
    const pole = th.era === 4 ? "#14305C" : th.era === 5 ? "#B8861A" : "#455A64";
    c.fillStyle = pole;
    c.fillRect(x - 2, y - 64, 4, 64);
    c.fillStyle = th.era === 4 ? "rgba(200,230,255,0.9)" : "#FFF3C4";
    c.beginPath();
    c.arc(x, y - 66, 6, 0, Math.PI * 2);
    c.fill();
  },
  scroll: (c, x, y) => {
    box(c, x - 14, y - 52, 28, 34, "#F5E6C8", 1.5, "#8D6E63");
    c.fillStyle = "#A1887F";
    for (let i = 0; i < 4; i++) c.fillRect(x - 9, y - 46 + i * 7, 18, 2);
    c.fillRect(x - 2, y - 18, 4, 18);
  },
  straw: (c, x, y) => {
    c.fillStyle = "#D4B054";
    c.beginPath();
    c.moveTo(x - 12, y);
    c.lineTo(x - 4, y - 26);
    c.lineTo(x + 4, y - 26);
    c.lineTo(x + 12, y);
    c.fill();
    c.fillStyle = "#8D6E63";
    c.fillRect(x - 7, y - 14, 14, 3);
  },
  crate: (c, x, y, th) => {
    box(c, x - 13, y - 24, 26, 24, th.era === 2 ? "#78909C" : "#A1887F", 2);
    c.strokeStyle = "rgba(0,0,0,0.35)";
    c.beginPath();
    c.moveTo(x - 13, y - 24);
    c.lineTo(x + 13, y);
    c.stroke();
  },
  table: (c, x, y, th) => {
    box(c, x - 20, y - 22, 40, 5, "#8D6E63", 1.5);
    c.fillStyle = "#6D4C41";
    c.fillRect(x - 17, y - 17, 3, 17);
    c.fillRect(x + 14, y - 17, 3, 17);
    if (th.era === 1) box(c, x - 7, y - 34, 14, 12, "#A0522D", 1.5); // hòm gỗ nhỏ trên bàn
    else box(c, x - 10, y - 30, 20, 8, "#FFFFFF", 1);
  },
  hut: (c, x, y) => {
    box(c, x - 20, y - 26, 40, 26, "#D7B98A", 2);
    c.fillStyle = "#B08A4E";
    c.beginPath();
    c.moveTo(x - 28, y - 24);
    c.lineTo(x, y - 46);
    c.lineTo(x + 28, y - 24);
    c.closePath();
    c.fill();
  },
  fence: (c, x, y) => {
    c.fillStyle = "#8D7A4A";
    for (let i = -2; i <= 2; i++) c.fillRect(x + i * 7 - 1.5, y - 22, 3, 22);
    c.fillRect(x - 16, y - 16, 32, 2);
  },
  board: (c, x, y, th) => {
    c.fillStyle = "#6D4C41";
    c.fillRect(x - 1.5, y - 30, 3, 30);
    box(c, x - 16, y - 46, 32, 20, th.era >= 4 ? "#ECEFF1" : "#D7CCC8", 2);
  },
  hats: (c, x, y) => {
    box(c, x - 18, y - 16, 36, 4, "#8D6E63", 1);
    for (const dx of [-8, 8]) {
      c.fillStyle = "#E6C77A";
      c.beginPath();
      c.moveTo(x + dx - 9, y - 16);
      c.lineTo(x + dx, y - 26);
      c.lineTo(x + dx + 9, y - 16);
      c.fill();
    }
  },
  book: (c, x, y) => {
    box(c, x - 10, y - 18, 20, 18, "#8D6E63", 1.5); // giá gỗ
    book(c, x, y - 32, 18, 22);
  },
  bicycle: (c, x, y) => {
    c.strokeStyle = "#37474F";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x - 12, y - 9, 8, 0, Math.PI * 2);
    c.moveTo(x + 20, y - 9);
    c.arc(x + 12, y - 9, 8, 0, Math.PI * 2);
    c.moveTo(x - 12, y - 9);
    c.lineTo(x - 2, y - 22);
    c.lineTo(x + 12, y - 9);
    c.stroke();
  },
  chimney: (c, x, y, th, t) => {
    box(c, x - 8, y - 70, 16, 70, "#8D6E63", 2);
    if (th.era === 2 && t >= 0) {
      c.fillStyle = "rgba(240,240,240,0.7)";
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(x + i * 6, y - 78 - ((t * 20 + i * 12) % 36), 7 + i * 2, 0, Math.PI * 2);
        c.fill();
      }
    }
  },
  gear: (c, x, y) => {
    gear(c, x - 6, y - 14, 14, "#8D6E63");
    gear(c, x + 12, y - 8, 9, "#A1887F", 0.4);
  },
  seats: (c, x, y) => {
    for (let i = -1; i <= 1; i++) {
      box(c, x + i * 14 - 6, y - 16, 12, 6, "#B71C1C", 1);
      c.fillStyle = "#5D4037";
      c.fillRect(x + i * 14 - 5, y - 10, 2, 10);
      c.fillRect(x + i * 14 + 3, y - 10, 2, 10);
    }
  },
  podium: (c, x, y) => {
    box(c, x - 14, y - 34, 28, 34, "#8D6E63", 2);
    star(c, x, y - 20, 6, "#FFD600");
    c.fillStyle = "#37474F";
    c.fillRect(x - 6, y - 46, 2, 12);
    c.fillRect(x + 4, y - 46, 2, 12);
  },
  carpet: (c, x, y) => {
    c.fillStyle = "#C62828";
    c.fillRect(x - 40, y - 3, 80, 3);
  },
  scale: (c, x, y) => {
    c.fillStyle = "#B8861A";
    c.fillRect(x - 2, y - 56, 4, 56);
    c.fillRect(x - 24, y - 54, 48, 3);
    for (const s of [-1, 1]) {
      c.strokeStyle = "#B8861A";
      c.beginPath();
      c.moveTo(x + s * 22, y - 52);
      c.lineTo(x + s * 22, y - 38);
      c.stroke();
      c.fillStyle = "#E3B23C";
      c.beginPath();
      c.ellipse(x + s * 22, y - 37, 9, 3, 0, 0, Math.PI);
      c.fill();
    }
    box(c, x - 10, y - 6, 20, 6, "#8D6E63", 1);
  },
  column: (c, x, y) => {
    box(c, x - 9, y - 80, 18, 80, "#FAFAFA", 2, "#B0BEC5");
    c.fillStyle = "#CFD8DC";
    for (let i = -1; i <= 1; i++) c.fillRect(x + i * 5 - 0.5, y - 76, 1, 72);
    box(c, x - 13, y - 86, 26, 6, "#ECEFF1", 1.5, "#B0BEC5");
  },
  vase: (c, x, y) => {
    c.fillStyle = "#1565C0";
    c.beginPath();
    c.ellipse(x, y - 10, 8, 10, 0, 0, Math.PI * 2);
    c.fill();
    for (let i = -1; i <= 1; i++) star(c, x + i * 7, y - 26 - Math.abs(i) * 2, 5, i ? "#FFC107" : "#E53935");
  },
  torch: (c, x, y, _th, t) => {
    c.fillStyle = "#5D4037";
    c.fillRect(x - 2, y - 40, 4, 40);
    c.fillStyle = `rgba(255,${140 + Math.round(40 * Math.sin(t * 10))},0,0.9)`;
    c.beginPath();
    c.ellipse(x, y - 46, 5, 9, 0, 0, Math.PI * 2);
    c.fill();
  },
  files: (c, x, y) => {
    for (let i = 0; i < 5; i++) box(c, x - 14 + (i % 2) * 2, y - 6 - i * 6, 28, 6, i % 2 ? "#FFF8E1" : "#F5E6C8", 1, "#8D6E63");
  },
  stamp: (c, x, y) => {
    c.strokeStyle = "rgba(198,40,40,0.45)";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(x, y - 60, 20, 0, Math.PI * 2);
    c.stroke();
    star(c, x, y - 60, 9, "rgba(198,40,40,0.45)");
  },
  pillars: (c, x, y) => {
    [-24, 0, 24].forEach((dx, i) => {
      box(c, x + dx - 7, y - 40, 14, 40, "#ECEFF1", 1.5);
      if (i === 0) book(c, x + dx, y - 50, 10, 12);
      else if (i === 1) gear(c, x + dx, y - 50, 7, "#14305C");
      else box(c, x + dx - 6, y - 54, 12, 6, "#6D4C41", 1);
    });
  },
  frame: (c, x, y) => {
    c.strokeStyle = "#E3B23C";
    c.lineWidth = 6;
    c.strokeRect(x - 30, y - 90, 60, 60);
    flag(c, x - 18, y - 74, 36, 26, 0);
  },
  chain: (c, x, y) => {
    c.strokeStyle = "#757575";
    c.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.ellipse(x, y + 6 + i * 9, 3, 5, 0, 0, Math.PI * 2);
      c.stroke();
    }
  },
  banner: (c, x, y, _th, t) => {
    c.fillStyle = "#C62828";
    c.beginPath();
    c.moveTo(x - 48, y + 6);
    c.quadraticCurveTo(x, y + 14 + Math.sin(t * 2) * 2, x + 48, y + 6);
    c.lineTo(x + 48, y + 26);
    c.quadraticCurveTo(x, y + 34 + Math.sin(t * 2) * 2, x - 48, y + 26);
    c.fill();
    star(c, x, y + 20, 6, "#FFD600");
  },
  bulb: (c, x, y, _th, t) => {
    c.fillStyle = "#424242";
    c.fillRect(x - 1, y, 2, 26);
    c.fillStyle = `rgba(255,241,118,${0.75 + 0.2 * Math.sin(t * 3)})`;
    c.beginPath();
    c.arc(x, y + 34, 9, 0, Math.PI * 2);
    c.fill();
  },
  garland: (c, x, y) => {
    for (let i = 0; i < 7; i++) {
      const px = x - 42 + i * 14;
      const py = y + 8 + Math.sin((i / 6) * Math.PI) * 12;
      c.fillStyle = i % 2 ? "#FFD600" : "#D32F2F";
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + 10, py);
      c.lineTo(px + 5, py + 10);
      c.fill();
    }
  },
  sun: (c, x, y, _th, t) => {
    c.fillStyle = "rgba(255,183,77,0.85)";
    c.beginPath();
    c.arc(x, y + 50, 22, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(255,183,77,0.6)";
    c.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = t * 0.3 + (i * Math.PI) / 6;
      c.beginPath();
      c.moveTo(x + Math.cos(a) * 28, y + 50 + Math.sin(a) * 28);
      c.lineTo(x + Math.cos(a) * 38, y + 50 + Math.sin(a) * 38);
      c.stroke();
    }
  },
};

/** Vẽ đạo cụ trong khung nhìn (ctx đã translate theo camera). */
export function drawProps(ctx: CanvasRenderingContext2D, level: Level, th: Theme, camX: number, W: number, t: number): void {
  ctx.save();
  ctx.globalAlpha = 0.9;
  for (const p of placeProps(level)) if (p.x > camX - 120 && p.x < camX + W + 120) PAINT[p.kind](ctx, p.x, p.y, th, t);
  ctx.restore();
}
````

**Tạo mới** `src/theme/particles.ts`:

````ts
// src/theme/particles.ts
// Hệ hạt nhỏ dùng chung (spec B12): bụi, giấy, chim giấy, hạt vàng, pháo hoa — tối đa 200 hạt, không cần ảnh.
// Rung màn hình 2 px / 120 ms.

export type ParticleKind = "dust" | "paper" | "bird" | "gold" | "firework";

interface P {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // giây còn lại
  max: number;
  color: string;
}

const FIRE = ["#FFD600", "#FF7043", "#E53935", "#FFF59D"];

export class Particles {
  private list: P[] = [];
  private readonly cap: number;

  constructor(cap = 200) {
    this.cap = cap;
  }

  get count(): number {
    return this.list.length;
  }

  clear(): void {
    this.list = [];
  }

  /** Thêm n hạt quanh (x, y) px thế giới; vượt trần thì bỏ hạt cũ nhất. */
  emit(kind: ParticleKind, x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = kind === "firework" ? 60 + Math.random() * 90 : 20 + Math.random() * 40;
      const life = kind === "bird" ? 2.2 : kind === "firework" ? 1.2 : 0.9;
      this.list.push({
        kind,
        x,
        y,
        vx: kind === "bird" ? 30 + Math.random() * 40 : Math.cos(a) * sp,
        vy: kind === "bird" || kind === "gold" ? -40 - Math.random() * 50 : Math.sin(a) * sp - (kind === "dust" ? 10 : 0),
        life,
        max: life,
        color: kind === "firework" ? FIRE[i % FIRE.length] : kind === "gold" ? "#FFC107" : kind === "dust" ? "#8D6E63" : "#FFFFFF",
      });
    }
    if (this.list.length > this.cap) this.list.splice(0, this.list.length - this.cap);
  }

  step(dt: number): void {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "dust" || p.kind === "paper" || p.kind === "firework") p.vy += 60 * dt; // rơi
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      if (p.kind === "bird") {
        ctx.strokeStyle = "#5D4037";
        ctx.lineWidth = 1;
        ctx.beginPath(); // chim giấy: chữ V vỗ cánh
        const f = Math.sin(p.life * 20) * 3;
        ctx.moveTo(p.x - 6, p.y - f);
        ctx.lineTo(p.x, p.y + 2);
        ctx.lineTo(p.x + 6, p.y - f);
        ctx.stroke();
      } else if (p.kind === "paper") ctx.fillRect(p.x - 3, p.y - 4, 6, 8);
      else ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
}

export class Shake {
  private until = 0;
  private px = 0;

  kick(now: number, px = 2, ms = 120): void {
    this.until = now + ms;
    this.px = px;
  }

  /** Độ lệch [x, y] px tại thời điểm now (ms). */
  offset(now: number): [number, number] {
    if (now >= this.until) return [0, 0];
    return [Math.round((Math.random() * 2 - 1) * this.px), Math.round((Math.random() * 2 - 1) * this.px)];
  }
}
````

**Tạo mới** `src/theme/theme.test.ts`:

````ts
// src/theme/theme.test.ts
// Phần tính toán của đồ họa (không cần canvas): màu, trời theo phần, hạt giống, cổng mốc, đạo cụ, hạt.
import { describe, expect, it } from "vitest";
import { getLevel, LEVEL_IDS } from "../game/level";
import { milestones } from "./gates";
import { constitutionYear, crumbleLabel, hazardStyle, marqueeOffset, pillarIcon } from "./mechanics";
import { mixColor, skyFor, themeFor } from "./palette";
import { Particles } from "./particles";
import { HANGING, PROPS } from "./props";
import { mulberry32, seedOf } from "./rng";

describe("bảng màu", () => {
  it("theme theo level, lạ → Level 1", () => {
    expect(themeFor("3").era).toBe(3);
    expect(themeFor("t1").era).toBe(1);
  });
  it("trộn màu", () => {
    expect(mixColor("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixColor("#123456", "#ffffff", -1)).toBe("#123456");
    expect(mixColor("#123456", "#ffffff", 2)).toBe("#ffffff");
  });
  it("Level 2 chuyển dần sang bình minh", () => {
    const th = themeFor("2");
    expect(skyFor(th, 0)).toEqual(th.sky);
    expect(skyFor(th, 4)).toEqual([mixColor(th.sky[0], th.skyDawn![0], 1), mixColor(th.sky[1], th.skyDawn![1], 1)]);
    expect(skyFor(th, 3)[0]).toBe(mixColor(th.sky[0], th.skyDawn![0], 0.5));
    expect(skyFor(themeFor("4"), 4)).toEqual(themeFor("4").sky);
  });
  it("theme sáng: trời mọi level đủ sáng (độ sáng > 0.8)", () => {
    for (const id of LEVEL_IDS) {
      const n = parseInt(themeFor(id).sky[0].slice(1), 16);
      const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
      expect(lum).toBeGreaterThan(0.8);
    }
  });
});

it("hạt giống: cùng level → cùng dãy số", () => {
  const a = mulberry32(seedOf("1"));
  const b = mulberry32(seedOf("1"));
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  expect(seedOf("1")).not.toBe(seedOf("2"));
});

it("cổng mốc: mỗi level 5 cổng, phần 0..4, cổng đầu ở xuất phát", () => {
  for (const id of LEVEL_IDS) {
    const ms = milestones(getLevel(id));
    expect(ms.map((m) => m.part)).toEqual([0, 1, 2, 3, 4]);
    expect(ms[0].cp).toBe(0);
  }
});

it("cơ chế: kiểu khối đỏ, trụ, năm Hiến pháp, chữ chạy, đếm ngược", () => {
  expect(["1", "2", "3", "4", "5", "t1"].map(hazardStyle)).toEqual(["brick", "hammer", "pendulum", "glove", "glove", "brick"]);
  expect([pillarIcon("lapphap"), pillarIcon("hanhphap"), pillarIcon("tuphap"), pillarIcon("dich"), pillarIcon(undefined)]).toEqual(["book", "gear", "gavel", null, null]);
  expect(["1", "3", "4", "5"].map(constitutionYear)).toEqual(["1946", "1992", "2013", "2013"]);
  expect(marqueeOffset(1, 40, 100)).toBe(40);
  expect(marqueeOffset(-1, 40, 100)).toBe(60);
  expect(crumbleLabel(0.8)).toBe("0.8s");
  expect(crumbleLabel(-0.2)).toBe("0.0s");
});

it("đạo cụ: 5 phần/level, 4–6 món/phần", () => {
  for (const id of LEVEL_IDS) {
    expect(PROPS[id]).toHaveLength(5);
    for (const list of PROPS[id]) {
      expect(list.length).toBeGreaterThanOrEqual(4);
      expect(list.length).toBeLessThanOrEqual(6);
    }
  }
  expect(HANGING.has("banner")).toBe(true);
});

it("hạt: tối đa 200, hết hạn thì biến mất", () => {
  const p = new Particles(200);
  p.emit("gold", 0, 0, 500);
  expect(p.count).toBe(200);
  p.step(10);
  expect(p.count).toBe(0);
});
````

## Bước 2 — Renderer

**Thay toàn bộ** `src/game/renderer.ts`:

````ts
// src/game/renderer.ts
// Điều phối vẽ một khung (bản 5). Hình vẽ nằm ở src/theme/*; file này chỉ đọc trạng thái và gọi theo thứ tự:
// trời + nền 2 lớp → đạo cụ → gạch → gai → trần → cổng mốc → cửa → vật thể → dây → người → vật đang mang → hạt → góc tối.
import { PHYS, PLAYER_SIZE, SLOT_COLORS, TILE, VIEW_W } from "../lib/constants";
import { drawBackdrop, drawVignette } from "../theme/backdrop";
import { drawCheckpointFlag, drawDoor, drawMilestone, milestones } from "../theme/gates";
import {
  constitutionYear,
  drawBallotBox,
  drawBox,
  drawBridge,
  drawCarryItem,
  drawCeiling,
  drawConveyor,
  drawCrumble,
  drawGate,
  drawGoal,
  drawHazard,
  drawIce,
  drawLeaderFlag,
  drawLift,
  drawMover,
  drawPad,
  drawSeesaw,
  drawSlowZone,
  drawWordArch,
  hazardStyle,
  pillarIcon,
  px,
  type R,
} from "../theme/mechanics";
import { label as drawLabel } from "../theme/draw";
import { themeFor, type Theme } from "../theme/palette";
import { Particles, Shake } from "../theme/particles";
import { drawProps } from "../theme/props";
import { drawSolids, drawSpikes } from "../theme/tiles";
import { partAt, type Level, type ObjDef, type Rect } from "./level";
import { carryState, crowdNeed, isActive, moverPadCount, objBit, sigBit, sigNeed, sigSources, type ObjView } from "./objects";
import { label as labelText, PARTS } from "./story";

export interface DrawPlayer {
  slot: string;
  x: number; // tâm, đơn vị ô
  y: number;
  name: string;
  avatar?: string;
}

export interface DrawState {
  players: DrawPlayer[];
  hasKey: boolean;
  won: boolean;
  /** Đang "Thua": slot của người gây ra + số giây đã trôi qua kể từ lúc thua (cho hoạt ảnh). */
  lose?: { slot: string; t: number } | null;
  levelName?: string;
  isLastLevel?: boolean;
  /** Trạng thái vật thể từ snapshot (null = level không có vật thể). */
  view?: ObjView | null;
  /** Vị trí thang/sàn chở/khối/khối đỏ đã nội suy (góc trên-trái); không có thì lấy từ view. */
  bodies?: [number, number][];
  /** Thời gian (giây) cho hoạt ảnh. */
  time?: number;
}

const INK = "#222222";

// ------------------------------------------------------------------ hiệu ứng theo thời gian (1 canvas / trang)
// Nhớ trạng thái khung trước để bắn hạt đúng lúc đổi (qua cổng, sàn vỡ, khối "Bãi bỏ" vào đích…).
const fx = {
  levelId: "",
  lastT: 0,
  cp: 0,
  passAt: new Map<number, number>(), // cp → thời điểm (giây) qua cổng mốc
  bits: new Map<number, boolean>(), // object id → bit khung trước
  counts: new Map<number, number>(), // hòm phiếu / khung chữ → số đã nộp khung trước
  won: false,
  particles: new Particles(200),
  shake: new Shake(),
};

function resetFx(levelId: string, t: number): void {
  fx.levelId = levelId;
  fx.cp = 0;
  fx.passAt.clear();
  fx.bits.clear();
  fx.counts.clear();
  fx.won = false;
  fx.particles.clear();
  fx.lastT = t;
}

/** Bit đổi từ false → true kể từ khung trước? */
function rose(id: number, now: boolean): boolean {
  const before = fx.bits.get(id) ?? now;
  fx.bits.set(id, now);
  return now && !before;
}

// ------------------------------------------------------------------ người chơi, dây

const imgCache = new Map<string, HTMLImageElement>();

function getImage(src: string): HTMLImageElement | null {
  let img = imgCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    imgCache.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

function slotColor(slot: string): string {
  const i = Number(slot.slice(1));
  return SLOT_COLORS[(Number.isFinite(i) ? i : 0) % SLOT_COLORS.length];
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: DrawPlayer): void {
  const size = Math.round(PLAYER_SIZE * TILE);
  const x = Math.round(p.x * TILE - size / 2);
  const y = Math.round(p.y * TILE - size / 2);

  ctx.fillStyle = "rgba(0,0,0,0.2)"; // bóng đổ dưới chân
  ctx.beginPath();
  ctx.ellipse(x + size / 2, y + size + 2, size * 0.45, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = slotColor(p.slot);
  ctx.fillRect(x, y - 5, 7, 7); // tai trái
  ctx.fillRect(x + size - 7, y - 5, 7, 7); // tai phải
  ctx.fillRect(x, y, size, size);

  const img = p.avatar ? getImage(p.avatar) : null;
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x + 3, y + 3, size - 6, size - 6);
  } else {
    ctx.fillStyle = INK;
    ctx.fillRect(x + 6, y + 9, 4, 5);
    ctx.fillRect(x + size - 10, y + 9, 4, 5);
  }

  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.strokeText(p.name, x + size / 2, y - 9);
  ctx.fillStyle = INK;
  ctx.fillText(p.name, x + size / 2, y - 9);
}

/** Người gây ra thua: rung mạnh rồi yếu dần, nháy đỏ, mắt thành dấu X. */
function drawLostPlayer(ctx: CanvasRenderingContext2D, p: DrawPlayer, t: number): void {
  const size = Math.round(PLAYER_SIZE * TILE);
  const shake = Math.sin(t * 90) * 4 * Math.max(0, 1 - t / PHYS.loseDelay);
  ctx.save();
  ctx.translate(shake, 0);
  drawPlayer(ctx, p);
  const x = Math.round(p.x * TILE - size / 2);
  const y = Math.round(p.y * TILE - size / 2);
  if (Math.floor(t / 0.1) % 2 === 0) {
    ctx.fillStyle = "rgba(255,40,40,0.6)";
    ctx.fillRect(x, y - 5, size, size + 5);
  }
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  for (const ex of [x + 8, x + size - 8]) {
    ctx.beginPath();
    ctx.moveTo(ex - 3, y + 8);
    ctx.lineTo(ex + 3, y + 16);
    ctx.moveTo(ex + 3, y + 8);
    ctx.lineTo(ex - 3, y + 16);
    ctx.stroke();
  }
  ctx.restore();
}

/** Dây gai nâu 3 px, nút thắt hai đầu; căng (> 3,8 ô) thì rung và đỏ nhạt. */
function drawRope(ctx: CanvasRenderingContext2D, a: DrawPlayer, b: DrawPlayer, t: number): void {
  const ax = a.x * TILE;
  const ay = a.y * TILE;
  const bx = b.x * TILE;
  const by = b.y * TILE;
  const dist = Math.hypot(bx - ax, by - ay) / TILE;
  const sag = Math.max(0, PHYS.ropeRest - dist) * TILE * 0.6;
  const taut = dist > 3.8;
  const wob = taut ? Math.sin(t * 60) * 1.5 : 0;
  ctx.strokeStyle = taut ? "#C0614A" : "#8B5A2B";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag + wob, bx, by);
  ctx.stroke();
  ctx.fillStyle = "#5D3A1A";
  for (const [x, y] of [[ax, ay], [bx, by]]) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ------------------------------------------------------------------ vật thể

type CarrySpec = Extract<ObjDef["spec"], { t: "carry" }>;

/** Vẽ vật thể (trước dây và người). Trả về các vật đang được mang để vẽ sau người chơi. */
function drawObjects(ctx: CanvasRenderingContext2D, level: Level, th: Theme, s: DrawState, n: number, now: number): ObjDef[] {
  const v = s.view ?? null;
  const t = s.time ?? 0;
  const bodyAt = (o: ObjDef): Rect => {
    const i = level.bodyOf[o.id];
    const p = s.bodies?.[i] ?? v?.bodies[i];
    return p ? { x: p[0], y: p[1], w: o.rect.w, h: o.rect.h } : o.rect;
  };
  const carried: ObjDef[] = [];
  const year = constitutionYear(level.id);

  for (const o of level.objects) {
    if (!isActive(o, n)) continue;
    const sp = o.spec;
    const r = px(o.rect);
    const on = "sig" in sp && sp.sig ? sigBit(level, v, sp.sig) : false;
    switch (sp.t) {
      case "gate":
        if (rose(o.id, on)) fx.particles.emit("dust", r.x + r.w / 2, r.y + r.h - 8, 10);
        drawGate(ctx, r, th, on);
        if (sp.label && !on) drawLabel(ctx, labelText(sp.label), r.x + r.w / 2, r.y + r.h - 40);
        break;
      case "bridge":
        drawBridge(ctx, r, th, on || !!sp.any?.some((g) => sigBit(level, v, g)), t);
        break;
      case "ice":
        drawIce(ctx, r, t);
        break;
      case "conveyor":
        drawConveyor(ctx, r, th, sp.speed, t);
        break;
      case "crumble": {
        const broken = objBit(level, v, o);
        if (rose(o.id, broken)) {
          fx.particles.emit("dust", r.x + r.w / 2, r.y + 8, 12);
          fx.shake.kick(now);
        }
        const ci = level.crumbleOf?.[o.id] ?? -1;
        const remain = ci >= 0 && v?.crumbles?.[ci] !== undefined ? v.crumbles[ci] : -1;
        drawCrumble(ctx, r, th, remain, broken, t);
        break;
      }
      case "slow":
        if (rose(o.id, on)) fx.particles.emit("bird", r.x + r.w / 2, r.y + r.h / 2, 14); // giấy tờ hóa chim giấy bay đi
        if (!on) drawSlowZone(ctx, r, t, sp.label ? labelText(sp.label) : undefined);
        break;
      case "goal":
        drawGoal(ctx, r, sp.label ? labelText(sp.label) : undefined);
        break;
      case "receiver": {
        const sources = sigSources(level, sp.sig, n);
        const done = sources.filter((x) => carryState(level, v, x) === "done").length;
        if (done > (fx.counts.get(o.id) ?? done)) fx.particles.emit("gold", r.x + r.w / 2, r.y, 10);
        fx.counts.set(o.id, done);
        if (sp.kind === "ballot") drawBallotBox(ctx, r, done, sources.length, t);
        else
          drawWordArch(
            ctx,
            r,
            sources.map((x) => ({ text: labelText((x.spec as CarrySpec).text ?? ""), got: carryState(level, v, x) === "done" })),
            t,
          );
        if (sp.label) drawLabel(ctx, labelText(sp.label), r.x + r.w / 2, r.y - 16);
        break;
      }
      case "lift":
        drawLift(ctx, px(bodyAt(o)), th, crowdNeed(sp.need, n), !!sp.drop);
        break;
      case "mover": {
        const b = px(bodyAt(o));
        const path: R[] = sp.path.map(([dx, dy]) => ({
          x: (o.rect.x + dx - sp.path[0][0] + o.rect.w / 2) * TILE,
          y: (o.rect.y + dy - sp.path[0][1] + o.rect.h / 2) * TILE,
          w: 0,
          h: 0,
        }));
        drawMover(ctx, b, th, sp.pads ? moverPadCount(n) : 0, path, t);
        break;
      }
      case "box": {
        const inGoal = objBit(level, v, o);
        if (rose(o.id, inGoal)) {
          const b = px(bodyAt(o));
          fx.particles.emit(sp.label === "baibo" ? "bird" : "dust", b.x + b.w / 2, b.y + b.h / 2, 16); // "Bãi bỏ": hồ sơ hóa chim giấy
          fx.shake.kick(now);
        }
        if (inGoal) break;
        drawBox(ctx, px(bodyAt(o)), crowdNeed(sp.weight, n), sp.label, sp.label ? labelText(sp.label) : undefined);
        break;
      }
      case "hazard": {
        const b = bodyAt(o);
        const rects = [px(b)];
        if (sp.extra) rects.push(px({ x: b.x + sp.extra[0], y: b.y + sp.extra[1], w: sp.extra[2], h: sp.extra[3] }));
        drawHazard(ctx, rects, hazardStyle(level.id));
        break;
      }
      case "seesaw":
        drawSeesaw(ctx, r, v?.angles[level.angleOf[o.id]] ?? 0);
        break;
      case "pad":
        drawPad(ctx, r, objBit(level, v, o), pillarIcon(sp.label), t);
        if (sp.label && !pillarIcon(sp.label)) drawLabel(ctx, labelText(sp.label), r.x + r.w / 2, r.y + r.h - 14);
        if (sp.label && pillarIcon(sp.label)) drawLabel(ctx, labelText(sp.label), r.x + r.w / 2, r.y + r.h - 70);
        break;
      case "carry": {
        const st = carryState(level, v, o);
        if (st === "done") break;
        if (st !== "home") {
          carried.push(o);
          break;
        }
        const bob = Math.sin(t * 3 + o.id) * 2;
        drawCarryItem(ctx, sp.kind, r.x + r.w / 2, r.y + r.h / 2 + bob, labelText(sp.text ?? ""), year, t, true);
        break;
      }
      case "sign":
        drawLabel(ctx, labelText(sp.label), r.x + r.w / 2, r.y + r.h);
        break;
    }
  }

  // "k/cần" (hoặc ✓) dưới nút đầu tiên của mỗi nhóm nút (≥ 2 nút)
  for (const sig of level.sigNames) {
    const pads = sigSources(level, sig, n).filter((o) => o.spec.t === "pad");
    if (pads.length < 2) continue;
    const pressed = pads.filter((o) => objBit(level, v, o)).length;
    const first = pads.reduce((a, b) => (b.rect.x < a.rect.x ? b : a));
    const done = sigBit(level, v, sig);
    ctx.fillStyle = done ? "#2E7D32" : INK;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(done ? "✓" : `${pressed}/${sigNeed(level, sig, n)}`, first.rect.x * TILE, (first.rect.y + 1) * TILE + 14);
  }

  return carried;
}

/** Người đang đứng trên nút của dãy dẫn đường (tín hiệu "G0", "H1"…) được gắn cờ đỏ sau lưng. */
function leaders(level: Level, v: ObjView | null, players: DrawPlayer[]): DrawPlayer[] {
  const out: DrawPlayer[] = [];
  for (const o of level.objects) {
    if (o.spec.t !== "pad" || !/\.(G|H)\d+$/.test(o.spec.sig) || !objBit(level, v, o)) continue;
    const p = players.find((q) => Math.abs(q.x - (o.rect.x + 0.5)) < 0.7 && Math.abs(q.y - (o.rect.y + 0.5)) < 1);
    if (p && !out.includes(p)) out.push(p);
  }
  return out;
}

// ------------------------------------------------------------------ khung hình

export function drawMessage(ctx: CanvasRenderingContext2D, w: number, h: number, text: string): void {
  ctx.fillStyle = "#FBF5E6";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = INK;
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, w / 2, h / 2);
}

export function drawFrame(ctx: CanvasRenderingContext2D, level: Level, s: DrawState): void {
  const W = VIEW_W;
  const H = level.h * TILE;
  const t = s.time ?? 0;
  const now = t * 1000;
  const th = themeFor(level.id);
  const v = s.view ?? null;
  const cp = v?.cp ?? 0;
  const players = [...s.players].sort((a, b) => (a.slot < b.slot ? -1 : 1));

  if (fx.levelId !== level.id) resetFx(level.id, t);
  const dt = Math.min(0.1, Math.max(0, t - fx.lastT));
  fx.lastT = t;

  const avgX = players.length ? players.reduce((sum, p) => sum + p.x, 0) / players.length : level.w / 2;
  const camX = Math.max(0, Math.min(level.w * TILE - W, avgX * TILE - W / 2));
  const part = level.doorSig ? partAt(level, cp) : 0;

  drawBackdrop(ctx, level, th, part, camX, W, H, t);

  const [sx, sy] = fx.shake.offset(now);
  ctx.save();
  ctx.translate(-Math.round(camX) + sx, sy);

  drawProps(ctx, level, th, camX, W, t);
  drawSolids(ctx, level, th, camX, W);
  drawSpikes(ctx, level, camX, W);

  // trần nguy hiểm: sáng hơn khi có người ở gần (< 3 ô)
  for (const r of level.hazards) {
    const near = players.some((p) => p.x > r.x - 3 && p.x < r.x + r.w + 3 && p.y - (r.y + r.h) < 3);
    drawCeiling(ctx, px(r), t, near);
  }

  // cổng mốc mở phần + cờ nhỏ ở cột mốc nối tiếp
  const ms = PARTS[level.id] ? milestones(level) : [];
  if (cp > fx.cp) {
    for (const m of ms)
      if (m.cp > fx.cp && m.cp <= cp && !fx.passAt.has(m.cp)) {
        fx.passAt.set(m.cp, t);
        const c = level.checkpoints[m.cp];
        fx.particles.emit("gold", (c.x + 2) * TILE, (c.y - 3) * TILE, 24);
      }
  }
  fx.cp = cp;
  level.checkpoints.forEach((c, i) => {
    const m = ms.find((q) => q.cp === i);
    const ground = (c.y + 1) * TILE;
    if (m) {
      const since = fx.passAt.get(i);
      const raise = i === 0 || since === undefined ? 1 : Math.min(1, (t - since) / 0.6);
      drawMilestone(ctx, c.x * TILE, ground, th, PARTS[level.id][m.part], cp >= i, raise, t);
    } else if (i > 0) drawCheckpointFlag(ctx, (c.x + 0.5) * TILE, ground, cp >= i);
  });

  if (level.door) drawDoor(ctx, level.door, th, s.hasKey, t);

  // chìa khóa kiểu cũ (level luyện tập)
  if (!s.hasKey && level.key) {
    ctx.fillStyle = "#FFD400";
    ctx.beginPath();
    ctx.arc((level.key.x + 0.5) * TILE, (level.key.y + 0.5) * TILE, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const carried = drawObjects(ctx, level, th, s, players.length, now);

  for (let i = 0; i < players.length - 1; i++) drawRope(ctx, players[i], players[i + 1], t);
  const flagged = leaders(level, v, players);
  for (const p of players) {
    if (flagged.includes(p)) drawLeaderFlag(ctx, p.x * TILE, (p.y - PLAYER_SIZE / 2) * TILE, t);
    if (s.lose && p.slot === s.lose.slot) drawLostPlayer(ctx, p, s.lose.t);
    else drawPlayer(ctx, p);
  }

  // vật đang mang: lơ lửng 0,7 ô trên đầu, lắc ±8°
  for (const o of carried) {
    const st = carryState(level, v, o);
    const p = typeof st === "number" ? players[st] : undefined;
    if (!p) continue;
    const sp = o.spec as CarrySpec;
    ctx.save();
    ctx.translate(p.x * TILE, (p.y - PLAYER_SIZE / 2 - 0.7) * TILE + Math.sin(t * 4) * 2);
    ctx.rotate(Math.sin(t * 3) * 0.14);
    drawCarryItem(ctx, sp.kind, 0, 0, labelText(sp.text ?? ""), constitutionYear(level.id), t, false);
    ctx.restore();
  }

  // thắng level 5: pháo hoa nhẹ
  if (s.won && !fx.won && th.era === 5) for (let k = 0; k < 4; k++) fx.particles.emit("firework", camX + 150 + k * 170, 120 + (k % 2) * 60, 24);
  fx.won = s.won;
  fx.particles.step(dt);
  fx.particles.draw(ctx);

  ctx.restore();
  drawVignette(ctx, th, W, H);

  // HUD chữ chỉ còn ở level luyện tập (level chính đã có thanh thời gian + khung tư liệu)
  if (!level.doorSig) {
    ctx.fillStyle = INK;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(s.hasKey ? "Đã có chìa khóa — cả nhóm vào cửa!" : "Tìm chìa khóa", 10, 20);
    if (s.levelName) {
      ctx.textAlign = "right";
      ctx.fillText(s.levelName, W - 10, 20);
    }
  }

  if (s.won && !s.isLastLevel) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = th.accent;
    ctx.font = "700 34px Oswald, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HOÀN THÀNH!", W / 2, H / 2 - 6);
    ctx.fillStyle = INK;
    ctx.font = "16px sans-serif";
    ctx.fillText("Sang giai đoạn tiếp theo…", W / 2, H / 2 + 24);
  }

  if (s.lose) drawLoseOverlay(ctx, W, H, s.lose.t);
}

/** "THUA!": nền đỏ mờ dần hiện, chữ bật to rồi thu về đúng cỡ trong 0.25 giây. */
function drawLoseOverlay(ctx: CanvasRenderingContext2D, W: number, H: number, t: number): void {
  ctx.fillStyle = `rgba(211,47,47,${Math.min(0.35, t * 1.4)})`;
  ctx.fillRect(0, 0, W, H);

  const pop = 1 + Math.max(0, 1 - t / 0.25) * 1.2;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(pop, pop);
  ctx.textAlign = "center";
  ctx.font = "bold 72px sans-serif";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#fff";
  ctx.strokeText("THUA!", 0, 12);
  ctx.fillStyle = "#c62828";
  ctx.fillText("THUA!", 0, 12);
  ctx.restore();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Cả nhóm quay lại cột mốc gần nhất…", W / 2, H / 2 + 56);
}
````


✅ **Kiểm tra**

```bash
npx tsc -b
npx vitest run
npm run build
```

`tsc` sạch; **77/77 test xanh**; build xong. `npx eslint .` chỉ còn 3 lỗi **có sẵn từ trước**: `engine.ts:263` (`rem`), `Room.tsx` (setState trong effect), `EraSplashBanner.tsx` dòng ~34 (effect cũ của agent trước).
