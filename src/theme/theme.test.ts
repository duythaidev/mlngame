// src/theme/theme.test.ts
// Phần tính toán của đồ họa (không cần canvas): màu, trời theo phần, hạt giống, cổng mốc, đạo cụ, hạt.
import { describe, expect, it } from "vitest";
import { getLevel, LEVEL_IDS } from "../game/level";
import { milestones } from "./gates";
import { constitutionYear, crumbleLabel, hazardStyle, marqueeOffset, pillarIcon } from "./mechanics";
import { mixColor, skyFor, themeFor } from "./palette";
import { Particles } from "./particles";
import { HANGING, PROPS } from "./props";
import { mulberry32, seedOf } from "./rng";

describe("bảng màu", () => {
  it("theme theo level, lạ → Level 1", () => {
    expect(themeFor("3").era).toBe(3);
    expect(themeFor("t1").era).toBe(1);
  });
  it("trộn màu", () => {
    expect(mixColor("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixColor("#123456", "#ffffff", -1)).toBe("#123456");
    expect(mixColor("#123456", "#ffffff", 2)).toBe("#ffffff");
  });
  it("Level 2 chuyển dần sang bình minh", () => {
    const th = themeFor("2");
    expect(skyFor(th, 0)).toEqual(th.sky);
    expect(skyFor(th, 4)).toEqual([mixColor(th.sky[0], th.skyDawn![0], 1), mixColor(th.sky[1], th.skyDawn![1], 1)]);
    expect(skyFor(th, 3)[0]).toBe(mixColor(th.sky[0], th.skyDawn![0], 0.5));
    expect(skyFor(themeFor("4"), 4)).toEqual(themeFor("4").sky);
  });
  it("theme sáng: trời mọi level đủ sáng (độ sáng > 0.8)", () => {
    for (const id of LEVEL_IDS) {
      const n = parseInt(themeFor(id).sky[0].slice(1), 16);
      const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
      expect(lum).toBeGreaterThan(0.8);
    }
  });
});

it("hạt giống: cùng level → cùng dãy số", () => {
  const a = mulberry32(seedOf("1"));
  const b = mulberry32(seedOf("1"));
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  expect(seedOf("1")).not.toBe(seedOf("2"));
});

it("cổng mốc: mỗi phần một cổng (4 hoặc 5 phần), cổng đầu ở xuất phát", () => {
  for (const id of LEVEL_IDS) {
    const ms = milestones(getLevel(id));
    expect(ms.map((m) => m.part)).toEqual(Array.from({ length: getLevel(id).partCount }, (_, i) => i));
    expect(ms[0].cp).toBe(0);
  }
});

it("cơ chế: kiểu khối đỏ, trụ, năm Hiến pháp, chữ chạy, đếm ngược", () => {
  expect(["1", "2", "3", "4", "5", "t1"].map(hazardStyle)).toEqual(["brick", "hammer", "pendulum", "glove", "glove", "brick"]);
  expect([pillarIcon("lapphap"), pillarIcon("hanhphap"), pillarIcon("tuphap"), pillarIcon("dich"), pillarIcon(undefined)]).toEqual(["book", "gear", "gavel", null, null]);
  expect(["1", "3", "4", "5"].map(constitutionYear)).toEqual(["1946", "1992", "2013", "2013"]);
  expect(marqueeOffset(1, 40, 100)).toBe(40);
  expect(marqueeOffset(-1, 40, 100)).toBe(60);
  expect(crumbleLabel(0.8)).toBe("0.8s");
  expect(crumbleLabel(-0.2)).toBe("0.0s");
});

it("đạo cụ: 5 phần/level, 4–6 món/phần", () => {
  for (const id of LEVEL_IDS) {
    expect(PROPS[id]).toHaveLength(5);
    for (const list of PROPS[id]) {
      expect(list.length).toBeGreaterThanOrEqual(4);
      expect(list.length).toBeLessThanOrEqual(6);
    }
  }
  expect(HANGING.has("banner")).toBe(true);
});

it("hạt: tối đa 200, hết hạn thì biến mất", () => {
  const p = new Particles(200);
  p.emit("gold", 0, 0, 500);
  expect(p.count).toBe(200);
  p.step(10);
  expect(p.count).toBe(0);
});
