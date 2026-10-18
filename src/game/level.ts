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

const RAW: Record<string, { name: string; rows: string[] }> = {
  "1": {
    name: "Level 1",
    rows: [
      "########################################",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#......................................#",
      "#.............................K........#",
      "#...........................####.......#",
      "#................................DDDDD.#",
      "#.S................XX............DDDDD.#",
      "###########...##########################",
      "###########...##########################",
      "###########...##########################",
      "###########...##########################",
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

  const door = dx1 >= 0 ? { x: dx0, y: dy0, w: dx1 - dx0 + 1, h: dy1 - dy0 + 1 } : null;
  return { id, name, w, h, solids, spikes, key, door, spawn };
}

const LEVELS: Record<string, Level> = Object.fromEntries(
  Object.entries(RAW).map(([id, l]) => [id, parse(id, l.name, l.rows)]),
);

export function getLevel(id: string): Level {
  return LEVELS[id] ?? LEVELS["1"];
}
