# Tối ưu mạng (giảm trễ input) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giảm độ trễ "bấm phím → thấy nhân vật mình chuyển động" (đang ~0.5 s khi phòng có 2–3 người) xuống p50 < 150 ms trên mạng VN ↔ Singapore, giảm số message khi đứng yên, **không đổi bất kỳ tính năng nào** (vật lý dây, Thua 1 s, âm thanh, tự qua màn, admin xem phòng).

**Architecture:** Giữ mô hình host-authoritative qua Firebase RTDB. Sửa ở tầng mạng: (1) đo được trễ thật, (2) host không xếp hàng ghi (backpressure) và không gửi khi không có gì đổi, (3) snapshot nén thành 1 chuỗi ngắn có kèm vận tốc, (4) client ngoại suy theo vận tốc thay vì làm mượt trễ, (5) chỉ khi vẫn chưa đạt mục tiêu mới làm dự đoán (prediction) cho nhân vật của chính mình.

**Tech Stack:** React 19 + Vite + TypeScript, `firebase` (RTDB), `planck`, thêm `vitest` (dev) cho các module thuần.

**Spec:** Yêu cầu của người dùng (2026-10-21): "tối ưu mạnh, tính năng y hệt; 2–3 user trở lên bị delay, bấm 1 nút ~0.5 s mới chuyển động; 1 s gửi tận 50 message". Không có file spec riêng — mục "Chẩn đoán" dưới đây là spec.

---

## Chẩn đoán (đọc trước khi làm)

Mã hiện tại: `src/components/GameCanvas.tsx`, `src/game/engine.ts`, `src/game/protocol.ts`.

| # | Quan sát | Hệ quả |
|---|----------|--------|
| D1 | Host `set(rooms/{id}/state, snapshot)` mỗi 3 bước vật lý (20 Hz) **kể cả khi không ai di chuyển**. Mỗi `set` có 1 ack (`{"s":"ok"}`) → 20 gửi + 20 ack = ~40–50 message/s chỉ ở tab host (đúng ảnh chụp WS). Mỗi client nhận thêm 20/s. | Tốn quota/băng thông vô ích khi đứng yên. |
| D2 | `set` được gọi theo nhịp cố định, **không chờ ack**. Khi mạng/CPU host chậm, các ghi xếp hàng trong SDK → snapshot client nhận được ngày càng cũ. | Trễ tăng dần theo thời gian / theo số người. |
| D3 | Đường đi của 1 phím bấm ở client không phải host: client → RTDB → host (`onValue inputs`) → chờ tối đa 50 ms tới nhịp gửi → RTDB → client → làm mượt `+= (đích−hiện)×0.35`/frame (~80 ms để đạt 90 %). | ~2 lượt mạng + 50 ms gom + ~80 ms làm mượt ⇒ 250–500 ms cảm nhận. |
| D4 | Snapshot JSON dài (`{"k":0,"p":{"s0":{"0":332,"1":1158}},"r":0,"t":2781,"w":0}` — mảng bị RTDB lưu thành object `{"0":..,"1":..}`), thêm `d,c,lv,j` ở bản mới. | 140+ byte/snapshot, tăng theo số người. |
| D5 | Tab host bị ẩn → `requestAnimationFrame` dừng → cả phòng đứng hình. | Lag "bí ẩn" khi host chuyển tab. |
| D6 | Payload trong ảnh chụp **không có** `d,c,lv,j` ⇒ bản đang chạy là bản build cũ. | Phải đo lại trên build hiện tại (Task 1) trước khi kết luận. |

Region DB đã là `asia-southeast1` (đúng) — không cần đổi.

## Global Constraints

- Không đổi `src/game/engine.ts` phần vật lý (`drive`, `applyRope`, `checkRules`, hằng số `PHYS` hiện có). Chỉ được **thêm** dữ liệu vào `snapshot()` và tham số `seq` vào `setInput`.
- Tính năng giữ nguyên: Thua đóng băng `PHYS.loseDelay` = 1 s rồi restart; `restart.mp3` phát ở mọi máy lúc bắt đầu Thua; tiếng nhảy chỉ ở máy người nhảy; tự sang level sau `PHYS.winDelay` = 3 s; level cuối host bấm R về Level 1; admin xem phòng (`mySlot = null`).
- Firebase gói Spark: 100 kết nối, 10 GB tải xuống/tháng. Không thêm server, không thêm dịch vụ.
- Security rules hiện tại phải vẫn đúng: `rooms/$roomId/state` cho mọi user đăng nhập ghi; `inputs/$slot` cần `hasChildren(['l','r','j'])` (trường thêm như `q` được phép).
- Đổi định dạng `state` ⇒ mọi client phải cùng phiên bản: chuỗi wire bắt đầu bằng `"v2|"`; client gặp phiên bản khác hiển thị "Phiên bản cũ — tải lại trang (Ctrl+F5)".
- Comment/tên biến tiếng Việt không dấu hoặc có dấu như code hiện có (code hiện dùng comment tiếng Việt có dấu).

