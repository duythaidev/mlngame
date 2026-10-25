import { describe, expect, it } from "vitest";
import { SnapshotBuffer } from "./interpolate";
import type { Snapshot } from "../game/protocol";

const TICK = 1000 / 60;
const snap = (t: number, x: number, r = 0): Snapshot => ({
  t, r, k: 0, w: 0, d: 0, c: -1, lv: "1", j: {}, p: { s0: [x, 1000] },
});

describe("SnapshotBuffer", () => {
  it("trượt tuyến tính giữa 2 snapshot, vẽ trễ delayMs", () => {
    const b = new SnapshotBuffer(100);
    b.push(snap(0, 0), 0);
    b.push(snap(6, 600), 6 * TICK); // 100 ms sau, x đi 6 ô
    const p = b.positions(6 * TICK + 50); // render ở server t = 50 ms → giữa đường
    expect(p.s0[0]).toBeCloseTo(3, 5);
  });
  it("gói tin đến dồn cục không làm vị trí giật lùi", () => {
    const b = new SnapshotBuffer(100);
    b.push(snap(0, 0), 0);
    b.push(snap(2, 200), 2 * TICK);
    b.push(snap(4, 400), 200); // đến trễ
    b.push(snap(6, 600), 201); // đến dồn ngay sau
    let prev = -Infinity;
    for (let now = 150; now <= 260; now += 5) {
      const x = b.positions(now).s0[0];
      expect(x).toBeGreaterThanOrEqual(prev);
      prev = x;
    }
  });
  it("không trượt xuyên qua reset", () => {
    const b = new SnapshotBuffer(100);
    b.push(snap(0, 3000), 0);
    b.push(snap(6, 250, 1), 6 * TICK);
    expect(b.positions(6 * TICK + 50).s0[0]).toBe(2.5);
  });
  it("chưa có snapshot mới hơn thì giữ snapshot cuối, không đoán", () => {
    const b = new SnapshotBuffer(100);
    b.push(snap(0, 0), 0);
    b.push(snap(6, 600), 6 * TICK);
    expect(b.positions(10_000).s0[0]).toBe(6);
  });
  it("engine mới (tick đếm lại) xóa bộ đệm cũ", () => {
    const b = new SnapshotBuffer(100);
    b.push(snap(500, 100), 0);
    b.push(snap(3, 900), 10);
    expect(b.positions(1000).s0[0]).toBe(9);
  });
});
