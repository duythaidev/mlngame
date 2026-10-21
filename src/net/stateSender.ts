// src/net/stateSender.ts

export interface StateSenderOptions {
  minIntervalMs?: number;
  heartbeatMs?: number;
}

export class StateSender {
  private write: (payload: string) => Promise<void>;
  private minIntervalMs: number;
  private heartbeatMs: number;

  private inFlight = false;
  private lastSentAt = -Infinity;
  private lastSentKey = "";

  constructor(write: (payload: string) => Promise<void>, opts?: StateSenderOptions) {
    this.write = write;
    this.minIntervalMs = opts?.minIntervalMs ?? 33;
    this.heartbeatMs = opts?.heartbeatMs ?? 1000;
  }

  offer(payload: string, key: string, now: number): void {
    if (this.inFlight) {
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

    this.inFlight = true;
    this.lastSentAt = now;
    this.lastSentKey = key;

    this.write(payload)
      .catch(() => undefined)
      .finally(() => {
        this.inFlight = false;
      });
  }
}