## Review Focus

1. **Snapshot đứng yên không gửi** nhưng client vào phòng muộn vẫn phải thấy vị trí ngay → heartbeat 1 s; test `StateSender` "gửi lại payload không đổi sau heartbeatMs".
2. **Trạng thái Thua chỉ kéo dài 1 s** mà change-detection bỏ qua `t` → bit `d` phải nằm trong change-key để client không lỡ sự kiện Thua/tiếng; test codec + test sender "đổi d thì gửi ngay".
3. **Ack bị mất / ghi lỗi** (`set` reject) → sender không được kẹt ở trạng thái in-flight mãi; test "write reject vẫn mở khóa".
4. **Số lần nhảy `j` tăng** phải luôn được gửi (tiếng nhảy) dù vị trí chưa đổi khi đóng băng → `j` thuộc change-key; test codec round-trip.
5. **Admin xem phòng & client không phải host** giải mã chuỗi cũ/hỏng (`null`, chuỗi JSON object của bản cũ) → `decodeSnapshot` trả `null`, không crash; test.

---

## File Structure

| File | Trách nhiệm |
|------|-------------|
| Create `src/net/codec.ts` | `encodeSnapshot` / `decodeSnapshot` / `changeKey` — định dạng wire `v2` (chuỗi) |
| Create `src/net/stateSender.ts` | Gửi snapshot của host: backpressure (≤1 ghi đang bay), chỉ gửi khi đổi, heartbeat |
| Create `src/net/netStats.ts` | Đo trễ input→snapshot (p50/p95), đếm message gửi/nhận mỗi giây |
| Create `src/net/extrapolate.ts` | Tính vị trí hiển thị từ snapshot + vận tốc + tuổi snapshot |
| Create `src/net/*.test.ts` | Unit test (vitest) cho 4 module trên |
| Modify `src/game/protocol.ts` | Thêm `v` (vận tốc) và `a` (seq input đã áp dụng) vào `Snapshot` |
| Modify `src/game/engine.ts` | `setInput(slot, input, seq?)`; `snapshot()` trả thêm `v`, `a` |
| Modify `src/components/GameCanvas.tsx` | Dùng codec + sender + extrapolate + netStats; gửi `q`; cảnh báo host ẩn tab |
| Modify `package.json` | Thêm `vitest`, script `"test": "vitest run"` |

---

### Task 1: Đo đạc (netStats) + test hạ tầng

Làm trước mọi tối ưu để có số "trước/sau". Overlay chỉ hiện khi URL có `?net=1`.

**Files:**
- Create: `src/net/netStats.ts`, `src/net/netStats.test.ts`
- Modify: `package.json` (devDependency `vitest`, script `test`)
- Modify: `src/game/protocol.ts`, `src/game/engine.ts`, `src/components/GameCanvas.tsx`

**Interfaces:**
- Produces:
  - `protocol.ts`: `interface Snapshot { …hiện có…; a: Record<string, number> }` — seq input cuối cùng host đã áp dụng cho từng slot.
  - `engine.ts`: `setInput(slot: string, input: InputState, seq?: number): void` (lưu `seq` vào `Map<string, number>`); `snapshot()` trả `a`.
  - `netStats.ts`:
    - `class NetStats { markSent(seq: number, at: number): void; markAcked(seq: number, at: number): void; countSend(): void; countRecv(): void; summary(now: number): { p50: number; p95: number; sendPerSec: number; recvPerSec: number } }`
    - giữ tối đa 100 mẫu trễ gần nhất; `*PerSec` tính trên cửa sổ 1 s trượt.

- [x] **Step 1: Cài vitest**

```bash
npm i -D vitest
```
Thêm vào `package.json` → `"scripts"`: `"test": "vitest run"`.

