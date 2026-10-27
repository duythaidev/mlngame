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
