# 04 — Snapshot và nội suy (repo `mlngame`)

- Codec v2 thêm **phần thứ 8 tùy chọn** = chuỗi `o`. Gói không có `o` (level luyện tập) vẫn đọc được.
- `changeKey` có `o` → nút đổi trạng thái, thang chạy, khối đỏ di chuyển… thì snapshot được gửi ngay (tối đa 30 lần/giây như cũ).
- `SnapshotBuffer.bodies(now)` nội suy vị trí thang/sàn chở/khối/khối đỏ **cùng thời điểm** với người chơi → người đứng trên sàn chở không bị lệch.

## Bước 1

**Tạo mới / thay toàn bộ** `src/net/codec.ts` (115 dòng):

```ts
// src/net/codec.ts
import type { Snapshot } from "../game/protocol";

export const WIRE_VERSION = "v2";

export function encodeSnapshot(s: Snapshot): string {
  const flags = (s.k ? 1 : 0) | (s.w ? 2 : 0) | (s.d ? 4 : 0) | (s.h ? 8 : 0);
  const slots = Object.keys(s.p ?? {}).sort();
  const pParts = slots.map((slot) => {
    const pos = s.p[slot] ?? [0, 0];
    const vel = s.v?.[slot] ?? [0, 0];
    const j = s.j?.[slot] ?? 0;
    const a = s.a?.[slot] ?? 0;
    return `${slot},${pos[0]},${pos[1]},${vel[0]},${vel[1]},${j},${a}`;
  });
  const base = `${WIRE_VERSION}|${s.t}|${s.r}|${flags}|${s.c}|${s.lv}|${pParts.join(";")}`;
  return s.o ? `${base}|${s.o}` : base; // phần thứ 8 (trạng thái vật thể) có thể không có
}

export function decodeSnapshot(raw: unknown): Snapshot | null {
  if (typeof raw !== "string") return null;
  if (!raw.startsWith(`${WIRE_VERSION}|`)) return null;

  const parts = raw.split("|");
  if (parts.length < 7) return null;

  const t = Number(parts[1]);
  const r = Number(parts[2]);
  const flags = Number(parts[3]);
  const c = Number(parts[4]);
  const lv = parts[5];
  const playersStr = parts[6];

  if (
    !Number.isFinite(t) ||
    !Number.isFinite(r) ||
    !Number.isFinite(flags) ||
    !Number.isFinite(c) ||
    !lv
  ) {
    return null;
  }

  const p: Record<string, [number, number]> = {};
  const v: Record<string, [number, number]> = {};
  const j: Record<string, number> = {};
  const a: Record<string, number> = {};

  if (playersStr && playersStr.trim().length > 0) {
    const playerTokens = playersStr.split(";");
    for (const token of playerTokens) {
      if (!token) continue;
      const sub = token.split(",");
      if (sub.length < 7) return null;
      const slot = sub[0];
      const px = Number(sub[1]);
      const py = Number(sub[2]);
      const vx = Number(sub[3]);
      const vy = Number(sub[4]);
      const jVal = Number(sub[5]);
      const aVal = Number(sub[6]);

      if (
        !slot ||
        !Number.isFinite(px) ||
        !Number.isFinite(py) ||
        !Number.isFinite(vx) ||
        !Number.isFinite(vy) ||
        !Number.isFinite(jVal) ||
        !Number.isFinite(aVal)
      ) {
        return null;
      }

      p[slot] = [px, py];
      v[slot] = [vx, vy];
      j[slot] = jVal;
      a[slot] = aVal;
    }
  }

  const res: Snapshot = {
    t,
    r,
    k: (flags & 1) ? 1 : 0,
    w: (flags & 2) ? 1 : 0,
    d: (flags & 4) ? 1 : 0,
    c,
    lv,
    p,
    v,
    j,
    a,
  };

  if ((flags & 8) !== 0) {
    res.h = 1;
  }
  if (parts[7]) res.o = parts[7];

  return res;
}

export function changeKey(s: Snapshot): string {
  const flags = (s.k ? 1 : 0) | (s.w ? 2 : 0) | (s.d ? 4 : 0) | (s.h ? 8 : 0);
  const slots = Object.keys(s.p ?? {}).sort();
  const pParts = slots.map((slot) => {
    const pos = s.p[slot] ?? [0, 0];
    const vel = s.v?.[slot] ?? [0, 0];
    const j = s.j?.[slot] ?? 0;
    const a = s.a?.[slot] ?? 0;
    return `${slot}:${pos[0]},${pos[1]},${vel[0]},${vel[1]},${j},${a}`;
  });
  return `${s.r}|${flags}|${s.c}|${s.lv}|${pParts.join(";")}|${s.o ?? ""}`;
}
```

