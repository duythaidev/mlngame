import { describe, expect, it } from "vitest";
import { predictSelf } from "./selfPredict";
import { getLevel } from "../game/level";
import { PHYS } from "../lib/constants";

const level = getLevel("1");
const ground: [number, number] = [5, 11.6]; // đứng trên nền Level 1 (mặt nền y=12)
const still: [number, number] = [0, 0];
const none = { l: 0, r: 0, j: 0 } as const;
const right = { l: 0, r: 1, j: 0 } as const;

describe("predictSelf", () => {
  it("bấm phải khi đang đứng → nhân vật đi trước theo tốc độ chạy", () => {
    const [x] = predictSelf({ pos: ground, vel: still, input: right, jumpPending: false, lookahead: 0.1, level });
    expect(x).toBeCloseTo(5 + PHYS.speed * 0.1, 5);
  });
  it("thả phím khi đang đứng → dừng ngay, không trôi theo vận tốc cũ", () => {
    const [x] = predictSelf({ pos: ground, vel: [PHYS.speed, 0], input: none, jumpPending: false, lookahead: 0.1, level });
    expect(x).toBe(5);
  });
  it("không đoán quá 0.25 s", () => {
    const [x] = predictSelf({ pos: ground, vel: still, input: right, jumpPending: false, lookahead: 2, level });
    expect(x).toBeCloseTo(5 + PHYS.speed * 0.25, 5);
  });
  it("vừa bấm nhảy khi đang đứng → bay lên ngay", () => {
    const [, y] = predictSelf({ pos: ground, vel: still, input: none, jumpPending: true, lookahead: 0.1, level });
    expect(y).toBeLessThan(11.6 - 0.5);
  });
  it("bấm nhảy khi đang trên không → không bay lên thêm", () => {
    const [, y] = predictSelf({ pos: [5, 9], vel: [0, 5], input: none, jumpPending: true, lookahead: 0.1, level });
    expect(y).toBeGreaterThan(9);
  });
  it("không đoán xuyên tường (tường trái Level 1 ở cột 0)", () => {
    const [x] = predictSelf({ pos: [1.45, 11.6], vel: still, input: { l: 1, r: 0, j: 0 }, jumpPending: false, lookahead: 0.25, level });
    expect(x).toBe(1.45);
  });
});
