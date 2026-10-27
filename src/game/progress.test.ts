// src/game/progress.test.ts
import { expect, it } from "vitest";
import { getLevel } from "./level";
import { progressOf, ProgressTracker } from "./progress";

it("chỉ báo khi level / phần / thắng đổi", () => {
  const t = new ProgressTracker();
  const L1 = getLevel("1");
  expect(t.update(L1, 0, false)).toEqual({ levelId: "1", era: 1, part: 0, won: false });
  expect(t.update(L1, 0, false)).toBeNull();
  const last = L1.checkpoints.length - 1;
  expect(t.update(L1, last, false)?.part).toBe(4);
  expect(t.update(L1, last, true)?.won).toBe(true);
  expect(t.update(getLevel("2"), 0, false)?.era).toBe(2); // server tự sang level kế
});

it("level luyện tập: era 0", () => {
  expect(progressOf(getLevel("t1"), 0, false).era).toBe(0);
});
