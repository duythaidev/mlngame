// src/game/level.ts
import { CHAPTERS } from "./levelData";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Số người cần: một con số cố định, hoặc "all" = tất cả nguồn đang bật (thường = số người chơi). */
export type Need = number | "all";

/**
 * Vật thể đặt trong level bằng một chữ thường trong lưới ASCII.
 * Các ô cùng chữ: loại "vùng" (xem AREA) gộp thành MỘT hình chữ nhật;
 * loại "ô" (pad, carry, sign) thì mỗi ô là một vật, đánh số k theo thứ tự x tăng dần.
 * label / text là KHÓA tra trong src/game/story.ts (không có khóa thì hiện nguyên chữ).
 */
export type ObjSpec =
  | { t: "pad"; sig: string; label?: string; perPlayer?: boolean } // nút đỏ: người hoặc khối đè lên = đang bấm
  | { t: "gate"; sig: string; label?: string } // khối đặc, biến mất khi sig bật
  | { t: "bridge"; sig: string; any?: string[]; label?: string } // chỉ hiện khi sig (hoặc một trong `any`) bật
  | { t: "ice" } // sàn băng (đặc, trơn cố định)
  | { t: "slow"; sig?: string; label?: string } // vùng chậm (không đặc); sig bật → biến mất
  | { t: "lift"; rise: number; need?: Need; drop?: boolean; label?: string } // thang / bục số (drop: thiếu người là hạ)
  | { t: "mover"; path: [number, number][]; need?: Need; stops?: number[]; pads?: boolean; label?: string } // sàn chở
  | { t: "box"; weight: Need; sig?: string; label?: string } // khối số: đủ `weight` người đẩy mới đi; có trọng lực
  | { t: "goal"; sig: string; label?: string } // ô đích của khối (không đặc)
  | { t: "conveyor"; speed: number } // băng chuyền (đặc): + sang phải, − sang trái (ô/s)
  | { t: "crumble" } // sàn sụp
  | { t: "hazard"; path: [number, number][]; speed: number; pause?: number; extra?: [number, number, number, number] } // khối đỏ di chuyển
  | { t: "seesaw" } // bập bênh: tấm 1 hàng, trục ở giữa
  | { t: "carry"; kind: "ballot" | "key" | "word"; to: string; text?: string; perPlayer?: boolean } // vật mang trên đầu
  | { t: "receiver"; kind: "ballot" | "word"; sig: string; label?: string } // hòm phiếu / khung chữ
  | { t: "sign"; label: string }; // biển chữ ngắn

/** Luật của một tín hiệu. Mặc định: need "all", không giữ (tắt khi hết đủ người), không chờ. */
export interface SigSpec {
  need?: Need;
  latch?: boolean; // đã bật thì bật mãi (tới khi chơi lại level)
  padLatch?: boolean; // mỗi nút đã có người đứng thì nhớ "đã bấm" (không cần đứng cùng lúc)
  hold?: number; // phải đủ người liên tục chừng này giây mới bật
}

export interface SegmentDef {
  rows: string[]; // đúng 16 hàng, mọi hàng cùng độ dài
  objs?: Record<string, ObjSpec>;
  sigs?: Record<string, SigSpec>;
  door?: string; // tên tín hiệu (trong đoạn này) mở cửa cuối level
}

export interface ChapterDef {
  id: string;
  name: string;
  segments: SegmentDef[];
}

export interface ObjDef {
  id: number; // chỉ số trong level.objects
  seg: number; // đoạn chứa vật
  k: number; // thứ tự trong nhóm cùng chữ (x tăng dần)
  of: number; // số vật trong nhóm cùng chữ
  spec: ObjSpec; // tên sig đã gắn tiền tố đoạn: "<đoạn>.<tên>"
  rect: Rect;
}

export interface Checkpoint {
  x: number; // cột của ô C (hoặc S)
  y: number; // hàng của ô C
  seg: number;
}