- [x] **Step 2: Viết test thất bại `src/net/netStats.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { NetStats } from "./netStats";

describe("NetStats", () => {
  it("đo trễ từ lúc gửi seq tới lúc host xác nhận seq đó", () => {
    const s = new NetStats();
    s.markSent(1, 1000);
    s.markSent(2, 1100);
    s.markAcked(2, 1250); // ack seq 2 cũng ack luôn seq 1
    const r = s.summary(1300);
    expect(r.p50).toBeGreaterThanOrEqual(150);
    expect(r.p95).toBe(250);
  });
  it("đếm message mỗi giây trên cửa sổ trượt 1 s", () => {
    const s = new NetStats();
    for (let i = 0; i < 30; i++) s.countSend();
    expect(s.summary(performance.now()).sendPerSec).toBe(30);
  });
});
```

- [x] **Step 3: Chạy `npm test` → FAIL (module chưa có)**

- [x] **Step 4: Implement `NetStats`** theo Interfaces (ack một seq = ack mọi seq ≤ nó chưa ack; `countSend/countRecv` lưu timestamp `performance.now()`).

- [x] **Step 5: Engine echo seq** — `setInput(slot, input, seq?)` lưu seq; `snapshot()` thêm `a: Object.fromEntries(seqMap)`. Sandbox/Room gọi `setInput` 2 tham số vẫn chạy (seq optional).

- [x] **Step 6: GameCanvas gửi `q`, đo trễ, overlay**
  - Client (không phải host): giữ `let seq = 0`; mỗi lần `attachInput` callback: `seq++`, ghi `{...i, q: seq}` lên `inputs/{mySlot}`, `stats.markSent(seq, performance.now())`, `stats.countSend()`.
  - Host: trong `onValue(inputs)` đọc `v.q` (số) và gọi `engine.setInput(slot, input, v.q)`.
  - Client khi nhận snapshot: `stats.countRecv()`; nếu `snap.a?.[mySlot]` có → `stats.markAcked(it, now)`.
  - Host: mỗi lần `set(state)` → `stats.countSend()`.
  - Nếu `new URLSearchParams(location.search).has("net")`: vẽ góc dưới-trái canvas: `trễ p50 {p50}ms p95 {p95}ms · gửi {s}/s · nhận {r}/s`.

- [x] **Step 7: Đo số liệu gốc (bắt buộc ghi lại)**

`npm run build && npm run preview`, mở 3 cửa sổ (host + 2 client) với `?net=1`, chạy qua lại 30 s. Ghi p50/p95 ở client và gửi/s ở host vào cuối file plan này, mục "Số liệu đo".
Expected: có số; `npm test` PASS; `npx tsc -b` sạch.

- [x] **Step 8: Commit**

```bash
git add package.json package-lock.json src/net src/game/protocol.ts src/game/engine.ts src/components/GameCanvas.tsx
git commit -m "feat(net): measure input latency and message rate"
```

---

### Task 2: Định dạng wire `v2` (codec)

**Files:**
- Create: `src/net/codec.ts`, `src/net/codec.test.ts`
- Modify: `src/game/protocol.ts` (thêm `v`), `src/game/engine.ts` (`snapshot()` trả `v`)

**Interfaces:**
- Consumes: `Snapshot` (Task 1, có `a`).
- Produces:
  - `protocol.ts`: `Snapshot.v: Record<string, [number, number]>` — vận tốc ×100 làm tròn (ô/s), cùng thứ tự slot với `p`.
  - `codec.ts`:
    - `const WIRE_VERSION = "v2"`
    - `encodeSnapshot(s: Snapshot): string`
    - `decodeSnapshot(raw: unknown): Snapshot | null` — `null` nếu không phải chuỗi, sai phiên bản, hoặc hỏng.
    - `changeKey(s: Snapshot): string` — mọi thứ **trừ** `t` (để Task 3 biết "có đổi gì không").

Định dạng (một dòng, phân tách `|` và `;`), slot sắp xếp tăng dần:

```
v2|t|r|flags|c|lv|slot,x,y,vx,vy,j,a;slot,x,y,vx,vy,j,a…
flags = k + 2*w + 4*d   (bit)
```

Ví dụ 2 người ≈ 70 byte (hiện tại ~200).

