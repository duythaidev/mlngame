# 01 — Dữ liệu level (repo `mlngame`)

Level = **ghép các đoạn** (mỗi đoạn một lưới 16 hàng) theo chiều ngang. Vật thể đặt bằng ký tự; mỗi đoạn có `objs` (vật thể), `sigs` (luật tín hiệu), `door`.
Code ở file này dùng chung cho web và server (server copy qua `npm run sync-shared`, file 07).

## Bước 1 — Hằng số

Thêm hằng số cho băng, vùng chậm, thang/bục số, sàn chở, khối số (trọng lực, trượt trên băng, về chỗ cũ), sàn sụp, bập bênh (lò xo trục, ngưỡng trơn/trượt).
Bảng ý nghĩa và cách chỉnh: file 08.

**Tạo mới / thay toàn bộ** `src/lib/constants.ts` (55 dòng):

```ts
// src/lib/constants.ts
export const TILE = 32; // pixel / ô khi vẽ
export const VIEW_W = 800; // chiều rộng canvas (25 ô)
export const PLAYER_SIZE = 0.8; // kích thước hitbox nhân vật (ô)

// Màu theo ô: đỏ cờ, xanh dương, xanh lá, cam, tím, vàng sao, hồng, ngà
export const SLOT_COLORS = [
  "#D32F2F", "#1976D2", "#388E3C", "#F57C00",
  "#7B1FA2", "#FBC02D", "#E91E63", "#455A64",
];

export const PHYS = {
  gravity: 50, // ô/s²
  speed: 5, // tốc độ chạy tối đa (ô/s)
  grip: 5, // lực chân khi BẤM chạy = grip × lực ép xuống đất. >1 để 1 người kéo được 1 người treo
  idleBrake: 12, // phanh khi đứng yên (1/s): trượt 3 ô/s dừng trong ~0.25 ô; bị kéo liên tục thì vẫn bị lôi đi từ từ
  airControl: 0.5, // lực lái trên không khi TỰ nhảy (× trọng lượng): đổi hướng dần, không tức thì
  swingControl: 0.15, // lực đu khi rơi/bị treo dây (× trọng lượng): chỉ đu nhẹ như con lắc
  jump: 13, // vận tốc nhảy (ô/s) → cao ≈ jump²/(2·gravity) ≈ 1.7 ô
  ropeRest: 4, // chiều dài dây (ô): dây thẳng nối tâm, xuyên địa hình; ngắn hơn thì chùng
  ropeBias: 0.5, // tốc độ kéo dây về đúng chiều dài khi bị giãn (càng nhỏ dây càng "đàn hồi")
  ropeMaxTension: 1.6, // lực căng tối đa của dây (× trọng lượng 1 người): vượt thì dây giãn nhẹ thay vì giật
  ropeMaxStretch: 0.25, // dây giãn tối đa (ô) khi chịu lực quá trần; vượt mức này dây cứng hẳn
  ropeLiftSpeed: 5, // tốc độ tối đa dây kéo một người đang lơ lửng đi lên (ô/s)
  stepUp: 0.5, // người bị dây kéo vào vách tự bước qua mép nếu mép cao hơn chân tối đa chừng này (ô)
  ropeSlop: 0.03, // dây giãn tới mức này mới bắt đầu kéo về (tránh rung/nảy khi tì vào tường)
  ropeIters: 4, // số vòng giải ràng buộc dây mỗi bước (chuỗi dài cần nhiều hơn)
  iceGrip: 0.12, // bám trên sàn băng (thay cho grip): tăng tốc/phanh chậm → trượt khoảng 2 ô
  slowSpeed: 0.35, // trong vùng chậm: tốc độ chạy × 0.35
  slowJump: 0.7, // trong vùng chậm: vận tốc nhảy × 0.7 (cao chỉ còn ~0.8 ô)
  liftSpeed: 2, // tốc độ thang nâng (ô/s)
  moverSpeed: 2.5, // tốc độ sàn chở (ô/s)
  stopWait: 4, // sàn chở dừng ở mỗi trạm (giây)
  moverStartDelay: 0.6, // đủ người đứng trên sàn chở liên tục chừng này giây thì sàn mới chạy
  boxSpeed: 1.5, // tốc độ khối số khi đủ người đẩy (ô/s)
  boxGlide: 1, // khối trên băng: chậm dần chừng này ô/s mỗi giây sau khi thôi đẩy
  boxGravity: 30, // khối số rơi: gia tốc (ô/s²)
  boxMaxFall: 12, // khối số rơi: tốc độ tối đa (ô/s)
  boxRespawn: 2, // khối rơi sâu quá 2,5 ô: sau chừng này giây về chỗ cũ
  crumbleStand: 0.8, // sàn sụp: đứng liên tục chừng này giây thì bắt đầu rung
  crumbleShake: 0.3, // sàn sụp: rung chừng này giây rồi biến mất
  crumbleBack: 3, // sàn sụp: biến mất chừng này giây rồi hiện lại
  seesawThick: 0.4, // bập bênh: độ dày tấm (ô)
  seesawDensity: 0.5, // bập bênh: mật độ tấm (người = 1)
  seesawDamping: 3, // bập bênh: giảm chấn quay (không lắc mãi)
  seesawLimit: 0.436, // bập bênh: góc nghiêng tối đa (rad, ≈ 25°)
  seesawSlip: 0.24, // bập bênh lệch hơn ≈ 14°: bám như băng
  seesawSlide: 0.35, // bập bênh lệch hơn ≈ 20°: không bám, trượt hẳn
  seesawSpring: 530, // bập bênh: lò xo ở trục (mô-men / rad) — 1 người ở mép tấm chỉ nghiêng ≈ 12°
  seesawSpringDamp: 40, // bập bênh: giảm chấn của lò xo
  loseDelay: 1, // giây hiển thị "Thua" (đóng băng) trước khi restart cả nhóm
  winDelay: 3, // giây hiện "Hoàn thành" trước khi tự sang level kế
  step: 1 / 60, // bước vật lý cố định
  snapshotEvery: 3, // cứ 3 bước ghi 1 snapshot → 20Hz
} as const;
```

