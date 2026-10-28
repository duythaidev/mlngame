// src/components/illustrations/stamps.ts
// Tem của level hiện tại: tem phần i có khi nhóm đã sang phần i+1; thắng level = đủ tem (số phần của level: 4 hoặc 5).
import { partCountOf, stampsBefore, totalParts } from "../../game/story";

/** Tem đã có ở level hiện tại. `count` = số phần của level (mặc định 5). */
export function earnedStamps(part: number, won: boolean, count = 5): number {
  return won ? count : Math.max(0, Math.min(count, part));
}

/** Tổng tem cả game khi đang ở level `era` (1..5). */
export function totalStamps(era: number, part: number, won: boolean): number {
  if (era <= 0) return 0;
  return stampsBefore(era) + earnedStamps(part, won, partCountOf(String(era)));
}

/** Tổng tem tối đa cả game. */
export function maxStamps(): number {
  return totalParts();
}