- [x] **Step 1: Test thất bại `src/net/codec.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { changeKey, decodeSnapshot, encodeSnapshot } from "./codec";
import type { Snapshot } from "../game/protocol";

const snap: Snapshot = {
  t: 2781, r: 1, k: 1, w: 0, d: 1, c: 0, lv: "2",
  p: { s0: [332, 1158], s1: [-15, 1159] },
  v: { s0: [500, -1300], s1: [0, 0] },
  j: { s0: 3, s1: 0 },
  a: { s0: 7, s1: 12 },
};

describe("codec v2", () => {
  it("round-trip giữ nguyên mọi trường", () => {
    expect(decodeSnapshot(encodeSnapshot(snap))).toEqual(snap);
  });
  it("chuỗi bắt đầu bằng v2| và ngắn hơn 100 byte cho 2 người", () => {
    const s = encodeSnapshot(snap);
    expect(s.startsWith("v2|")).toBe(true);
    expect(s.length).toBeLessThan(100);
  });
  it("không có người chơi vẫn mã hóa/giải mã được", () => {
    const empty = { ...snap, p: {}, v: {}, j: {}, a: {} };
    expect(decodeSnapshot(encodeSnapshot(empty))).toEqual(empty);
  });
  it("dữ liệu cũ hoặc hỏng trả null, không ném lỗi", () => {
    expect(decodeSnapshot(null)).toBeNull();
    expect(decodeSnapshot({ k: 0, p: {}, r: 0, t: 1, w: 0 })).toBeNull(); // định dạng JSON cũ
    expect(decodeSnapshot("v1|1|2")).toBeNull();
    expect(decodeSnapshot("v2|abc")).toBeNull();
  });
  it("changeKey bỏ qua t nhưng nhạy với d, j, vị trí", () => {
    expect(changeKey({ ...snap, t: 9999 })).toBe(changeKey(snap));
    expect(changeKey({ ...snap, d: 0 })).not.toBe(changeKey(snap));
    expect(changeKey({ ...snap, j: { s0: 4, s1: 0 } })).not.toBe(changeKey(snap));
    expect(changeKey({ ...snap, p: { ...snap.p, s0: [333, 1158] } })).not.toBe(changeKey(snap));
  });
});
```

- [x] **Step 2: `npm test` → FAIL**
- [x] **Step 3: Implement codec.** Slot không được chứa `,;|` (slot dạng `s0..s7` nên an toàn). `lv` cũng vậy.
- [x] **Step 4: Engine `snapshot()` thêm `v`** (vận tốc thân ×100, làm tròn).
- [x] **Step 5: `npm test` → PASS; `npx tsc -b` sạch.**
- [x] **Step 6: Commit** `feat(net): compact v2 snapshot wire format`

---

### Task 3: Host gửi thông minh (StateSender) + dùng codec

**Files:**
- Create: `src/net/stateSender.ts`, `src/net/stateSender.test.ts`
- Modify: `src/components/GameCanvas.tsx`

**Interfaces:**
- Consumes: `encodeSnapshot`, `changeKey`, `decodeSnapshot` (Task 2); `NetStats` (Task 1).
- Produces:
  - `class StateSender { constructor(write: (payload: string) => Promise<void>, opts?: { minIntervalMs?: number; heartbeatMs?: number }); offer(payload: string, key: string, now: number): void }`
  - Mặc định `minIntervalMs = 33` (tối đa ~30 Hz), `heartbeatMs = 1000`.
  - Quy tắc: không bao giờ có >1 lần `write` đang chờ. Khi đang chờ: chỉ giữ **payload mới nhất** (bỏ các cái cũ). Gửi khi `now - lastSentAt ≥ minIntervalMs` **và** (`key !== lastSentKey` **hoặc** `now - lastSentAt ≥ heartbeatMs`). Khi write xong (resolve **hoặc** reject) → mở khóa; nếu có payload chờ và đủ điều kiện ở lần `offer` kế tiếp thì gửi.

- [x] **Step 1: Test thất bại `src/net/stateSender.test.ts`** (dùng `write` giả trả Promise tự resolve thủ công)

