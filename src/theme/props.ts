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