## Bước 2

**Tạo mới / thay toàn bộ** `src/net/interpolate.ts` (96 dòng):

```ts
// src/net/interpolate.ts
// Nội suy snapshot cho client: vẽ "lùi về quá khứ" một chút (delayMs) và trượt mượt giữa 2 snapshot đã nhận.
// Không đoán trước → không bao giờ bị kéo lùi/giật răng cưa như ngoại suy.
// Thời gian dùng tick vật lý của server (60 tick/s) nên không bị nhiễu bởi việc gói tin đến dồn cục.
import { decodeObjView, type ObjView } from "../game/objects";
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

  /** Hai snapshot kẹp thời điểm hiển thị now − delayMs và tỉ lệ k giữa chúng (k = 0 → a, 1 → b). */
  private frame(now: number): { a: Snapshot; b: Snapshot; k: number } | null {
    const n = this.buf.length;
    if (n === 0 || this.offset === null) return null;
    const renderT = (now - this.offset - this.delayMs) / TICK_MS; // tính theo tick server

    let a = this.buf[0];
    let b = this.buf[n - 1];
    if (renderT >= b.t) return { a: b, b, k: 1 }; // chưa có dữ liệu mới hơn → giữ snapshot cuối
    if (renderT <= a.t) return { a, b: a, k: 1 };
    for (let i = 0; i < n - 1; i++) {
      if (this.buf[i].t <= renderT && renderT <= this.buf[i + 1].t) {
        a = this.buf[i];
        b = this.buf[i + 1];
        break;
      }
    }
    if (a.r !== b.r) return { a: b, b, k: 1 }; // không trượt xuyên qua lần reset (dịch chuyển thẳng)
    return { a, b, k: (renderT - a.t) / (b.t - a.t) };
  }

  /** Vị trí từng slot (đơn vị ô) tại thời điểm hiển thị now − delayMs. */
  positions(now: number): Record<string, [number, number]> {
    const f = this.frame(now);
    if (!f) return {};
    if (f.k >= 1) return toTiles(f.b.p);
    const out: Record<string, [number, number]> = {};
    for (const [slot, pb] of Object.entries(f.b.p)) {
      const pa = f.a.p[slot] ?? pb;
      out[slot] = [(pa[0] + (pb[0] - pa[0]) * f.k) / 100, (pa[1] + (pb[1] - pa[1]) * f.k) / 100];
    }
    return out;
  }

  /** Vị trí thang/sàn chở/khối (góc trên-trái, đơn vị ô) cùng thời điểm với positions() → người đứng trên không bị lệch. */
  bodies(now: number): [number, number][] {
    const f = this.frame(now);
    if (!f) return [];
    const vb = this.view(f.b);
    if (!vb) return [];
    const va = f.k >= 1 ? vb : this.view(f.a);
    if (!va || va.bodies.length !== vb.bodies.length) return vb.bodies;
    return vb.bodies.map(([x, y], i) => [va.bodies[i][0] + (x - va.bodies[i][0]) * f.k, va.bodies[i][1] + (y - va.bodies[i][1]) * f.k]);
  }

  private views = new WeakMap<Snapshot, ObjView | null>();
  private view(s: Snapshot): ObjView | null {
    let v = this.views.get(s);
    if (v === undefined) {
      v = decodeObjView(s.o);
      this.views.set(s, v);
    }
    return v;
  }
}

function toTiles(p: Snapshot["p"]): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  for (const [slot, [x, y]] of Object.entries(p)) out[slot] = [x / 100, y / 100];
  return out;
}
```

### ✅ Kiểm tra

```bash
npx vitest run src/net
```

Mọi test xanh.
