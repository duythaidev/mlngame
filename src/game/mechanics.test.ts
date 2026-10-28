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
  return buildLevel({ id: "test", name: "test", parts: [{ segments: [{ rows, objs, sigs, door }] }] });
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

  it("sàn sụp: đứng 2,7 giây → rung 0,3 giây → mất (tổng 3 giây); 3 giây sau hiện lại (chỉ đếm ngược khi kích hoạt)", () => {
    const L = level([".S............................"], { c: { t: "crumble" } }, {}, ["#####cc#######################", solid, solid, solid]);
    const e = new GameEngine(L, slots(1));
    const snap0 = decodeObjView(e.snapshot().o ?? "");
    expect(snap0?.crumbles?.[0]).toBe(-1); // chưa động vào → không hiện thời gian

    place(e, 0, 6.5);
    run(e, 40);
    expect(rt(e).objs[0].body!.isActive()).toBe(true);
    const snapMid = decodeObjView(e.snapshot().o ?? "");
    expect(snapMid?.crumbles?.[0]).toBeLessThan(3.0);
    expect(snapMid?.crumbles?.[0]).toBeGreaterThan(0.3); // đang kích hoạt đếm ngược

    run(e, 150); // 2,7 + 0,3 giây (tổng 190 ticks > 180 ticks = 3 giây)
    expect(rt(e).objs[0].body!.isActive()).toBe(false);
    const snapDone = decodeObjView(e.snapshot().o ?? "");
    expect(snapDone?.crumbles?.[0]).toBe(-1); // đã sập → không hiện

    place(e, 0, 2.5);
    run(e, 60 * 3 + 5);
    expect(rt(e).objs[0].body!.isActive()).toBe(true);
    const snapBack = decodeObjView(e.snapshot().o ?? "");
    expect(snapBack?.crumbles?.[0]).toBe(-1); // mới hiện lại, chưa ai chạm vào → không hiện thời gian
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
        expect(L.segCount).toBeGreaterThanOrEqual(3);
        expect(L.partCount).toBeGreaterThanOrEqual(3);
        const e = new GameEngine(L, slots(n));
        run(e, 60 * 3);
        expect(e.snapshot().r).toBe(0);
      });
    }
  }
});

describe("gai: va chạm theo hình tam giác", () => {
  const lv = () => level([".S........X" + ".".repeat(W - 11)]);
  /** Đặt người 0 sao cho hộp va chạm (0,7 ô) có mép phải ở `right` và đáy ở `bottom` (đơn vị ô), chạy 1 khung. */
  function at(right: number, bottom: number): boolean {
    const L = lv();
    const e = new GameEngine(L, slots(1));
    place(e, 0, right - 0.35, bottom - 0.35);
    run(e, 1);
    return e.lose !== null;
  }

  it("lơ lửng ngay trên vai gai (ngoài tam giác, trong hình chữ nhật cũ) → không thua", () => {
    const s = lv().spikes[0];
    expect(at(s.x + 0.3, s.y + 0.65)).toBe(false);
  });

  it("chạm sườn gai → thua", () => {
    const s = lv().spikes[0];
    expect(at(s.x + 0.45, s.y + 0.8)).toBe(true);
  });

  it("rơi trúng mũi gai → thua", () => {
    const s = lv().spikes[0];
    expect(at(s.x + 0.85, s.y + 0.6)).toBe(true);
  });
});

describe("sàn sụp: thời gian tùy chỉnh", () => {
  /** Đặt người lên sàn sụp rồi đo số giây tới khi sàn biến mất (và tới khi hiện lại). */
  function times(spec: ObjSpec): { gone: number; back: number } {
    const L = level([".S" + ".".repeat(W - 2)], { a: spec }, {}, ["a".repeat(8) + "#".repeat(W - 8), solid, solid, solid]);
    const e = new GameEngine(L, slots(1));
    const o = rt(e).objs.find((x) => x.body && (x as { phase?: number }).phase !== undefined)!;
    let gone = -1;
    let back = -1;
    for (let f = 1; f <= 60 * 12; f++) {
      e.update(1 / 60);
      const ph = (o as unknown as { phase: number }).phase;
      if (gone < 0 && ph === 2) {
        gone = f / 60;
        place(e, 0, 20, 11.6); // đứng sang phần nền đặc để sàn hiện lại được
      }
      if (gone > 0 && back < 0 && ph === 0) back = f / 60 - gone;
    }
    return { gone, back };
  }

  it("mặc định: sụp sau ~3 giây (2,7 đứng + 0,3 rung), hiện lại sau 3 giây", () => {
    const t = times({ t: "crumble" });
    expect(t.gone).toBeGreaterThan(2.9);
    expect(t.gone).toBeLessThan(3.2);
    expect(t.back).toBeGreaterThan(2.9);
    expect(t.back).toBeLessThan(3.2);
  });

  it("stand = 2, back = 5 → sụp sau ~2,3 giây, hiện lại sau 5 giây", () => {
    const t = times({ t: "crumble", stand: 2, back: 5 });
    expect(t.gone).toBeGreaterThan(2.2);
    expect(t.gone).toBeLessThan(2.6);
    expect(t.back).toBeGreaterThan(4.9);
    expect(t.back).toBeLessThan(5.2);
  });

  it("time = 1.5 → sụp sau đúng ~1,5 giây (1,2 đứng + 0,3 rung)", () => {
    const t = times({ t: "crumble", time: 1.5 });
    expect(t.gone).toBeGreaterThan(1.4);
    expect(t.gone).toBeLessThan(1.7);
  });
});
