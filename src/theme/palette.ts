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
    sky: ["#FCF7EC", "#F5EAD4"],
    far: ["#EFE2CB", "#E7D5B8", "#DECAA4"],
    near: ["#DEC6A1", "#C79383", "#B3A480"],
    tile: { base: "#C89B6A", joint: "#9C6B3F", edge: "#E9C99A" },
    accent: "#B5382A",
    gold: "#C9A24A",
    ink: "#222222",
    paper: "#FBF5E6",
    vignette: 0,
  },
  2: {
    era: 2,
    sky: ["#EEF4F7", "#DFE9EE"],
    skyDawn: ["#FFF1E4", "#FFF8EE"],
    far: ["#CEDBE1", "#C0CCD2", "#B2BFC6"],
    near: ["#CDBBB0", "#B2C1C9", "#9AAAB2"],
    tile: { base: "#C4705A", joint: "#8F4E3C", edge: "#E0B7A5" },
    accent: "#A4533A",
    gold: "#D9B84A",
    ink: "#222222",
    paper: "#F6F3EC",
    vignette: 0,
  },
  3: {
    era: 3,
    sky: ["#EFF8F4", "#FAF8F2"],
    far: ["#EAF2EE", "#E0ECE6", "#D7E5DE"],
    near: ["#CEE4DC", "#D8E3E1", "#BBD8CE"],
    tile: { base: "#D8DCDE", joint: "#C2C7CB", edge: "#FFFFFF" },
    accent: "#2E8B7A",
    gold: "#D4A338",
    ink: "#222222",
    paper: "#FAF8F0",
    vignette: 0,
  },
  4: {
    era: 4,
    sky: ["#EDF3F9", "#F7FAFD"],
    far: ["#E2ECF7", "#F6EDE0", "#D8E4F3"],
    near: ["#CADAF0", "#E0D0D0", "#B2C8E2"],
    tile: { base: "#D9E0EA", joint: "#B3BFD2", edge: "#D9A92B" },
    accent: "#14305C",
    gold: "#D9A92B",
    ink: "#222222",
    paper: "#FFFFFF",
    vignette: 0,
  },
  5: {
    era: 5,
    sky: ["#FFF2DB", "#FFFAF0"],
    far: ["#F7E6C4", "#EED4A2", "#E5C483"],
    near: ["#E8C684", "#DA6F6F", "#CEAA52"],
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
