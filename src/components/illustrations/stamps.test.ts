// src/components/illustrations/stamps.test.ts
import { expect, it } from "vitest";
import { ERAS_DATA } from "./erasData";
import { earnedStamps, totalStamps } from "./stamps";

it("tem theo phần", () => {
  expect(earnedStamps(0, false)).toBe(0);
  expect(earnedStamps(3, false)).toBe(3);
  expect(earnedStamps(4, true)).toBe(5);
  expect(earnedStamps(9, false)).toBe(5);
  expect(totalStamps(5, 4, true)).toBe(25);
  expect(totalStamps(0, 3, false)).toBe(0);
});

it("dữ liệu thời kỳ lấy từ story.ts", () => {
  for (const id of [1, 2, 3, 4, 5]) expect(ERAS_DATA[id].steps).toHaveLength(5);
  expect(ERAS_DATA[1].steps[1].img).toBe("/art/l1p2.jpg");
  expect(ERAS_DATA[3].eraImg).toBe("/art/era3.webp");
  const all = Object.values(ERAS_DATA).flatMap((e) => e.steps.map((s) => s.source + s.quote));
  expect(all.some((s) => s.includes("Versailles"))).toBe(false);
});
