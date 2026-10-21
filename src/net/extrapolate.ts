// src/net/extrapolate.ts

/**
 * Ngoại suy vị trí tuyến tính theo vận tốc và độ tuổi snapshot (giây).
 * Đơn vị: ô và ô/s (đã chia 100).
 */
export function extrapolate(
  pos: [number, number],
  vel: [number, number],
  ageSec: number,
  maxSec = 0.12,
): [number, number] {
  const clampedAge = Math.max(0, Math.min(ageSec, maxSec));
  return [pos[0] + vel[0] * clampedAge, pos[1] + vel[1] * clampedAge];
}