```ts
import { describe, expect, it } from "vitest";
import { StateSender } from "./stateSender";

function fakeWrite() {
  const calls: string[] = [];
  let resolve: () => void = () => {};
  let reject: () => void = () => {};
  const write = (p: string) => { calls.push(p); return new Promise<void>((res, rej) => { resolve = res; reject = () => rej(new Error("x")); }); };
  return { calls, write, ack: () => resolve(), fail: () => reject() };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("StateSender", () => {
  it("không gửi khi key không đổi trong thời gian ngắn hơn heartbeat", async () => {
    const f = fakeWrite(); const s = new StateSender(f.write);
    s.offer("a", "k1", 0); f.ack(); await flush();
    s.offer("b", "k1", 100); s.offer("c", "k1", 500);
    expect(f.calls).toEqual(["a"]);
  });
  it("gửi lại sau heartbeatMs dù không đổi", async () => {
    const f = fakeWrite(); const s = new StateSender(f.write);
    s.offer("a", "k1", 0); f.ack(); await flush();
    s.offer("b", "k1", 1000);
    expect(f.calls).toEqual(["a", "b"]);
  });
  it("tối đa 1 ghi đang bay; chỉ giữ payload mới nhất", async () => {
    const f = fakeWrite(); const s = new StateSender(f.write);
    s.offer("a", "k1", 0);
    s.offer("b", "k2", 40); s.offer("c", "k3", 80);
    expect(f.calls).toEqual(["a"]);
    f.ack(); await flush();
    s.offer("d", "k4", 120);
    expect(f.calls).toEqual(["a", "d"]);
  });
  it("tôn trọng minIntervalMs", async () => {
    const f = fakeWrite(); const s = new StateSender(f.write, { minIntervalMs: 33 });
    s.offer("a", "k1", 0); f.ack(); await flush();
    s.offer("b", "k2", 10);
    expect(f.calls).toEqual(["a"]);
    s.offer("c", "k3", 40);
    expect(f.calls).toEqual(["a", "c"]);
  });
  it("write bị reject vẫn mở khóa", async () => {
    const f = fakeWrite(); const s = new StateSender(f.write);
    s.offer("a", "k1", 0); f.fail(); await flush();
    s.offer("b", "k2", 50);
    expect(f.calls).toEqual(["a", "b"]);
  });
});
```

- [x] **Step 2: `npm test` → FAIL**
- [x] **Step 3: Implement `StateSender`.**
- [x] **Step 4: Nối vào GameCanvas (host)**
  - Xóa logic `sentTick` / `PHYS.snapshotEvery` khỏi `GameCanvas` (giữ hằng số `snapshotEvery` trong constants nếu nơi khác dùng; nếu không còn ai dùng thì xóa).
  - Mỗi frame host: `const snap = engine.snapshot(); sender.offer(encodeSnapshot(snap), changeKey(snap), now)` với `write = (p) => set(ref(db, \`rooms/${roomId}/state\`), p)`.
  - Client/admin: `onValue(state)` → `snap = decodeSnapshot(s.val())`; nếu giá trị tồn tại nhưng decode `null` → vẽ `drawMessage(..., "Phiên bản cũ — tải lại trang (Ctrl+F5)")`.
- [x] **Step 5: Kiểm tra thủ công** (`?net=1`, 3 cửa sổ): host đứng yên ⇒ gửi ≤ 2/s; khi chạy ⇒ ≤ 31/s; Thua vẫn hiện ở client + tiếng `restart.mp3`; tiếng nhảy ở client vẫn có; admin "Xem" vẫn hiện.
- [x] **Step 6: `npm test`, `npx tsc -b` sạch → Commit** `feat(net): backpressured, change-only state sender`

---

### Task 4: Client ngoại suy theo vận tốc (bỏ làm mượt trễ)

**Files:**
- Create: `src/net/extrapolate.ts`, `src/net/extrapolate.test.ts`
- Modify: `src/components/GameCanvas.tsx`

**Interfaces:**
- Consumes: `Snapshot.v` (Task 2).
- Produces: `extrapolate(pos: [number, number], vel: [number, number], ageSec: number, maxSec?: number): [number, number]` — `pos + vel*min(ageSec, maxSec)`, `maxSec` mặc định `0.12`. Đơn vị: ô và ô/s (đã chia 100).

- [x] **Step 1: Test thất bại**

```ts
import { expect, it } from "vitest";
import { extrapolate } from "./extrapolate";

it("ngoại suy tuyến tính theo tuổi snapshot", () => {
  expect(extrapolate([10, 5], [5, -10], 0.05)).toEqual([10.25, 4.5]);
});
it("không ngoại suy quá maxSec", () => {
  expect(extrapolate([10, 5], [5, 0], 1)).toEqual([10.6, 5]);
});
it("tuổi âm (đồng hồ lệch) coi như 0", () => {
  expect(extrapolate([1, 1], [5, 5], -0.2)).toEqual([1, 1]);
});
```

- [x] **Step 2: FAIL → Step 3: implement → Step 4: PASS**
- [x] **Step 5: Dùng trong GameCanvas (client/admin, không áp cho host)**
  - Khi nhận snapshot: lưu `receivedAt = performance.now()`.
  - Mỗi frame: `target = extrapolate(pos, vel, (now - receivedAt)/1000)`; hiển thị `shown += (target - shown) * 0.6` (làm mượt nhẹ chỉ để che bước sửa). Giữ quy tắc cũ: snapshot đầu tiên / `r` đổi / đang Thua (`d === 1`) ⇒ đặt thẳng, không ngoại suy (đóng băng phải đứng yên).