export interface Level {
  id: string;
  name: string;
  w: number; // số cột
  h: number; // số hàng
  solids: Rect[];
  spikes: Rect[];
  hazards: Rect[]; // ô "^": chạm là thua (vùng trần chết)
  key: Rect | null;
  door: Rect | null;
  spawn: { x: number; y: number };
  checkpoints: Checkpoint[]; // [0] = điểm xuất phát
  segCount: number;
  segX: number[]; // cột bắt đầu của từng đoạn
  objects: ObjDef[];
  sigs: Record<string, SigSpec>;
  sigNames: string[]; // sắp xếp — thứ tự bit tín hiệu trong snapshot
  doorSig: string | null; // null = cửa mở bằng chìa khóa K (level cũ)
  bitOf: number[]; // object id → vị trí bit trạng thái (-1 = không có)
  bodyOf: number[]; // object id → vị trí trong danh sách thân di động (-1 = không có)
  angleOf: number[]; // object id → vị trí trong danh sách góc bập bênh (-1 = không có)
  carryOf: number[]; // object id → vị trí trong chuỗi trạng thái vật mang (-1 = không có)
  crumbleOf: number[]; // object id → vị trí trong danh sách sàn sụp (-1 = không có)
  bitCount: number;
  bodyCount: number;
  angleCount: number;
  carryCount: number;
  crumbleCount: number;
}

