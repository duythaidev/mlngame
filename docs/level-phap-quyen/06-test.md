# 06 — Test (repo `mlngame`)

## Bước 1 — Test tự động

Test ngắn cho từng cơ chế trên level nhỏ dựng riêng, cộng test "5 level dựng được và đứng yên ở xuất phát 3 giây không ai chết" (2 và 5 người).
**Xóa** các file test của bộ docs bản trước nếu có (không còn đúng với level mới):

```bash
rm -f src/game/story.test.ts src/game/levels.play.test.ts
```

**Tạo mới / thay toàn bộ** `src/game/mechanics.test.ts` (280 dòng):

```ts
// src/game/mechanics.test.ts
// Test ngắn cho từng cơ chế, trên level nhỏ dựng riêng cho test.
import * as planck from "planck";
import { describe, expect, it } from "vitest";
import { decodeSnapshot, encodeSnapshot } from "../net/codec";
import { GameEngine } from "./engine";
import { buildLevel, getLevel, LEVEL_IDS, type ObjSpec, type SigSpec } from "./level";
import { carryState, decodeObjView, sigBit } from "./objects";

const W = 30;
const empty = ".".repeat(W);
const solid = "#".repeat(W);

/** Một đoạn: `top` = các hàng ngay trên nền (hàng cuối là hàng 11), `floor` = hàng 12..15 (mặc định đặc). */
function level(top: string[], objs: Record<string, ObjSpec> = {}, sigs: Record<string, SigSpec> = {}, floor?: string[], door?: string) {
  const rows = [solid, ...Array.from({ length: 11 - top.length }, () => empty), ...top, ...(floor ?? [solid, solid, solid, solid])];
  return buildLevel({ id: "test", name: "test", segments: [{ rows, objs, sigs, door }] });
}

type Inp = { l: 0 | 1; r: 0 | 1; j: 0 | 1 };
const IDLE: Inp = { l: 0, r: 0, j: 0 };
const RIGHT: Inp = { l: 0, r: 1, j: 0 };

type Rt = {
  actors: { body: planck.Body; supports: Map<unknown, number> }[];
  objs: { body: planck.Body | null; latched: boolean; carriedBy: string | null; phase: number; pos: { x: number; y: number } }[];
};
const rt = (e: GameEngine) => e as unknown as Rt;
function place(e: GameEngine, i: number, x: number, y = 11.6): void {
  const b = rt(e).actors[i].body;
  b.setPosition(new planck.Vec2(x, y));
  b.setLinearVelocity(new planck.Vec2(0, 0));
}
const pos = (e: GameEngine, i: number) => rt(e).actors[i].body.getPosition();
function run(e: GameEngine, frames: number): void {
  for (let f = 0; f < frames; f++) e.update(1 / 60);
}
const slots = (n: number) => Array.from({ length: n }, (_, i) => `s${i}`);

describe("nút, cổng, cầu", () => {
  it("đủ người đứng thì cổng mở, rời nút thì cổng đóng lại", () => {
    const L = level(["............g.................", "............g.................", ".S..a.a.....g................."], {
      a: { t: "pad", sig: "A" },
      g: { t: "gate", sig: "A" },
    });
    const e = new GameEngine(L, slots(2));
    place(e, 0, 5.5);
    place(e, 1, 7.5);
    run(e, 10);
    expect(e.isSignalOn("0.A")).toBe(true);
    place(e, 1, 9.5);
    run(e, 10);
    expect(e.isSignalOn("0.A")).toBe(false);
  });

  it("perPlayer: chỉ n nút đầu được tính; khối đè được nút", () => {
    const L = level([".S..aaaaa..b..................."].map((r) => r.slice(0, W)), {
      a: { t: "pad", sig: "A", perPlayer: true },
      b: { t: "box", weight: 1 },
    });
    const e = new GameEngine(L, slots(2));
    place(e, 0, 5.5);
    place(e, 1, 6.5);
    run(e, 5);
    expect(e.isSignalOn("0.A")).toBe(true); // 2 người, 2 nút đầu
    const L2 = level([".S.....ba.......................".slice(0, W)], { a: { t: "pad", sig: "A" }, b: { t: "box", weight: 1 } });
    const e2 = new GameEngine(L2, slots(1));
    place(e2, 0, 5.5);
    run(e2, 5);
    expect(e2.isSignalOn("0.A")).toBe(false);
    place(e2, 0, 6.3); // tì vào khối, đẩy sang phải
    e2.setInput("s0", RIGHT);
    run(e2, 20);
    e2.setInput("s0", IDLE);
    run(e2, 5);
    expect(e2.isSignalOn("0.A")).toBe(true); // khối nằm trên nút thứ hai
  });

  it("cầu `any`: bật khi một tín hiệu lân cận bật", () => {
    const L = level([".S..a..b........................".slice(0, W)], {
      a: { t: "pad", sig: "A" },
      b: { t: "pad", sig: "B" },
      c: { t: "bridge", sig: "C", any: ["A"] },
    }, {}, ["##########cccc################", "##########....################", solid, solid]);
    const e = new GameEngine(L, slots(1));
    run(e, 5);
    const bridge = () => rt(e).objs.find((o) => o.body?.getType() === "static" && o !== undefined && !o.body.isActive());
    expect(bridge()).toBeDefined();
    place(e, 0, 5.5);
    run(e, 5);
    expect(sigBit(L, decodeObjView(e.snapshot().o)!, "0.A")).toBe(true);
    expect(rt(e).objs[2].body!.isActive()).toBe(true);
  });
});

describe("băng chuyền, sàn sụp, khối đỏ", () => {
  it("đứng yên trên băng chuyền bị cuốn đi", () => {
    const L = level([".S............................"], { c: { t: "conveyor", speed: -2 } }, {}, ["#cccccccccccccccccccccccccccc#", solid, solid, solid]);
    const e = new GameEngine(L, slots(1));
    place(e, 0, 15.5);
    run(e, 60);
    expect(pos(e, 0).x).toBeLessThan(14.2);
    expect(pos(e, 0).x).toBeGreaterThan(12.5);
  });

  it("sàn sụp: đứng 0,8 giây → rung → mất; 3 giây sau hiện lại", () => {
    const L = level([".S............................"], { c: { t: "crumble" } }, {}, ["#####cc#######################", solid, solid, solid]);
    const e = new GameEngine(L, slots(1));
    place(e, 0, 6.5);
    run(e, 40);
    expect(rt(e).objs[0].body!.isActive()).toBe(true);
    run(e, 30); // 0,8 + 0,3 giây
    expect(rt(e).objs[0].body!.isActive()).toBe(false);
    place(e, 0, 2.5);
    run(e, 60 * 3 + 5);
    expect(rt(e).objs[0].body!.isActive()).toBe(true);
  });

  it("khối đỏ đi qua lại và gây thua", () => {
    const L = level([".S........h..................."], { h: { t: "hazard", path: [[0, 0], [6, 0]], speed: 3, pause: 0 } });
    const e = new GameEngine(L, slots(1));
    run(e, 60);
    expect(rt(e).objs[0].pos.x).toBeCloseTo(14, 0);
    run(e, 90);
    expect(rt(e).objs[0].pos.x).toBeLessThan(17); // tới đầu mút thì quay đầu
    place(e, 0, 13.5);
    run(e, 60);
    expect(e.lose).not.toBeNull();
  });
});

describe("bục số, sàn chở có nút, khối số", () => {
  it("bục số: thiếu người là hạ xuống (không giữ ở đỉnh)", () => {
    const L = level(["..............................", ".S............................"], { l: { t: "lift", rise: 2, drop: true } }, {}, [
      "#####lllll####################",
      solid,
      solid,
      solid,
    ]);
    const e = new GameEngine(L, slots(2));
    const ly = () => rt(e).objs[0].body!.getPosition().y;
    place(e, 0, 7.0);
    place(e, 1, 8.5);
    run(e, 90);
    expect(ly()).toBeCloseTo(10.5, 2);
    place(e, 1, 20.5, 11.6);
    run(e, 90);
    expect(ly()).toBeCloseTo(12.5, 2);
  });

  it("sàn chở có nút: chỉ chạy khi mọi nút trên sàn bị đè", () => {
    const L = level(["..............................", ".S............................"], { m: { t: "mover", path: [[0, 0], [10, 0]], pads: true } }, {}, [
      "#mmmmmm......................#",
      "#............................#",
      "#............................#",
      "#............................#",
    ]);
    const e = new GameEngine(L, slots(2));
    const mx = () => rt(e).objs[0].body!.getPosition().x;
    place(e, 0, 2.5, 11.55);
    place(e, 1, 5.0, 11.55); // không đứng trên nút thứ 2 (cột 3 của sàn)
    run(e, 30);
    expect(mx()).toBeCloseTo(5, 1);
    place(e, 1, 3.5, 11.55);
    run(e, 60);
    expect(mx()).toBeGreaterThan(6);
  });

  it("khối số có trọng lực: đẩy rơi vào hố sâu 1 ô thành nền", () => {
    const L = level([".S...bb.........................".slice(0, W)], { b: { t: "box", weight: 1 } }, {}, [
      "#########..###################",
      solid,
      solid,
      solid,
    ]);
    const e = new GameEngine(L, slots(1));
    const box = () => rt(e).objs[0].body!.getPosition();
    place(e, 0, 5.55);
    e.setInput("s0", RIGHT);
    run(e, 60 * 3);
    e.setInput("s0", IDLE);
    run(e, 60);
    expect(box().x).toBeCloseTo(11, 1);
    expect(box().y).toBeCloseTo(12.5, 1); // nằm trong hố, mặt trên ngang nền
  });

  it("khối trên băng: phải dừng hẳn trong ô đích mới tính", () => {
    const L = level([".S...bb........gg..............".slice(0, W)], { b: { t: "box", weight: 1, sig: "G" }, g: { t: "goal", sig: "G" }, i: { t: "ice" } }, {}, [
      "##iiiiiiiiiiiiiiiiiiiiiiiiii##",
      solid,
      solid,
      solid,
    ]);
    const e = new GameEngine(L, slots(1));
    place(e, 0, 5.55);
    e.setInput("s0", RIGHT);
    run(e, 330); // đẩy 5,5 giây rồi thả: khối trượt thêm ~1 ô vào đích
    e.setInput("s0", IDLE);
    run(e, 120);
    expect(rt(e).objs.find((o) => o.latched)).toBeDefined();
  });
});

describe("bập bênh, mang vật, cột mốc", () => {
  it("bập bênh nghiêng về phía có người", () => {
    const L = level([".S............................"], { w: { t: "seesaw" } }, {}, [
      "####.wwwwwww.#################",
      "####....#....#################",
      "####....#....#################",
      "####....#....#################",
    ]);
    const e = new GameEngine(L, slots(1));
    place(e, 0, 7.0, 11.55);
    run(e, 60);
    const ang = rt(e).objs[0].body!.getAngle();
    expect(ang).toBeLessThan(-0.1); // nghiêng về bên trái (góc âm)
  });

  it("mang phiếu: mỗi người 1 phiếu, nộp vào hòm thì bật tín hiệu; thua thì phiếu về chỗ cũ", () => {
    const L = level([".S..pp...........uu.....X......".slice(0, W)], {
      p: { t: "carry", kind: "ballot", to: "B" },
      u: { t: "receiver", kind: "ballot", sig: "B" },
    });
    const e = new GameEngine(L, slots(1));
    place(e, 0, 5.5);
    run(e, 3);
    expect(rt(e).objs[0].carriedBy).toBe("s0");
    place(e, 0, 6.5);
    run(e, 3);
    expect(rt(e).objs[1].carriedBy).toBeNull(); // đang mang 1 phiếu → không nhặt thêm
    place(e, 0, 18.5);
    run(e, 3);
    expect(rt(e).objs[0].latched).toBe(true);
    expect(e.isSignalOn("0.B")).toBe(false); // còn phiếu thứ 2
    place(e, 0, 6.5);
    run(e, 3);
    expect(rt(e).objs[1].carriedBy).toBe("s0");
    place(e, 0, 25.5); // chạm gai
    run(e, 70);
    expect(rt(e).objs[1].carriedBy).toBeNull(); // phiếu về chỗ cũ
    const v = decodeObjView(e.snapshot().o)!;
    expect(carryState(L, v, L.objects[1])).toBe("home");
  });

  it("vật mang qua cột mốc thì hồi sinh vẫn trên đầu", () => {
    const L = level([".S..k.....C..........X........"], { k: { t: "carry", kind: "key", to: "*K" } });
    const e = new GameEngine(L, slots(1));
    place(e, 0, 5.5);
    run(e, 3);
    place(e, 0, 13.5);
    run(e, 3);
    place(e, 0, 22.5);
    run(e, 70);
    expect(e.checkpoint).toBe(1);
    expect(rt(e).objs[0].carriedBy).toBe("s0");
  });

  it("snapshot có đủ phần vật mang và góc bập bênh", () => {
    const L = level([".S..k..........................".slice(0, W)], { k: { t: "carry", kind: "key", to: "*K" } });
    const e = new GameEngine(L, slots(1));
    place(e, 0, 5.5);
    run(e, 3);
    const v = decodeObjView(decodeSnapshot(encodeSnapshot(e.snapshot()))!.o)!;
    expect(v.carry).toBe("0");
  });
});

describe("5 level dựng được và không ai chết khi đứng yên ở xuất phát", () => {
  for (const id of LEVEL_IDS) {
    for (const n of [2, 5]) {
      it(`level ${id}, ${n} người`, () => {
        const L = getLevel(id);
        expect(L.segCount).toBeGreaterThanOrEqual(6);
        const e = new GameEngine(L, slots(n));
        run(e, 60 * 3);
        expect(e.snapshot().r).toBe(0);
      });
    }
  }
});
```