## Bước 2 — Snapshot có trường `o`

Chuỗi trạng thái vật thể (mã hóa ở `objects.ts`).

**Tạo mới / thay toàn bộ** `src/game/protocol.ts` (24 dòng):

```ts
// src/game/protocol.ts
export interface InputState {
  l: 0 | 1; // trái
  r: 0 | 1; // phải
  j: 0 | 1; // nhảy
}

export const EMPTY_INPUT: InputState = { l: 0, r: 0, j: 0 };

export interface Snapshot {
  t: number; // số bước vật lý đã chạy
  r: number; // số lần reset (client dùng để "dịch chuyển" thay vì nội suy)
  k: 0 | 1; // đã có chìa khóa
  w: 0 | 1; // đã thắng
  d: 0 | 1; // đang trong 1 giây "Thua" (vật lý đóng băng)
  c: number; // chỉ số (trong các ô đã sắp xếp) của người gây ra thua; -1 = không có
  lv: string; // id level đang chơi (host quyết định, client vẽ theo)
  j: Record<string, number>; // slot -> số lần nhảy thật sự đã thực hiện (client phát tiếng nhảy khi số này tăng)
  p: Record<string, [number, number]>; // slot -> [x*100, y*100] (đơn vị ô)
  a?: Record<string, number>; // seq input cuối cùng host đã áp dụng cho từng slot
  v?: Record<string, [number, number]>; // vận tốc slot [vx*100, vy*100]
  h?: 0 | 1; // host đang ẩn tab
  o?: string; // trạng thái vật thể (nút, cổng, thang, sàn chở, khối, mảnh, cột mốc) — xem game/objects.ts
}
```

## Bước 3 — Kiểu vật thể và dựng level

Điểm chính:
- `ObjSpec`: 16 loại vật thể (xem chú thích từng dòng). Loại **vùng** (`AREA`) gộp các ô cùng ký tự thành **một** hình chữ nhật; loại **ô** (`pad`, `carry`, `sign`) mỗi ô là một vật.
- Tên tín hiệu tự gắn tiền tố đoạn (`"3.A"`), **trừ** tên bắt đầu bằng `*` (dùng chung cả level — vd phiếu nhặt ở đoạn 3, nộp ở đoạn 4: `"*B"`).
- `finish()` tính vị trí trạng thái của từng vật trong snapshot: `bitOf` (nút/khối/sàn sụp), `bodyOf` (thang/sàn chở/khối/khối đỏ), `angleOf` (bập bênh), `carryOf` (vật mang).
- Level luyện tập cũ giữ ở `TRAINING` (`t1`, `t2`), không nằm trong `LEVEL_IDS`.

**Tạo mới / thay toàn bộ** `src/game/level.ts` (402 dòng):

```ts
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
  bitCount: number;
  bodyCount: number;
  angleCount: number;
  carryCount: number;
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

type LevelCore = Omit<Level, "sigNames" | "bitOf" | "bodyOf" | "angleOf" | "carryOf" | "bitCount" | "bodyCount" | "angleCount" | "carryCount">;

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
  let bits = 0;
  let bodies = 0;
  let angles = 0;
  let carries = 0;
  for (const o of core.objects) {
    const t = o.spec.t;
    bitOf.push(t === "pad" || t === "box" || t === "crumble" ? bits++ : -1);
    bodyOf.push(t === "lift" || t === "mover" || t === "box" || t === "hazard" ? bodies++ : -1);
    angleOf.push(t === "seesaw" ? angles++ : -1);
    carryOf.push(t === "carry" ? carries++ : -1);
  }
  return {
    ...core,
    sigNames: [...names].sort(),
    bitOf,
    bodyOf,
    angleOf,
    carryOf,
    bitCount: bits,
    bodyCount: bodies,
    angleCount: angles,
    carryCount: carries,
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
```

## Bước 4 — Hàm dùng chung engine/client

Vật nào bật theo số người (`perPlayer`), nguồn của tín hiệu (nút / khối vào đích / vật đã nộp), số người cần, mã hóa/giải mã chuỗi `o`:
`cp~bits~bodies~carry~angles`.

