// src/net/interpolate.ts
// Nội suy snapshot cho client: vẽ "lùi về quá khứ" một chút (delayMs) và trượt mượt giữa 2 snapshot đã nhận.
// Không đoán trước → không bao giờ bị kéo lùi/giật răng cưa như ngoại suy.
// Thời gian dùng tick vật lý của server (60 tick/s) nên không bị nhiễu bởi việc gói tin đến dồn cục.
import type { Snapshot } from "../game/protocol";

const TICK_MS = 1000 / 60;

export class SnapshotBuffer {
  private buf: Snapshot[] = [];
  private offset: number | null = null; // ước lượng: giờ cục bộ (ms) − giờ server (ms)
  private delayMs: number;

  constructor(delayMs = 100) {
    this.delayMs = delayMs;
  }

  push(s: Snapshot, recvAt: number): void {
    const last = this.buf[this.buf.length - 1];
    if (last && s.t < last.t) this.buf = []; // engine mới (tick đếm lại từ đầu)
    if (last && s.t === last.t) return;
    this.buf.push(s);
    if (this.buf.length > 32) this.buf.shift();

    // gói đến sớm nhất cho ước lượng tốt nhất; tụt xuống ngay, tăng lên từ từ (bù trôi đồng hồ)
    const o = recvAt - s.t * TICK_MS;
    if (this.offset === null || o < this.offset || last === undefined) this.offset = o;
    else this.offset += (o - this.offset) * 0.02;
  }

  latest(): Snapshot | null {
    return this.buf[this.buf.length - 1] ?? null;
  }

  /** Vị trí từng slot (đơn vị ô) tại thời điểm hiển thị now − delayMs. */
  positions(now: number): Record<string, [number, number]> {
    const n = this.buf.length;
    if (n === 0 || this.offset === null) return {};
    const renderT = (now - this.offset - this.delayMs) / TICK_MS; // tính theo tick server

    let a = this.buf[0];
    let b = this.buf[n - 1];
    if (renderT >= b.t) return toTiles(b.p); // chưa có dữ liệu mới hơn → giữ snapshot cuối
    if (renderT <= a.t) return toTiles(a.p);
    for (let i = 0; i < n - 1; i++) {
      if (this.buf[i].t <= renderT && renderT <= this.buf[i + 1].t) {
        a = this.buf[i];
        b = this.buf[i + 1];
        break;
      }
    }
    if (a.r !== b.r) return toTiles(b.p); // không trượt xuyên qua lần reset (dịch chuyển thẳng)
    const k = (renderT - a.t) / (b.t - a.t);
    const out: Record<string, [number, number]> = {};
    for (const [slot, pb] of Object.entries(b.p)) {
      const pa = a.p[slot] ?? pb;
      out[slot] = [(pa[0] + (pb[0] - pa[0]) * k) / 100, (pa[1] + (pb[1] - pa[1]) * k) / 100];
    }
    return out;
  }
}

function toTiles(p: Snapshot["p"]): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  for (const [slot, [x, y]] of Object.entries(p)) out[slot] = [x / 100, y / 100];
  return out;
}
