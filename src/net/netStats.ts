// src/net/netStats.ts
export interface NetSummary {
  p50: number;
  p95: number;
  sendPerSec: number;
  recvPerSec: number;
}

export class NetStats {
  private sent = new Map<number, number>(); // seq -> sentAt
  private latencies: number[] = [];
  private sends: number[] = [];
  private recvs: number[] = [];

  markSent(seq: number, at: number): void {
    this.sent.set(seq, at);
    if (this.sent.size > 200) {
      let minKey = Infinity;
      for (const k of this.sent.keys()) {
        if (k < minKey) minKey = k;
      }
      if (minKey !== Infinity) this.sent.delete(minKey);
    }
  }

  markAcked(seq: number, at: number): void {
    // ack một seq = ack mọi seq <= nó chưa ack
    const toDelete: number[] = [];
    for (const [s, sentAt] of this.sent.entries()) {
      if (s <= seq) {
        const rtt = at - sentAt;
        if (rtt >= 0) {
          this.latencies.push(rtt);
          if (this.latencies.length > 100) this.latencies.shift();
        }
        toDelete.push(s);
      }
    }
    for (const s of toDelete) this.sent.delete(s);
  }

  countSend(now: number = performance.now()): void {
    this.sends.push(now);
    this.prune(now); // dọn ngay khi ghi: không phụ thuộc có ai gọi summary() (host không gọi → trước đây phình mãi)
  }

  countRecv(now: number = performance.now()): void {
    this.recvs.push(now);
    this.prune(now);
  }

  private prune(now: number): void {
    const windowStart = now - 1000;
    while (this.sends.length > 0 && this.sends[0] < windowStart) this.sends.shift();
    while (this.recvs.length > 0 && this.recvs[0] < windowStart) this.recvs.shift();
  }

  summary(now: number = performance.now()): NetSummary {
    this.prune(now);

    let p50 = 0;
    let p95 = 0;
    if (this.latencies.length > 0) {
      const sorted = [...this.latencies].sort((a, b) => a - b);
      const i50 = Math.floor(sorted.length * 0.5);
      const i95 = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
      p50 = Math.round(sorted[i50]);
      p95 = Math.round(sorted[i95]);
    }

    return {
      p50,
      p95,
      sendPerSec: this.sends.length,
      recvPerSec: this.recvs.length,
    };
  }
}