**Tạo mới / thay toàn bộ** `src/game/objects.ts` (90 dòng):

```ts
// src/game/objects.ts
// Dùng chung cho engine (server) và client: vật nào đang bật theo số người, cần bao nhiêu cho một tín hiệu,
// và chuỗi trạng thái vật thể gửi trong snapshot.
import type { Level, ObjDef } from "./level";

/** Trạng thái vật thể ở một thời điểm (giải mã từ snapshot.o). */
export interface ObjView {
  cp: number; // cột mốc hồi sinh đã tới (level.checkpoints)
  bits: string; // "0"/"1": [nút đang bấm / khối đã vào đích / sàn sụp đang ẩn theo level.bitOf] + [từng tín hiệu theo level.sigNames]
  bodies: [number, number][]; // góc trên-trái (ô) của thang/sàn chở/khối/khối đỏ theo level.bodyOf
  carry: string; // mỗi vật mang 1 ký tự theo level.carryOf: "." ở chỗ cũ · "d" đã nộp · "0".."4" đang trên đầu người thứ k
  angles: number[]; // góc bập bênh (radian) theo level.angleOf
}

/** Vật có tồn tại với n người không: vật "perPlayer" thứ k chỉ bật khi k < n. */
export function isActive(o: ObjDef, n: number): boolean {
  const per = (o.spec.t === "pad" || o.spec.t === "carry") && o.spec.perPlayer;
  return !per || o.k < n;
}

/** Tín hiệu mà vật làm "nguồn": nút, khối (vào đích), vật mang (đã nộp). */
export function sourceSig(o: ObjDef): string | null {
  const s = o.spec;
  if (s.t === "pad") return s.sig;
  if (s.t === "box") return s.sig ?? null;
  if (s.t === "carry") return s.to;
  return null;
}

export function sigSources(level: Level, sig: string, n: number): ObjDef[] {
  return level.objects.filter((o) => sourceSig(o) === sig && isActive(o, n));
}

/** Số nguồn cần bật để tín hiệu bật. */
export function sigNeed(level: Level, sig: string, n: number): number {
  const total = sigSources(level, sig, n).length;
  const need = level.sigs[sig]?.need ?? "all";
  return need === "all" ? total : Math.min(need, total);
}

/** Số người cần cho thang / bục số / sàn chở / khối số. */
export function crowdNeed(need: number | "all" | undefined, n: number): number {
  return need === undefined || need === "all" ? n : Math.min(need, n);
}

/** Số nút gắn trên sàn chở có `pads` (mỗi người một nút, tối đa 5). */
export function moverPadCount(n: number): number {
  return Math.max(1, Math.min(5, n));
}

export function encodeObjView(v: ObjView): string {
  const bodies = v.bodies.map(([x, y]) => `${Math.round(x * 100)},${Math.round(y * 100)}`).join(";");
  const angles = v.angles.map((a) => Math.round(a * 1000)).join(",");
  return `${v.cp}~${v.bits}~${bodies}~${v.carry}~${angles}`;
}

export function decodeObjView(raw: string | undefined): ObjView | null {
  if (!raw) return null;
  const [cp, bits, bodies, carry = "", angles = ""] = raw.split("~");
  if (bits === undefined || bodies === undefined || !/^[01]*$/.test(bits) || !/^[.d0-9]*$/.test(carry)) return null;
  const list: [number, number][] = [];
  for (const t of bodies ? bodies.split(";") : []) {
    const [x, y] = t.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    list.push([x / 100, y / 100]);
  }
  const ang = angles ? angles.split(",").map((a) => Number(a) / 1000) : [];
  if (ang.some((a) => !Number.isFinite(a))) return null;
  const c = Number(cp);
  return Number.isInteger(c) ? { cp: c, bits, bodies: list, carry, angles: ang } : null;
}

export function objBit(level: Level, v: ObjView | null, o: ObjDef): boolean {
  const i = level.bitOf[o.id];
  return !!v && i >= 0 && v.bits[i] === "1";
}

export function sigBit(level: Level, v: ObjView | null, sig: string): boolean {
  const i = level.sigNames.indexOf(sig);
  return !!v && i >= 0 && v.bits[level.bitCount + i] === "1";
}

/** Vật mang đang ở đâu: "home" · "done" (đã nộp) · số = chỉ số người đang mang (trong các ô đã sắp xếp). */
export function carryState(level: Level, v: ObjView | null, o: ObjDef): "home" | "done" | number {
  const i = level.carryOf[o.id];
  const c = v && i >= 0 ? v.carry[i] : ".";
  if (c === "d") return "done";
  if (c === undefined || c === ".") return "home";
  return Number(c);
}
```

### ✅ Kiểm tra

```bash
npx tsc -b
```

Lúc này **còn lỗi** ở `engine.ts`, `renderer.ts`, `levelData.ts` cũ… (chưa thay) — bình thường, hết sau file 02–05. Chỉ cần **không có lỗi trong `level.ts`, `objects.ts`, `protocol.ts`**.
