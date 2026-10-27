// src/game/progress.ts
// Tiến độ cho giao diện ngoài canvas (thanh thời gian, khung tư liệu, thẻ mở level, màn kết).
// Vòng vẽ (requestAnimationFrame) gọi update() mỗi khung; chỉ báo ra React khi tiến độ đổi.
import { LEVEL_IDS, partAt, type Level } from "./level";

export interface Progress {
  levelId: string;
  era: number; // 1..5; 0 = level luyện tập (ẩn thanh thời gian / khung tư liệu)
  part: number; // 0-based, phần đang ở
  won: boolean;
}

export const START: Progress = { levelId: "1", era: 1, part: 0, won: false };

export function progressOf(level: Level, cp: number, won: boolean): Progress {
  return { levelId: level.id, era: LEVEL_IDS.indexOf(level.id) + 1, part: partAt(level, cp), won };
}

export class ProgressTracker {
  private last = "";

  /** Trả về Progress mới nếu khác lần trước, ngược lại null. */
  update(level: Level, cp: number, won: boolean): Progress | null {
    const p = progressOf(level, cp, won);
    const key = `${p.levelId}|${p.part}|${p.won ? 1 : 0}`;
    if (key === this.last) return null;
    this.last = key;
    return p;
  }
}
