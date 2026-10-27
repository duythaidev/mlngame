// src/game/storyTracker.ts
// Dòng chữ đoạn: hiện to giữa mép trên canvas khi nhóm tới cột mốc mới, BANNER_SEC giây sau thu nhỏ.
import type { Level } from "./level";
import type { ObjView } from "./objects";
import { segmentLine } from "./story";

export const BANNER_SEC = 4;

export interface Banner {
  text: string;
  age: number; // giây kể từ lúc hiện
}

export class BannerTracker {
  private key = "";
  private since = 0;

  /** now: ms (performance.now). Trả về null nếu đoạn hiện tại không có chữ. */
  update(level: Level, view: ObjView | null, now: number): Banner | null {
    const seg = level.checkpoints[view?.cp ?? 0]?.seg ?? 0;
    const key = `${level.id}|${seg}`;
    if (key !== this.key) {
      this.key = key;
      this.since = now;
    }
    const text = segmentLine(level.id, seg);
    return text ? { text, age: (now - this.since) / 1000 } : null;
  }
}