// Quy ước: mọi level cao đúng 16 hàng (canvas giữ nguyên kích thước khi qua màn).
// Giới hạn khả năng (đã đo trên engine):
//  - nhảy một mình lên được bậc cao ≤ 1 ô; chồng 2 người lên được bục cao 2 ô
//  - nhảy xa vượt được hố ≤ 2 ô và gai đơn (1 ô); gai rộng 2 ô liền nhau thì KHÔNG nhảy qua được
//  - người đứng trên cao đi ra xa sẽ kéo người dưới bục lên nhờ dây
const TRAINING: Record<string, { name: string; rows: string[] }> = {
  t1: {
    name: "Luyện tập 1 — Khởi động",
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
  t2: {
    name: "Luyện tập 2 — Hố và gai",
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
};

/** Ký tự có nghĩa cố định; mọi ký tự khác là vật thể khai báo trong objs của đoạn. */
const RESERVED = new Set(["#", ".", "^", "X", "K", "D", "S", "C"]);

const AREA = new Set(["gate", "bridge", "ice", "slow", "lift", "mover", "box", "goal", "conveyor", "crumble", "hazard", "seesaw", "receiver"]);

/** Gộp các ô thành dải ngang, rồi gộp dải giống nhau nằm liền nhau (vách không còn khe → không mắc khi trượt). */
function mergeCells(cells: { x: number; y: number }[]): Rect[] {
  const set = new Set(cells.map((c) => `${c.x},${c.y}`));
  const rows = [...new Set(cells.map((c) => c.y))].sort((a, b) => a - b);
  const runs: Rect[] = [];
  for (const y of rows) {
    const xs = cells.filter((c) => c.y === y).map((c) => c.x).sort((a, b) => a - b);
    let start = -1;
    for (let i = 0; i <= xs.length; i++) {
      const x = xs[i];
      if (start < 0) start = x;
      if (i === xs.length || !set.has(`${x + 1},${y}`)) {
        if (i < xs.length) runs.push({ x: start, y, w: x - start + 1, h: 1 });
        start = -1;
      }
    }
  }
  const merged: Rect[] = [];
  for (const r of runs) {
    const above = merged.find((m) => m.x === r.x && m.w === r.w && m.y + m.h === r.y);
    if (above) above.h += 1;
    else merged.push({ ...r });
  }
  return merged;
}

/** Ghép các đoạn theo chiều ngang (thêm vách trái/phải) rồi dựng Level. Xuất ra để test dựng level riêng. */
export function buildLevel(def: ChapterDef): Level {
  const H = 16;
  const offsets: number[] = [];
  let w = 1; // cột 0 = vách trái
  def.segments.forEach((s, i) => {
    if (s.rows.length !== H) throw new Error(`Level ${def.id} đoạn ${i + 1}: cần ${H} hàng, có ${s.rows.length}`);
    const sw = s.rows[0].length;
    s.rows.forEach((r, y) => {
      if (r.length !== sw) throw new Error(`Level ${def.id} đoạn ${i + 1} hàng ${y}: dài ${r.length}, cần ${sw}`);
    });
    offsets.push(w);
    w += sw;
  });
  w += 1; // vách phải
  const solidCells: { x: number; y: number }[] = [];
  const hazardCells: { x: number; y: number }[] = [];
  const spikes: Rect[] = [];
  const checkpoints: Checkpoint[] = [];
  const objects: ObjDef[] = [];
  const sigs: Record<string, SigSpec> = {};
  let spawn: { x: number; y: number } | null = null;
  let key: Rect | null = null;
  let door: Rect | null = null;
  let doorSig: string | null = null;
  const doorCells: { x: number; y: number }[] = [];

  for (let y = 0; y < H; y++) {
    solidCells.push({ x: 0, y }, { x: w - 1, y });
  }

  def.segments.forEach((s, si) => {
    const ox = offsets[si];
    // tên tín hiệu: "*TÊN" = dùng chung cả level (vd phiếu nhặt ở đoạn 3, nộp ở đoạn 4); còn lại riêng từng đoạn
    const pre = (name: string) => (name.startsWith("*") ? name : `${si}.${name}`);
    for (const [name, spec] of Object.entries(s.sigs ?? {})) sigs[pre(name)] = spec;
    if (s.door) doorSig = pre(s.door);

    const letters = new Map<string, { x: number; y: number }[]>();
    s.rows.forEach((row, y) => {
      for (let cx = 0; cx < row.length; cx++) {
        const c = row[cx];
        const x = ox + cx;
        if (c === "#") solidCells.push({ x, y });
        else if (c === "^") hazardCells.push({ x, y });
        else if (c === "X") spikes.push({ x, y, w: 1, h: 1 });
        else if (c === "K") key = { x, y, w: 1, h: 1 };
        else if (c === "D") doorCells.push({ x, y });
        else if (c === "S") {
          spawn = { x: x + 0.5, y: y + 0.5 };
          checkpoints.unshift({ x, y, seg: si });
        } else if (c === "C") checkpoints.push({ x, y, seg: si });
        else if (!RESERVED.has(c)) {
          if (!s.objs?.[c]) throw new Error(`Level ${def.id} đoạn ${si + 1}: ký tự "${c}" chưa khai báo trong objs`);
          const list = letters.get(c) ?? [];
          list.push({ x, y });
          letters.set(c, list);
        }
      }
    });

    for (const [c, cells] of letters) {
      const raw = s.objs![c];
      const spec = { ...raw } as ObjSpec;
      if ("sig" in spec && spec.sig) (spec as { sig: string }).sig = pre(spec.sig);
      if (spec.t === "carry") spec.to = pre(spec.to);
      if (spec.t === "bridge" && spec.any) spec.any = spec.any.map(pre);
      if (AREA.has(spec.t)) {
        const xs = cells.map((p) => p.x);
        const ys = cells.map((p) => p.y);
        const rect = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
        if (rect.w * rect.h !== cells.length) throw new Error(`Level ${def.id} đoạn ${si + 1}: chữ "${c}" phải là một hình chữ nhật kín`);
        objects.push({ id: 0, seg: si, k: 0, of: 1, spec, rect });
      } else {
        [...cells]
          .sort((a, b) => a.x - b.x || a.y - b.y)
          .forEach((p, k) => objects.push({ id: 0, seg: si, k, of: cells.length, spec, rect: { x: p.x, y: p.y, w: 1, h: 1 } }));
      }
    }
  });

  if (!spawn) throw new Error(`Level ${def.id}: thiếu ô S`);
  if (doorCells.length) {
    const xs = doorCells.map((p) => p.x);
    const ys = doorCells.map((p) => p.y);
    door = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
  }
  checkpoints.sort((a, b) => a.x - b.x);

  return finish({
    id: def.id,
    name: def.name,
    w,
    h: H,
    solids: mergeCells(solidCells),
    spikes,
    hazards: mergeCells(hazardCells),
    key,
    door,
    spawn,
    checkpoints,
    segCount: def.segments.length,
    segX: offsets,
    objects,
    sigs,
    doorSig,
  });
}

type LevelCore = Omit<
  Level,
  | "sigNames"
  | "bitOf"
  | "bodyOf"
  | "angleOf"
  | "carryOf"
  | "crumbleOf"
  | "bitCount"
  | "bodyCount"
  | "angleCount"
  | "carryCount"
  | "crumbleCount"
>;

/** Đánh số vật thể, gom tên tín hiệu, tính vị trí trạng thái trong snapshot (dùng chung cho engine và client). */
function finish(core: LevelCore): Level {
  core.objects.forEach((o, i) => (o.id = i));
  const names = new Set(Object.keys(core.sigs));
  for (const o of core.objects) {
    if ("sig" in o.spec && o.spec.sig) names.add(o.spec.sig);
    if (o.spec.t === "carry") names.add(o.spec.to);
  }
  const bitOf: number[] = [];
  const bodyOf: number[] = [];
  const angleOf: number[] = [];
  const carryOf: number[] = [];
  const crumbleOf: number[] = [];
  let bits = 0;
  let bodies = 0;
  let angles = 0;
  let carries = 0;
  let crumbles = 0;
  for (const o of core.objects) {
    const t = o.spec.t;
    bitOf.push(t === "pad" || t === "box" || t === "crumble" ? bits++ : -1);
    bodyOf.push(t === "lift" || t === "mover" || t === "box" || t === "hazard" ? bodies++ : -1);
    angleOf.push(t === "seesaw" ? angles++ : -1);
    carryOf.push(t === "carry" ? carries++ : -1);
    crumbleOf.push(t === "crumble" ? crumbles++ : -1);
  }
  return {
    ...core,
    sigNames: [...names].sort(),
    bitOf,
    bodyOf,
    angleOf,
    carryOf,
    crumbleOf,
    bitCount: bits,
    bodyCount: bodies,
    angleCount: angles,
    carryCount: carries,
    crumbleCount: crumbles,
  };
}

/** Định dạng cũ: một lưới có sẵn vách, chìa khóa K mở cửa (level luyện tập). */
function parseTraining(id: string, name: string, rows: string[]): Level {
  const h = rows.length;
  const w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`Level ${id}: hàng ${i} dài ${r.length}, cần ${w}`);
  });
  const solidCells: { x: number; y: number }[] = [];
  const spikes: Rect[] = [];
  const doorCells: { x: number; y: number }[] = [];
  let key: Rect | null = null;
  let spawn = { x: 2, y: 2 };
  let sx = 1;
  let sy = 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (c === "#") solidCells.push({ x, y });
      if (c === "X") spikes.push({ x, y, w: 1, h: 1 });
      if (c === "K") key = { x, y, w: 1, h: 1 };
      if (c === "D") doorCells.push({ x, y });
      if (c === "S") {
        spawn = { x: x + 0.5, y: y + 0.5 };
        sx = x;
        sy = y;
      }
    }
  }
  const xs = doorCells.map((p) => p.x);
  const ys = doorCells.map((p) => p.y);
  const door = doorCells.length
    ? { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 }
    : null;
  return finish({
    id,
    name,
    w,
    h,
    solids: mergeCells(solidCells),
    spikes,
    hazards: [],
    key,
    door,
    spawn,
    checkpoints: [{ x: sx, y: sy, seg: 0 }],
    segCount: 1,
    segX: [0],
    objects: [],
    sigs: {},
    doorSig: null,
  });
}

const LEVELS: Record<string, Level> = {
  ...Object.fromEntries(CHAPTERS.map((c) => [c.id, buildLevel(c)])),
  ...Object.fromEntries(Object.entries(TRAINING).map(([id, l]) => [id, parseTraining(id, l.name, l.rows)])),
};

/** Thứ tự các level chính (qua màn tự động theo thứ tự này). Level luyện tập không nằm trong danh sách. */
export const LEVEL_IDS = CHAPTERS.map((c) => c.id);
export const TRAINING_IDS = Object.keys(TRAINING);

export function getLevel(id: string): Level {
  return LEVELS[id] ?? LEVELS[LEVEL_IDS[0]];
}

/** Level kế tiếp, hoặc null nếu đây là level cuối (level luyện tập luôn là cuối). */
export function nextLevelId(id: string): string | null {
  const i = LEVEL_IDS.indexOf(id);
  return i >= 0 && i + 1 < LEVEL_IDS.length ? LEVEL_IDS[i + 1] : null;
}
