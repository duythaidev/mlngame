// src/game/level.ts
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Level {
  id: string;
  name: string;
  w: number; // số cột
  h: number; // số hàng
  solids: Rect[];
  spikes: Rect[];
  key: Rect | null;
  door: Rect | null;
  spawn: { x: number; y: number };
}

// Quy ước: mọi level cao đúng 16 hàng (canvas giữ nguyên kích thước khi qua màn).
// Giới hạn khả năng (đã đo trên engine, 2 người chơi vẫn qua được):
//  - nhảy một mình lên được bậc cao ≤ 1 ô; chồng 2 người lên được bục cao 2 ô
//  - nhảy xa vượt được hố ≤ 2 ô và gai đơn (1 ô); gai rộng 2 ô liền nhau thì KHÔNG nhảy qua được
//  - người đứng trên cao đi ra xa sẽ kéo người dưới bục lên nhờ dây
const RAW: Record<string, { name: string; rows: string[] }> = {
  "1": {
    name: "Level 1 — Khởi động",
    rows: [
      "########################################",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#.............................K........#",
      "#...........................####.DDDDD.#",
      "#.S...................X..........DDDDD.#",
      "###########..###########################",
      "###########..###########################",
      "###########..###########################",
      "###########..###########################",
    ],
  },
  "2": {
    name: "Level 2 — Hố và gai",
    rows: [
      "################################################",
      "#..............................................#",
      "#..............................................#",
      "#..............................................#",
      "#..............................................#",
      "#..............................................#",
      "#..............................................#",
      "#..............................................#",
      "#..............................................#",
      "#...................................K..........#",
      "#.................................####...DDDDD.#",
      "#.S.....##..........X.............####...DDDDD.#",
      "##############..#########..#####################",
      "##############..#########..#####################",
      "##############..#########..#####################",
      "##############..#########..#####################",
    ],
  },
  "3": {
    name: "Level 3 — Leo tháp",
    rows: [
      "##################################################################",
      "#................................................................#",
      "#................................................................#",
      "#................................................................#",
      "#................................................................#",
      "#................................................................#",
      "#..............................K.................................#",
      "#............................#####...............................#",
      "#............................#####...............................#",
      "#........................####....................................#",
      "#....................###....................................DDDDD#",
      "#.S.....X........#######...............X...........X........DDDDD#",
      "############..###############################..##########..#######",
      "############..###############################..##########..#######",
      "############..###############################..##########..#######",
      "############..###############################..##########..#######",
    ],
  },
};

function parse(id: string, name: string, rows: string[]): Level {
  const h = rows.length;
  const w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`Level ${id}: hàng ${i} dài ${r.length}, cần ${w}`);
  });

  const solids: Rect[] = [];
  const spikes: Rect[] = [];
  let key: Rect | null = null;
  let spawn = { x: 2, y: 2 };
  let dx0 = Infinity;
  let dy0 = Infinity;
  let dx1 = -1;
  let dy1 = -1;

  for (let y = 0; y < h; y++) {
    let run = -1;
    for (let x = 0; x <= w; x++) {
      const c = x < w ? rows[y][x] : "."; // ô giả cuối hàng để đóng run
      if (c === "#") {
        if (run < 0) run = x;
      } else if (run >= 0) {
        solids.push({ x: run, y, w: x - run, h: 1 });
        run = -1;
      }
      if (c === "X") spikes.push({ x, y, w: 1, h: 1 });
      if (c === "K") key = { x, y, w: 1, h: 1 };
      if (c === "S") spawn = { x: x + 0.5, y: y + 0.5 };
      if (c === "D") {
        dx0 = Math.min(dx0, x);
        dy0 = Math.min(dy0, y);
        dx1 = Math.max(dx1, x);
        dy1 = Math.max(dy1, y);
      }
    }
  }

  // gộp các hàng đặc giống nhau (cùng x, cùng độ rộng, nằm liền nhau) thành một khối:
  // vách không còn khe nối giữa các hàng → nhân vật trượt dọc vách không bị mắc (ghost collision)
  const merged: Rect[] = [];
  for (const r of solids) {
    const above = merged.find((m) => m.x === r.x && m.w === r.w && m.y + m.h === r.y);
    if (above) above.h += 1;
    else merged.push({ ...r });
  }

  const door = dx1 >= 0 ? { x: dx0, y: dy0, w: dx1 - dx0 + 1, h: dy1 - dy0 + 1 } : null;
  return { id, name, w, h, solids: merged, spikes, key, door, spawn };
}

const LEVELS: Record<string, Level> = Object.fromEntries(
  Object.entries(RAW).map(([id, l]) => [id, parse(id, l.name, l.rows)]),
);

/** Thứ tự các level (qua màn tự động theo thứ tự này). */
export const LEVEL_IDS = Object.keys(RAW);

export function getLevel(id: string): Level {
  return LEVELS[id] ?? LEVELS["1"];
}

/** Level kế tiếp, hoặc null nếu đây là level cuối. */
export function nextLevelId(id: string): string | null {
  const i = LEVEL_IDS.indexOf(id);
  return i >= 0 && i + 1 < LEVEL_IDS.length ? LEVEL_IDS[i + 1] : null;
}
