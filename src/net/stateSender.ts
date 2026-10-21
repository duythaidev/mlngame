// src/net/stateSender.ts

export interface StateSenderOptions {
  minIntervalMs?: number;
  heartbeatMs?: number;
  /** Số lần ghi được phép chờ ack cùng lúc. RTDB giữ thứ tự ghi trên 1 kết nối nên gửi gối đầu an toàn;
   *  =1 thì tốc độ gửi bị khóa theo RTT (~60 ms → chỉ ~16 Hz). */
  maxInFlight?: number;
}

export class StateSender {
  private write: (payload: string) => Promise<void>;
  private minIntervalMs: number;
  private heartbeatMs: number;

  private maxInFlight: number;
  private inFlight = 0;
  private lastSentAt = -Infinity;
  private lastSentKey = "";

  constructor(write: (payload: string) => Promise<void>, opts?: StateSenderOptions) {
    this.write = write;
    this.minIntervalMs = opts?.minIntervalMs ?? 33;
    this.heartbeatMs = opts?.heartbeatMs ?? 1000;
    this.maxInFlight = opts?.maxInFlight ?? 3;
  }

  offer(payload: string, key: string, now: number): void {
    if (this.inFlight >= this.maxInFlight) {
      return;
    }

    const elapsed = now - this.lastSentAt;
    if (elapsed < this.minIntervalMs) {
      return;
    }

    const changed = key !== this.lastSentKey;
    const heartbeatDue = elapsed >= this.heartbeatMs;

    if (!changed && !heartbeatDue) {
      return;
    }

    this.inFlight++;
    this.lastSentAt = now;
    this.lastSentKey = key;

    this.write(payload)
      .catch(() => undefined)
      .finally(() => {
        this.inFlight--;
      });
  }
}