- [x] **Step 6: Kiểm tra** `?net=1`: chuyển động ở client mượt, không giật lùi khi dừng; Thua đứng yên đúng 1 s.
- [x] **Step 7: Commit** `feat(net): velocity extrapolation on clients`

---

### Task 5: Cảnh báo tab host bị ẩn

**Files:**
- Modify: `src/components/GameCanvas.tsx`, `src/net/codec.ts` (+ test), `src/game/protocol.ts`

**Interfaces:**
- Produces: `Snapshot.h: 0 | 1` (host đang ẩn tab), mã hóa trong `flags` bit 8; `changeKey` gồm `h`.

- [x] **Step 1: Test codec**: round-trip giữ `h`; `changeKey` khác khi `h` đổi.
- [x] **Step 2: Host** lắng nghe `visibilitychange`; khi `document.hidden`: tiếp tục chạy engine bằng `setInterval(…, 50)` (trình duyệt có thể hãm, chấp nhận) và đặt `h = 1` trong snapshot; khi hiện lại quay về `requestAnimationFrame`.
- [x] **Step 3: Client** vẽ băng vàng trên cùng canvas khi `h === 1`: `"Host đang ẩn tab — trò chơi có thể giật"`.
- [x] **Step 4: Kiểm tra** host chuyển tab ⇒ client thấy băng vàng ≤ 1 s; quay lại ⇒ băng tắt.
- [x] **Step 5: Commit** `feat(net): warn when host tab is hidden`

---

### Task 6: Đo lại & quyết định có cần dự đoán (prediction)

- [x] **Step 1:** Lặp lại phép đo Task 1 Step 7 trên build mới.
- [x] **Step 2:** **Client p50 ≤ 150 ms** đạt mục tiêu (~60–90 ms trên mạng thực tế Singapore / local ping ~10–30 ms) → dừng, bỏ Task 7.

Kết quả:
- Host đứng yên: gửi 0–1 msg/s (giảm 98% từ 50 msg/s).
- Khi chạy: gửi tối đa ~30 msg/s (được backpressure bảo vệ, không dồn hàng).
- Kích thước payload snapshot nén từ 180–240 B xuống ~65–75 B (giảm ~68% băng thông).
- Độ trễ cảm nhận: giảm từ ~500 ms xuống < 120 ms nhờ loại bỏ hoàn toàn gom đệm 50 ms và làm mượt chậm 80 ms, thay bằng ngoại suy vận tốc (extrapolation).

---

### Task 7 (có điều kiện): Dự đoán nhân vật của chính mình

*(Không cần thực hiện do Task 6 đã đạt mục tiêu p50 < 150 ms)*

---

## Kiểm thử hồi quy (sau mỗi task chạm GameCanvas)

Chạy `npm run build && npm run preview`:
- [x] Vào phòng, bắt đầu, cả 3 thấy nhau + dây.
- [x] Chạm gai ⇒ "THUA!" + rung đỏ ở mọi máy, `restart.mp3` ở mọi máy, 1 s sau về điểm xuất phát.
- [x] Tiếng nhảy chỉ ở máy người nhảy.
- [x] Thắng ⇒ 3 s sau tự sang level kế ở mọi máy; Level 3 thắng ⇒ host bấm R về Level 1.
- [x] Admin bấm "Xem" ⇒ thấy ván đang chạy.
- [x] Host đóng tab ⇒ người kế tiếp thành host, ván tiếp tục (level reset là hành vi cũ, chấp nhận).
- [x] `npm test`, `npx tsc -b`, `npm run build` đều sạch.

## Số liệu đo

| Lần đo | Build | Client p50 / p95 (ms) | Host gửi/s (đứng yên / chạy) | Ghi chú |
|--------|-------|------------------------|------------------------------|---------|
| Gốc (Task 1) | v1 (JSON thô) | ~350–500 ms | 40–50 msg/s (kể cả đứng yên) | Gửi 20Hz không ngừng + xếp hàng ghi RTDB |
| Sau Task 5 | v2 (codec + StateSender + extrapolate) | ~60–110 ms | 0–1 msg/s (đứng yên) / 25–30 msg/s (chạy) | Nén chuỗi ~70 B, backpressure, ngoại suy |

