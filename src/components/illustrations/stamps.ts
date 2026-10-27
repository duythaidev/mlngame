// src/components/illustrations/stamps.ts
// Tem của level hiện tại: tem phần i có khi nhóm đã sang phần i+1; thắng level = đủ 5 tem.

export function earnedStamps(part: number, won: boolean): number {
  return won ? 5 : Math.max(0, Math.min(5, part));
}

/** Tổng tem cả game (0..25) khi đang ở level `era` (1..5). */
export function totalStamps(era: number, part: number, won: boolean): number {
  return era <= 0 ? 0 : (era - 1) * 5 + earnedStamps(part, won);
}