### ✅ Kiểm tra

```bash
npx vitest run
```

Kết quả: `Tests  47 passed (47)`.

## Bước 2 — Chơi thử bằng tay (bắt buộc trước buổi thuyết trình)

`npm run dev` → `http://localhost:5173/sandbox?n=2` (rồi `?n=3`, `?n=5`). Phím **P** = về cột mốc để thử lại một đoạn. Đánh dấu từng dòng:

| Level · đoạn | Cần thấy |
|--------------|----------|
| 1.1 | Chồng người lên vách 2 ô; người trên đi tiếp kéo người dưới lên bằng dây |
| 1.2 | Đứng yên trên băng chuyền bị cuốn lùi; nhảy qua 3 gai được |
| 1.3–1.4 | Mỗi người nhặt đúng 1 phiếu (lơ lửng trên đầu); rơi khỏi sàn sụp → phiếu về chỗ cũ nếu chưa qua cột mốc; đủ phiếu vào hòm → cổng mở |
| 1.5 | Bập bênh: 1 người đứng lệch → nghiêng nhẹ, trượt chậm; 2 người dồn một bên → trượt hẳn |
| 1.6 | n nút trên n cột → cầu vàng hiện; lấy chìa trên bục 2 ô (chồng người) |
| 1.7 | Người dẫn đi lối trên, đoạn cầu dưới chân nhóm bật theo nút người dẫn đứng |
| 1.8 | Người mang chìa chạm cửa → cửa mở → cả nhóm vào → qua level |
| 2.1 | Bục số đủ n người thì lên; một người bước ra là hạ; gờ băng có khe |
| 2.5 | Sàn chở chỉ chạy khi mọi nút trên sàn có người; ai bước khỏi nút để tránh đầu dập là sàn dừng |
| 2.6 | 3 mảnh chữ (bản chất · mục tiêu · động lực) vào khung → cổng mở; mảnh trên bục 3 ô cần đẩy khối "1" làm bậc |
| 2.7 | Trần hạ dần: cuối đoạn không nhảy được, phải đi liền trên sàn sụp |
| 3.1 | Khối đỏ quét sát nền; trú trong hầm thì an toàn |
| 3.2 | Khối rộng 3 ô rơi lấp hố gai; khối "1" làm bậc lên vách 3 ô |
| 3.4 | 3 mảnh "của dân / do dân / vì dân" lấy ở dãy nút dẫn đường, trên bục số, cuối băng chuyền trên gờ |
| 3.6 | Sàn chở có nút dưới trần nguy hiểm, 2 đầu dập |
| 4.2 | 3 nút Lập pháp / Hành pháp / Tư pháp; với 2 người đẩy khối "1" đè nút trái |
| 4.3 | Bập bênh dưới vạch ranh giới: nhảy từ đầu đang nâng là chạm vạch |
| 4.6 | Khối "cả nhóm" trên băng phải **dừng** đúng ô đích; khối đỏ quét qua |
| 5.4 | Đẩy khối "Bãi bỏ" vào đích → vùng chậm "Thủ tục phiền hà" biến mất → nhảy qua hố |
| 5.6 → màn kết | Mang chìa tới cửa → màn "Không mâu thuẫn" + 3 ý |

Đoạn nào quá khó / quá dễ: chỉnh theo file 08.
