# Game server riêng (Express + Socket.IO + SQLite) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển toàn bộ phần chơi realtime (vật lý, dây, Thua, qua màn) từ trình duyệt/Firebase sang **một tiến trình Node trên server VN của người dùng**, phục vụ **30 người chơi cùng lúc** mượt như nhau, không có "host".

**Architecture:** Backend là **repo riêng ở `E:\Web\mln131\mln-server`** (thư mục đang trống, cạnh `mlngame`). Server Node (Express + Socket.IO) giữ mỗi phòng là một `GameEngine` (bản sao nguyên văn `mlngame/src/game/*`, đồng bộ bằng script) chạy 60 Hz trong RAM, nhận phím bấm, phát snapshot ≤ 30 Hz. Trình duyệt chỉ gửi phím và vẽ bằng nội suy. Firebase **giữ nguyên** cho đăng nhập, sảnh, vào phòng, admin. Kết quả hoàn thành level lưu bằng **SQLite tích hợp sẵn của Node (`node:sqlite`)** trên server. Không Docker: chạy bằng `systemd`, mở ra internet qua Cloudflare Tunnel đang có.

**Tech Stack:** Node ≥ 22.13 (khuyên Node 24 LTS), Express 5, Socket.IO 4 (server + `socket.io-client`), `jose` (kiểm tra ID token Firebase), `node:sqlite`, esbuild (đóng gói server), vitest. Client: React 19 + Vite như hiện tại.

**Spec:** Thiết kế ở mục "Thiết kế" ngay dưới (thay thế spec `docs/superpowers/specs/2026-10-21-moi-may-tu-lai-design.md` — mô hình "mỗi máy tự lái" sẽ bị gỡ). Yêu cầu người dùng: "express + socket, SQLite nếu cần, hạn chế docker, server ở VN, 30 user cùng lúc, server nhẹ, DB nhẹ, tải ổn". Ping máy người dùng → server: 6–7 ms (qua Tailscale).

---

## Thiết kế

### Luồng

```
Trình duyệt ──Firebase──► đăng nhập ẩn danh, sảnh, chiếm ô (slots), admin       (KHÔNG ĐỔI)
Trình duyệt ──Socket.IO (wss://game.<domain>)──► Cloudflare Tunnel ──► Node :3500 trên server VN
   join {roomId, idToken}  ─►  kiểm tra token (jose) + đọc slots qua RTDB REST bằng chính token đó
   in {l,r,j,q}            ─►  room.engine.setInput(slot, …, q)
   restart {}              ─►  chỉ ô nhỏ nhất, chỉ khi đã thắng
   ◄─ snap "v2|…"             ≤ 30 Hz, chỉ khi đổi + nhắc lại 1 s (volatile)
Server ──node:sqlite──► results(room_id, level_id, seconds, players, created_at)
Admin page ──HTTP GET /api/results──► server
```

### Quy tắc phòng (chuyển nguyên logic "host" cũ lên server)

| Việc | Quy tắc |
|------|---------|
| Tạo phòng | Khi socket đầu tiên `join` phòng đó. Level ban đầu = `roomList/{id}/level` (đọc qua RTDB REST bằng token người join) |
| Người chơi trong engine | Tập ô của các socket đang kết nối. Đổi tập này → dựng lại engine cùng level (hành vi cũ: level reset) |
| Một ô có 2 socket (tải lại trang) | Socket mới thay socket cũ (`disconnect(true)` socket cũ) |
| Thua | Engine chế độ toàn-local (không truyền `onDied`) tự đóng băng `PHYS.loseDelay` rồi restart — **không cần code thêm** |
| Thắng | Cạnh lên `engine.won`: ghi kết quả SQLite `(tick − levelStartTick)/60` giây (1 chữ số thập phân). Sau `PHYS.winDelay` giây: còn level kế → `engine.setLevel(next)`, `levelStartTick = engine.tick` |
| Phím R | Chỉ ô nhỏ nhất, chỉ khi `engine.won`: không phải level cuối → `engine.restart()`; level cuối → `engine.setLevel(LEVEL_IDS[0])`; cập nhật `levelStartTick` |
| Hủy phòng | 60 s sau khi không còn socket nào |
| Vòng lặp | **Một** `setInterval(…, 1000/60)` cho mọi phòng; `dt` đo bằng `performance.now()`; mỗi phòng `engine.update(dt)` rồi `sender.offer(...)` |

### Giao thức Socket.IO

| Hướng | Sự kiện | Dữ liệu | Ghi chú |
|-------|---------|---------|---------|
| C→S | `join` | `{ roomId: string, idToken: string }`, ack `(res: { ok: true, slot: string } \| { ok: false, error: string })` | Lỗi: `"auth"`, `"not-in-room"`, `"bad-request"` |
| C→S | `in` | `{ l: 0\|1, r: 0\|1, j: 0\|1, q: number }` | Bỏ qua nếu socket chưa join hoặc gửi > 60 lần/s |
| C→S | `restart` | `{}` | Xem quy tắc phím R |
| S→C | `snap` | chuỗi codec `v2` (khôi phục `src/net/codec.ts` từ commit `c9acd44`) | Gửi bằng `io.to(roomId).volatile.emit` |
| S→C | `names` | `Record<slot, { name: string; avatar?: string }>` | Khi danh sách người đổi (client đang có slots từ Firebase nên chỉ là dự phòng; có thể bỏ nếu Firebase đủ) |

Client kết nối bằng `io(GAME_SERVER_URL, { transports: ["websocket"] })` (không long-polling — đi qua Cloudflare Tunnel ổn định hơn).

### Dữ liệu SQLite

```sql
CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  level_id TEXT NOT NULL,
  seconds REAL NOT NULL,
  players TEXT NOT NULL,          -- JSON: ["Tên A","Tên B"]
  created_at INTEGER NOT NULL     -- Date.now()
);
CREATE INDEX IF NOT EXISTS idx_results_room ON results(room_id, level_id, created_at);
```

`PRAGMA journal_mode = WAL;` khi mở DB. Ghi tối đa vài lần/phút → không ảnh hưởng gì.

### Ngân sách tải (30 người ≈ 8 phòng × 4)

| Tài nguyên | Ước tính | Giới hạn đặt |
|------------|----------|--------------|
| RAM tiến trình | 60–120 MB | `MemoryMax=300M` trong systemd |
| CPU | < 10 % một nhân (8 world Planck × 60 Hz) | — |
| Mạng ra | 30 × 30 snap/s × ~120 B ≈ 110 KB/s | — |

Server đang **đầy swap (3.8/3.8 GB)** → game phải nhỏ và ổn định; Task 9 có bài đo tải bắt buộc trên chính server.

## Global Constraints

- Node trên server ≥ 22.13 (có `node:sqlite` không cần cờ); khuyên Node 24 LTS. Không dùng Docker cho game server.
- **Hai repo:** web = `mlngame/` (giữ nguyên chỗ), backend = `mln-server/` (repo git riêng). Code game dùng chung được **copy** vào `mln-server/src/shared/` bằng `npm run sync-shared` (nguồn duy nhất là `mlngame/src/...`; không sửa tay bản copy). Trong bảng/task dưới, đường dẫn bắt đầu bằng `src/` là của `mlngame`, bắt đầu bằng `mln-server/` là của backend.
- Không sửa vật lý: `src/game/engine.ts` chỉ được dùng ở chế độ toàn-local (`new GameEngine(level, slots)` không có `onDied`/`onGotKey`). Giữ nguyên `PHYS`.
- `src/game/*` và `src/lib/constants.ts` phải import được trong Node (không import ảnh/CSS).
- Firebase vẫn dùng cho Auth + `roomList` + `rooms/{id}/slots` + `admins`; rules hiện tại không cần đổi để chạy (node `pos`/`game` thành thừa).
- Cổng server: `3500` (đổi nếu bận), bind **không** ra IP public (chỉ `127.0.0.1` hoặc IP `docker0`).
- `CORS_ORIGIN` = domain web thật (vd `https://mlngame-nu.vercel.app`) + `http://localhost:5173` khi dev.
- Tính năng giữ y hệt: Thua 1 s + `restart.mp3` mọi máy; tiếng nhảy chỉ máy mình (theo `j[mySlot]` tăng); tự qua màn 3 s; R về Level 1 ở level cuối (có nút R trên điện thoại); nút cảm ứng; admin thấy thời gian hoàn thành.

## Review Focus

1. **Người chơi tải lại trang giữa ván** → socket mới cùng ô phải thay socket cũ, engine không bị dựng lại 2 lần, không có ô "ma". Test ở Task 4.
2. **Token hết hạn / sai project** → `join` trả `{ok:false,error:"auth"}`, không làm crash server, client hiện "Không vào được phòng chơi — tải lại trang". Test ở Task 5.
3. **Client gửi `in` dồn dập hoặc rác** (`l: 5`, thiếu trường, 1000 lần/s) → chuẩn hóa về 0/1, bỏ quá 60/s, không ném lỗi. Test ở Task 4.
4. **Phòng trống bị giữ mãi trong RAM** → hủy sau 60 s; test bằng đồng hồ giả ở Task 4.
5. **Mất kết nối giữa ván** (Wi-Fi chập chờn) → Socket.IO tự nối lại, client tự `join` lại và tiếp tục vẽ; trong lúc mất hiện "Đang kết nối lại…". Test thủ công ở Task 9.

---

## File Structure

| File | Trách nhiệm |
|------|-------------|
| Create `src/lib/avatars.ts` | `PresetAvatar`, `PRESET_AVATARS` (chuyển từ `constants.ts` để `constants.ts` không import ảnh) |
| Modify `src/lib/constants.ts` | Bỏ import ảnh + avatar |
| Modify `src/pages/Home.tsx`, `src/pages/Room.tsx` | Import avatar từ `src/lib/avatars.ts` |
| Restore `src/net/codec.ts` (+ test) | Codec snapshot `v2` (từ commit `c9acd44`) — dùng chung server/client |
| Create `mln-server/` (git init) `package.json`, `tsconfig.json`, `vitest.config.ts` | Repo backend riêng, build bằng esbuild, test bằng vitest của chính nó |
| Create `mln-server/scripts/sync-shared.mjs` | Copy từ `../mlngame/src/`: `game/engine.ts, level.ts, protocol.ts`, `lib/constants.ts`, `net/codec.ts, stateSender.ts` → `mln-server/src/shared/` (giữ cấu trúc `game/`, `lib/`, `net/`), thêm dòng đầu `// AUTO-COPIED from mlngame — do not edit` |
| Create `mln-server/src/shared/**` | Bản copy (commit vào repo backend để deploy không cần repo web) |
| Create `mln-server/src/config.ts` | Đọc biến môi trường |
| Create `mln-server/src/room.ts` | `Room`: engine + người chơi + quy tắc thắng/R/kết quả + gửi snapshot |
| Create `mln-server/src/roomManager.ts` | Tạo/hủy phòng, vòng lặp 60 Hz chung |
| Create `mln-server/src/auth.ts` | `verifyIdToken`, `lookupMembership` qua RTDB REST |
| Create `mln-server/src/db.ts` | `openDb`, `insertResult`, `listResults` (`node:sqlite`) |
| Create `mln-server/src/index.ts` | Express (`/health`, `/api/results`) + Socket.IO + nối các phần |
| Create `mln-server/src/*.test.ts` | Test vitest cho room, roomManager, auth, db, tích hợp socket |
| Create `mln-server/scripts/loadtest.ts` | Mở 30 client giả, đo CPU/RAM/độ trễ |
| Create `mln-server/deploy/mlngame.service` | Unit systemd |
| Create `src/net/gameSocket.ts` | Client: kết nối, `join`, gửi `in`/`restart`, nhận `snap` |
| Rewrite `src/components/GameCanvas.tsx` | Client thuần: socket + `SnapshotBuffer` + vẽ + âm thanh |
| Modify `src/pages/Admin.tsx` | Bảng kết quả lấy từ `GET /api/results` |
| Delete (Task 8) | `src/net/gameState*`, `gameSync*`, `posCodec*`, `RemoteTrack` trong `interpolate.ts`, chế độ remote trong engine **chỉ nếu** không còn ai dùng (xem Task 8) |

---

### Task 1: Code game import được trong Node + khôi phục codec snapshot

**Files:**
- Create: `src/lib/avatars.ts`
- Modify: `src/lib/constants.ts`, `src/pages/Home.tsx`, `src/pages/Room.tsx`
- Restore: `src/net/codec.ts`, `src/net/codec.test.ts`

**Interfaces:**
- Produces: `src/lib/avatars.ts` export `PresetAvatar`, `PRESET_AVATARS` (y hệt hiện tại). `src/net/codec.ts` export `encodeSnapshot(s: Snapshot): string`, `decodeSnapshot(raw: unknown): Snapshot | null`, `changeKey(s: Snapshot): string`.

- [ ] **Step 1:** Khôi phục codec: `git show c9acd44:src/net/codec.ts > src/net/codec.ts` và `git show c9acd44:src/net/codec.test.ts > src/net/codec.test.ts`.
- [ ] **Step 2:** Chuyển `PresetAvatar` + `PRESET_AVATARS` + 4 import ảnh sang `src/lib/avatars.ts`; sửa import ở `Home.tsx`, `Room.tsx`.
- [ ] **Step 3: Kiểm tra Node import được engine** — tạo tạm `scratch-node-check.mjs` ở gốc repo (xóa sau khi chạy):

```bash
npx esbuild src/game/engine.ts --bundle --platform=node --format=esm --outfile=/tmp/engine-check.mjs && node -e "import('/tmp/engine-check.mjs').then(m=>console.log(typeof m.GameEngine))"
```
Expected: in ra `function`. (Trên Windows thay `/tmp` bằng thư mục tạm.)
- [ ] **Step 4:** `npm test`, `npx tsc -b`, `npm run build` sạch.
- [ ] **Step 5: Commit** (repo `mlngame`) `refactor: make game code node-importable; restore v2 snapshot codec`
- [ ] **Step 6: Quy tắc đồng bộ:** mỗi khi sửa `mlngame/src/game/*`, `src/lib/constants.ts`, `src/net/codec.ts` hoặc `src/net/stateSender.ts` → chạy `npm run sync-shared` trong `mln-server` và commit bên đó. Thêm test `mln-server/src/shared.test.ts`: nếu thư mục `../mlngame` tồn tại thì so nội dung từng file copy với nguồn (bỏ dòng đầu AUTO-COPIED), khác → FAIL "chạy npm run sync-shared"; không tồn tại → skip.

---

### Task 2: Khung server (Express + Socket.IO + build)

**Files:**
- Create: `mln-server/package.json`, `mln-server/tsconfig.json`, `mln-server/src/config.ts`, `mln-server/src/index.ts`, `mln-server/.env.example`, `mln-server/.gitignore` (`dist/`, `node_modules/`, `.env`, `data/`)
- Create: `mln-server/vitest.config.ts` (`test.environment = "node"`), `mln-server/scripts/sync-shared.mjs`
- Step 0 (trước Step 1): `cd E:\Web\mln131\mln-server && git init`, tạo `package.json`, chạy `npm run sync-shared` (script copy ở bảng File Structure) → `mln-server/src/shared/` có đủ file; `git add . && git commit -m "chore: init mln-server with shared game code"`. Người dùng tạo repo GitHub cho `mln-server` và `git remote add origin …` (cần cho bước deploy).

**Interfaces:**
- Produces:
  - `config.ts`: `export const config = { port: number, host: string, corsOrigins: string[], firebaseProjectId: string, firebaseDbUrl: string, dbPath: string, authDisabled: boolean }` — đọc `PORT`(3500), `HOST`(127.0.0.1), `CORS_ORIGIN` (phân tách dấu phẩy), `FIREBASE_PROJECT_ID`, `FIREBASE_DB_URL`, `DB_PATH`(`./data/game.db`), `AUTH_DISABLED` (`"1"` chỉ được chấp nhận khi `NODE_ENV !== "production"`, ngược lại ném lỗi khi khởi động).
  - `index.ts`: `export function createServer(deps?: Partial<Deps>): { httpServer: http.Server; io: Server; close(): Promise<void> }` (để test khởi động trên cổng ngẫu nhiên). Chạy trực tiếp (`node dist/index.mjs`) thì `listen(config.port, config.host)`.
  - `GET /health` → `200 {"ok":true,"rooms":<số phòng>,"players":<số socket>}`.
- `mln-server/package.json`:
  - `"type": "module"`, scripts: `"build": "esbuild src/index.ts --bundle --platform=node --format=esm --target=node22 --outfile=dist/index.mjs --packages=external"`, `"start": "node dist/index.mjs"`, `"dev": "tsx watch src/index.ts"`.
  - dependencies: `express`, `socket.io`, `jose`, `planck` (cùng phiên bản với web, vì `--packages=external`). devDependencies: `esbuild`, `tsx`, `typescript`, `@types/express`, `socket.io-client`.

- [ ] **Step 1: Test thất bại `mln-server/src/index.test.ts`**

```ts
import { afterAll, beforeAll, expect, it } from "vitest";
import { createServer } from "./index";

let srv: ReturnType<typeof createServer>;
let base = "";
beforeAll(async () => {
  srv = createServer();
  await new Promise<void>((r) => srv.httpServer.listen(0, "127.0.0.1", r));
  const addr = srv.httpServer.address() as { port: number };
  base = `http://127.0.0.1:${addr.port}`;
});
afterAll(() => srv.close());

it("GET /health trả ok và số phòng = 0", async () => {
  const res = await fetch(`${base}/health`);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true, rooms: 0, players: 0 });
});
```

- [ ] **Step 2:** `cd mln-server && npm install` rồi từ gốc `npm test` → FAIL.
- [ ] **Step 3:** Implement `config.ts`, `index.ts` (Socket.IO `cors: { origin: config.corsOrigins }`, `transports: ["websocket"]`, `pingInterval: 10000`, `pingTimeout: 8000`).
- [ ] **Step 4:** `npm test` PASS; `cd mln-server && npm run build && node dist/index.mjs` → log `listening on 127.0.0.1:3500`; `curl http://127.0.0.1:3500/health` → `{"ok":true,...}`.
- [ ] **Step 5: Commit** `feat(server): express + socket.io skeleton with health endpoint`

---

### Task 3: SQLite kết quả + `/api/results`

**Files:**
- Create: `mln-server/src/db.ts`, `mln-server/src/db.test.ts`
- Modify: `mln-server/src/index.ts`

**Interfaces:**
- Produces:
  - `openDb(path: string): GameDb` (dùng `DatabaseSync` của `node:sqlite`; `":memory:"` cho test; tự tạo thư mục cha; chạy schema + `PRAGMA journal_mode = WAL`).
  - `interface ResultRow { roomId: string; roomName: string; levelId: string; seconds: number; players: string[]; createdAt: number }`
  - `GameDb.insertResult(r: ResultRow): void`, `GameDb.listResults(opts?: { roomId?: string; limit?: number }): ResultRow[]` (mới nhất trước, `limit` mặc định 200, tối đa 1000), `GameDb.close(): void`.
  - `GET /api/results?roomId=&limit=` → `ResultRow[]` (JSON). Đọc công khai (demo).

- [ ] **Step 1: Test thất bại**

```ts
import { expect, it } from "vitest";
import { openDb } from "./db";

it("ghi và đọc kết quả, mới nhất trước, lọc theo phòng", () => {
  const db = openDb(":memory:");
  db.insertResult({ roomId: "A", roomName: "Phòng A", levelId: "1", seconds: 42.3, players: ["Bo", "Cam"], createdAt: 1000 });
  db.insertResult({ roomId: "A", roomName: "Phòng A", levelId: "2", seconds: 61, players: ["Bo", "Cam"], createdAt: 2000 });
  db.insertResult({ roomId: "B", roomName: "Phòng B", levelId: "1", seconds: 30.5, players: ["Du"], createdAt: 3000 });
  expect(db.listResults({ roomId: "A" }).map((r) => r.levelId)).toEqual(["2", "1"]);
  expect(db.listResults()[0]).toEqual({ roomId: "B", roomName: "Phòng B", levelId: "1", seconds: 30.5, players: ["Du"], createdAt: 3000 });
  expect(db.listResults({ limit: 1 })).toHaveLength(1);
  db.close();
});
```
Thêm vào `index.test.ts`: `GET /api/results` trả `[]` với DB rỗng.

- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(server): sqlite results store and /api/results`

---

### Task 4: `Room` + `RoomManager` (logic chơi, không mạng)

**Files:**
- Create: `mln-server/src/room.ts`, `mln-server/src/room.test.ts`, `mln-server/src/roomManager.ts`, `mln-server/src/roomManager.test.ts`

**Interfaces:**
- Consumes: `GameEngine`, `getLevel`, `nextLevelId`, `LEVEL_IDS` (`mln-server/src/shared/game/*`), `PHYS` (`mln-server/src/shared/lib/constants.ts`), `encodeSnapshot`, `changeKey` (`mln-server/src/shared/net/codec.ts`), `StateSender` (`mln-server/src/shared/net/stateSender.ts`, dùng `minIntervalMs: 33`, `heartbeatMs: 1000`, `maxInFlight: 1` với `write` trả Promise đã resolve), `GameDb.insertResult`.
- Produces:
  - `class Room { constructor(opts: { id: string; name: string; levelId: string; emit: (snap: string) => void; onResult: (r: ResultRow) => void; now?: () => number }); addPlayer(slot: string, name: string): void; removePlayer(slot: string): void; setInput(slot: string, raw: unknown): void; requestRestart(slot: string): void; step(dt: number): void; readonly playerCount: number; readonly emptySince: number | null }`
    - `setInput` chuẩn hóa: `l/r/j` → `=== 1 ? 1 : 0`, `q` → số nguyên ≥ 0 hoặc bỏ; giới hạn 60 lần/s/slot (cửa sổ 1 s, theo `now()`).
    - `addPlayer`/`removePlayer` đổi tập ô → `new GameEngine(getLevel(levelId hiện tại), slots)`; `addPlayer` với ô đã có → chỉ cập nhật tên, **không** dựng lại.
    - `step(dt)`: `engine.update(dt)` → xử lý cạnh thắng (ghi kết quả qua `onResult`) → hẹn giờ qua màn (`PHYS.winDelay`, tính bằng `now()`) → `sender.offer(encodeSnapshot(snap), changeKey(snap), now())`.
    - `requestRestart(slot)`: chỉ khi `slot` là ô nhỏ nhất và `engine.won`.
  - `class RoomManager { constructor(opts: { createRoomEmit: (roomId: string) => (snap: string) => void; onResult: (r: ResultRow) => void; now?: () => number; emptyTtlMs?: number /* 60000 */ }); getOrCreate(id: string, name: string, levelId: string): Room; get(id: string): Room | undefined; tick(): void; start(): void /* setInterval 1000/60 gọi tick */; stop(): void; readonly roomCount: number }`
    - `tick()`: đo `dt` theo `now()`, gọi `room.step(dt)` mọi phòng; xóa phòng có `emptySince` và `now − emptySince ≥ emptyTtlMs`.

- [ ] **Step 1: Test thất bại `room.test.ts`** (đồng hồ giả `let t = 0; const now = () => t;`):
  - "thêm 2 người → snapshot đầu có 2 slot, lv = levelId".
  - "addPlayer lại cùng ô không dựng lại engine" (snapshot `t` không về 0 sau khi đã chạy 1 s).
  - "input rác được chuẩn hóa và không ném" (`setInput("s0", { l: 5, r: "x" })` rồi `step` không lỗi).
  - "quá 60 input/s bị bỏ" (gửi 100 lần trong cùng `now`, chỉ 60 lần gọi tới engine — spy `engine.setInput` qua `vi.spyOn(room as any, "engine", "get")` hoặc expose `__inputsAccepted` cho test).
  - "thắng → onResult đúng 1 lần với seconds = tick/60 làm tròn 0.1; 3 s sau sang level kế; snapshot lv đổi" (ép thắng bằng cách đặt `(room as any).engine.won = true` và `hasKey = true`).
  - "R: ô không phải nhỏ nhất bị bỏ qua; ô nhỏ nhất ở level cuối → về Level 1".
  - "snapshot chỉ gửi khi đổi: đứng yên 2 s → emit ≤ 3 lần".
- [ ] **Step 2: Test thất bại `roomManager.test.ts`**: "phòng trống bị xóa sau 60 s", "tick gọi step với dt theo đồng hồ".
- [ ] **Step 3–4:** FAIL → implement → PASS.
- [ ] **Step 5: Mô phỏng 3 level qua `Room`** — chạy lại các bot cũ nhưng qua `Room.setInput` (bot dùng `GameEngine` trực tiếp ở `scratchpad/bot.ts`; nếu không có, viết test nhỏ `room.levels.test.ts` cho 2 người chạy hết Level 1 bằng kịch bản phím từ `scratchpad/l1.ts`). Expected: thắng, 0 lần chết.
- [ ] **Step 6: Commit** `feat(server): authoritative rooms with win/advance/restart rules`

---

### Task 5: Xác thực (ID token Firebase + đọc ô qua RTDB REST)

**Files:**
- Create: `mln-server/src/auth.ts`, `mln-server/src/auth.test.ts`

**Interfaces:**
- Produces:
  - `verifyIdToken(token: string): Promise<{ uid: string }>` — `jose.jwtVerify(token, createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")), { issuer: \`https://securetoken.google.com/${projectId}\`, audience: projectId })`; trả `sub` làm `uid`. JWKS tạo **một lần** (jose tự cache).
  - `lookupMembership(roomId: string, uid: string, idToken: string, fetchFn = fetch): Promise<{ slot: string; name: string; roomName: string; levelId: string } | null>` — gọi song song:
    - `GET ${dbUrl}/rooms/${roomId}/slots.json?auth=${idToken}` → tìm ô có `uid === uid`.
    - `GET ${dbUrl}/roomList/${roomId}.json?auth=${idToken}` → `name`, `level`.
    - `roomId` phải khớp `/^[A-Za-z0-9_-]{1,64}$/`, nếu không → `null` (chặn chèn đường dẫn).
  - Khi `config.authDisabled`: `join` nhận thêm `{ slot, name, levelId }` và bỏ qua 2 hàm trên (chỉ dev/test).

- [ ] **Step 1: Test thất bại** (`fetchFn` giả):
  - "tìm đúng ô của uid", "uid không có ô → null", "roomId có `/` hoặc `..` → null, không gọi fetch", "RTDB trả 401 → null".
  - `verifyIdToken("abc")` → reject (token sai định dạng) — không cần mạng.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(server): verify firebase id token and room membership via RTDB REST`

---

### Task 6: Nối Socket.IO ↔ RoomManager ↔ DB (+ test tích hợp)

**Files:**
- Modify: `mln-server/src/index.ts`
- Create: `mln-server/src/socket.test.ts`

**Interfaces:**
- Consumes: Task 2–5.
- Produces (hành vi theo bảng "Giao thức Socket.IO"):
  - `join`: xác thực → `socket.join(roomId)`; nếu ô đã có socket khác → `old.disconnect(true)`; `room.addPlayer(slot, name)`; lưu `socket.data = { roomId, slot }`; ack `{ ok: true, slot }`.
  - `in` → `room.setInput(slot, payload)`; `restart` → `room.requestRestart(slot)`.
  - `disconnect` → nếu `socket.data` còn trỏ tới socket hiện hành của ô đó → `room.removePlayer(slot)`.
  - `emit` của phòng = `(s) => io.to(roomId).volatile.emit("snap", s)`; `onResult` = `db.insertResult`.
  - `RoomManager.start()` khi server listen; `close()` dừng vòng lặp, đóng DB, đóng io.

- [ ] **Step 1: Test tích hợp thất bại** (`AUTH_DISABLED=1`, `socket.io-client`, cổng ngẫu nhiên):
  - "2 client join cùng phòng → cả hai nhận `snap` có 2 slot trong < 500 ms".
  - "client A gửi `in {r:1}` → trong 500 ms, `p.s0[0]` trong `snap` tăng".
  - "client tải lại (socket mới cùng ô) → socket cũ bị ngắt, phòng vẫn 2 người".
  - "join sai (auth bật, token rác) → ack `{ ok:false, error:'auth' }`, server vẫn sống (`/health` 200)".
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(server): wire socket protocol to rooms and results`

---

### Task 7: Client — `gameSocket` + viết lại `GameCanvas`

**Files:**
- Create: `src/net/gameSocket.ts`, `src/net/gameSocket.test.ts`
- Rewrite: `src/components/GameCanvas.tsx`
- Modify: `package.json` (thêm `socket.io-client`), `.env.example` (`VITE_GAME_SERVER_URL=http://localhost:3500`)

**Interfaces:**
- Consumes: `decodeSnapshot` (Task 1), `SnapshotBuffer` (`src/net/interpolate.ts`, đã có), `drawFrame`, `drawMessage`, `playSound`, `attachInput`, `NetStats`.
- Produces:
  - `connectGame(opts: { url: string; roomId: string; getIdToken: () => Promise<string>; onSnap: (s: Snapshot) => void; onStatus: (s: "connecting" | "playing" | "reconnecting" | "error", detail?: string) => void }): { sendInput(i: InputState): void; restart(): void; close(): void }`
    - Mỗi lần socket `connect` (kể cả nối lại): lấy token mới (`getIdToken()` → `auth.currentUser.getIdToken()`), emit `join`; ack lỗi → `onStatus("error", error)`.
    - `sendInput` tự tăng `q`.
  - `GameCanvas` props giữ nguyên `{ roomId, levelId, slots, mySlot, isCoordinator }`. Hành vi:
    - Không còn engine/vật lý trên client. Mọi người (kể cả mình) vẽ từ `SnapshotBuffer` với độ trễ **50 ms** (`new SnapshotBuffer(50)`) — server ở VN, gói tin đều.
    - Âm thanh/hoạt ảnh Thua/qua màn: lấy nguyên logic client của `git show c9acd44:src/components/GameCanvas.tsx` (nhánh không phải host): `d` 0→1 → `restart.mp3`; `j[mySlot]` tăng → `jump.mp3`; `lose.t` = đồng hồ cục bộ từ lúc thấy `d=1`; người gây ra = `sorted[c]`.
    - Phím R (và nút R cảm ứng) → `restart()` (server tự kiểm tra quyền).
    - Trạng thái kết nối vẽ bằng `drawMessage`: "Đang kết nối máy chủ…", "Đang kết nối lại…", "Không vào được phòng chơi — tải lại trang".
    - `?net=1`: hiện số `snap` nhận/giây và độ trễ ping Socket.IO (`socket.io` có sự kiện `ping`/đo bằng `emit` có ack mỗi 2 s).

- [ ] **Step 1: Test `gameSocket.test.ts`** chạy với server thật từ Task 6 (`createServer` + `AUTH_DISABLED`): "connectGame nhận snap và gọi onStatus('playing')", "sendInput tăng q", "server tắt rồi bật lại → onStatus('reconnecting') rồi 'playing'".
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Thử tay** — terminal 1: `cd mln-server && AUTH_DISABLED=1 npm run dev`; terminal 2: `npm run dev` với `VITE_GAME_SERVER_URL=http://localhost:3500`, 2 cửa sổ vào cùng phòng → cả hai chạy mượt, chết/thắng/qua màn đúng.
- [ ] **Step 6: Commit** `feat(client): play through game server over socket.io`

---

### Task 8: Admin dùng `/api/results` + dọn code "mỗi máy tự lái"

**Files:**
- Modify: `src/pages/Admin.tsx`
- Delete khi không còn import: `src/net/gameState.ts`, `gameState.test.ts`, `gameSync.ts`, `gameSync.test.ts`, `posCodec.ts`, `posCodec.test.ts`, `RemoteTrack` + test của nó trong `src/net/interpolate*.ts`
- Modify: `src/lib/rooms.ts` (bỏ `onDisconnect` cho `pos/{slot}` nếu có)
- Engine: **giữ** chế độ local/remote (vô hại, Sandbox và server dùng chế độ toàn-local). Không xóa để tránh đụng vật lý.

**Interfaces:**
- Consumes: `GET ${VITE_GAME_SERVER_URL}/api/results?limit=200`.
- Produces: Admin hiển thị cho mỗi phòng: `Level 1: 42.3s · Level 2: — · Level 3: —` (lấy bản ghi mới nhất theo `roomId + levelId`) và một bảng "10 lượt hoàn thành gần nhất" (phòng, level, thời gian, người chơi, giờ). Tải lại mỗi 10 s khi trang mở (`setInterval` + `fetch`), không dùng Firebase cho kết quả nữa.

- [ ] **Step 1:** Sửa Admin; xóa file thừa; `grep -rn "gameSync\|posCodec\|gameState\|RemoteTrack" src` → không còn kết quả.
- [ ] **Step 2:** `npm test`, `npx tsc -b`, `npm run build`, `npx eslint src` (chỉ còn lỗi cũ ở `Room.tsx` nếu chưa sửa).
- [ ] **Step 3: Commit** `feat(admin): results from game server; remove peer-sync code`

---

### Task 9: Đo tải 30 người (bắt buộc trước khi mở cho người thật)

**Files:**
- Create: `mln-server/scripts/loadtest.ts`

**Interfaces:**
- `npx tsx scripts/loadtest.ts --url http://127.0.0.1:3601 --rooms 8 --per-room 4 --seconds 60` — mở `rooms × perRoom` client `socket.io-client` (cần server chạy với `AUTH_DISABLED=1`), mỗi client gửi phím ngẫu nhiên 4 lần/s; in mỗi 10 s: `clients`, `snap/s trung bình mỗi client`, `p50/p95 thời gian giữa 2 snap`, và (đọc `/health`) số phòng. In cuối: `OK` nếu mọi client nhận ≥ 20 snap/s khi có chuyển động và p95 khoảng cách snap < 80 ms.

- [ ] **Step 1:** Viết script.
- [ ] **Step 2: Chạy trên chính server VN** (cổng thử 3601, không đụng bản thật):

```bash
cd ~/mln-server
NODE_ENV=development AUTH_DISABLED=1 PORT=3601 DB_PATH=/tmp/loadtest.db node dist/index.mjs &
npx tsx scripts/loadtest.ts --url http://127.0.0.1:3601 --rooms 8 --per-room 4 --seconds 60
# song song ở terminal khác:
pidstat -r -u -p $(pgrep -f "PORT=3601" || pgrep -f dist/index.mjs | head -1) 5
```
Expected: `OK`; CPU tiến trình < 25 % một nhân; RSS < 200 MB. Ghi số đo vào cuối file plan này. Dừng: `kill %1`.
- [ ] **Step 3: Commit** `test(server): 30-player load test script`

---

### Task 10: Triển khai lên server VN (không Docker) — cầm tay chỉ việc

Làm tuần tự trên server (`ssh ubuntu@<server>`). Mỗi bước có lệnh kiểm tra.

- [ ] **10.1 Kiểm tra máy**

```bash
uname -m                      # x86_64 hoặc aarch64 — chỉ để biết
node -v                       # cần >= v22.13; nếu không có/thấp hơn: bước 10.2
ss -ltnp | grep -E ':3500\b' || echo "3500 trống"
free -h                       # ghi lại RAM/swap trước khi chạy
```

- [ ] **10.2 Cài Node 24 (chỉ khi cần)** — NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && node -e "require('node:sqlite'); console.log('sqlite ok')"
```
Expected: `v24.x` và `sqlite ok`. (Cài Node hệ thống không ảnh hưởng các container đang chạy.)

- [ ] **10.3 Lấy code + build**

```bash
cd ~ && git clone <URL repo GitHub của mln-server> mln-server   # lần sau: cd ~/mln-server && git pull
cd ~/mln-server && npm ci && npm run build
mkdir -p ~/mlngame-data
```
Ghi chú: server chỉ cần repo `mln-server` (code game đã copy sẵn trong `src/shared/`). Build với `--packages=external` nên `node_modules` phải có `planck`, `express`, `socket.io`, `jose` (đã khai báo trong `package.json`).

- [ ] **10.4 Biến môi trường** — `~/mln-server/.env`:

```
NODE_ENV=production
PORT=3500
HOST=<xem 10.6>
CORS_ORIGIN=https://mlngame-nu.vercel.app
FIREBASE_PROJECT_ID=mlngame-rope
FIREBASE_DB_URL=https://mlngame-rope-default-rtdb.asia-southeast1.firebasedatabase.app
DB_PATH=/home/ubuntu/mlngame-data/game.db
```

- [ ] **10.5 systemd** — `mln-server/deploy/mlngame.service` (commit vào repo), cài:

```ini
[Unit]
Description=mlngame realtime game server
After=network-online.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/mln-server
EnvironmentFile=/home/ubuntu/mln-server/.env
ExecStart=/usr/bin/node dist/index.mjs
Restart=always
RestartSec=2
MemoryMax=300M
Nice=-5

[Install]
WantedBy=multi-user.target
```
```bash
sudo cp ~/mln-server/deploy/mlngame.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now mlngame
systemctl status mlngame --no-pager        # active (running)
journalctl -u mlngame -n 20 --no-pager     # thấy "listening on ..."
curl -s http://$HOST:3500/health           # {"ok":true,"rooms":0,"players":0}
```
(`Nice=-5` cho game ưu tiên CPU hơn các dịch vụ nền một chút, giảm khựng khi máy bận.)

- [ ] **10.6 Mở ra internet qua Cloudflare Tunnel** (đang có `cloudflared` cho thienphu/10tech/tuvi/aptis)

Chọn **một** tunnel thuộc domain bạn muốn dùng (vd `game.<domain>`), xem nó chạy mạng gì:
```bash
docker inspect -f '{{.HostConfig.NetworkMode}}' thienphu-cloudflared   # thay bằng tunnel bạn chọn
ip -4 addr show docker0 | grep inet                                      # thường 172.17.0.1
```
| NetworkMode | `HOST` trong `.env` | Service URL khai báo ở Cloudflare |
|-------------|---------------------|-----------------------------------|
| `host` | `127.0.0.1` | `http://localhost:3500` |
| khác (bridge/tên network) | IP `docker0` (vd `172.17.0.1`) | `http://172.17.0.1:3500` |

Nếu NetworkMode là một network tự đặt tên (không phải `bridge`): lấy gateway của network đó bằng `docker network inspect <tên> -f '{{(index .IPAM.Config 0).Gateway}}'` và dùng IP đó cho cả `HOST` lẫn Service URL.

Sửa `HOST`, `sudo systemctl restart mlngame`. Rồi trên Cloudflare: **Zero Trust → Networks → Tunnels → (tunnel đã chọn) → Public Hostname → Add**: Subdomain `game`, Domain `<domain>`, Type `HTTP`, URL như bảng trên. (WebSocket được Cloudflare hỗ trợ sẵn.)

Kiểm tra từ máy bạn:
```bash
curl -s https://game.<domain>/health
```
Expected: `{"ok":true,...}`. Cổng 3500 **không** được mở ra IP public (kiểm tra: `curl --max-time 3 http://<IP public>:3500/health` phải thất bại).

- [ ] **10.7 Web (Vercel)**: Settings → Environment Variables → thêm `VITE_GAME_SERVER_URL=https://game.<domain>` (Production) → Redeploy.

- [ ] **10.8 Kiểm thử thật (3 máy/điện thoại, `?net=1`)**
  - [ ] Cả 3 bấm phím: phản hồi ngay, không giật; số `snap` nhận ~30/s khi chạy.
  - [ ] Chạm gai: mọi máy THUA + `restart.mp3`, 1 s sau về chỗ cũ.
  - [ ] Thắng: 3 s sau sang level kế; admin thấy thời gian (bảng tải lại mỗi 10 s).
  - [ ] Tải lại trang giữa ván: vào lại đúng ô, không ô "ma".
  - [ ] Tắt Wi-Fi 5 s rồi bật: "Đang kết nối lại…" rồi chơi tiếp.
  - [ ] Ẩn tab một người: người khác **không** bị ảnh hưởng.
  - [ ] Sau 30 phút chơi: `systemctl status mlngame` → bộ nhớ không tăng liên tục (so với lúc đầu).

- [ ] **10.9 Cập nhật về sau**

```bash
cd ~/mln-server && git pull && npm ci && npm run build && sudo systemctl restart mlngame
```

- [ ] **10.10 Sao lưu DB** (tùy chọn) — thêm vào crontab hiện có: `0 3 * * * sqlite3 /home/ubuntu/mlngame-data/game.db ".backup /home/ubuntu/backup/mlngame-$(date +\%F).db"` (cần `sudo apt-get install -y sqlite3`).

### Hoàn tác (rollback)

- Web (`mlngame`): Vercel → Deployments → chọn bản trước → "Promote to Production" (bản cũ dùng mô hình Firebase, vẫn chạy được vì rules không đổi).
- Server: `sudo systemctl disable --now mlngame` — không ảnh hưởng dịch vụ khác.

## Số liệu đo

| Lần đo | Phòng × người | CPU tiến trình | RSS | snap/s mỗi client | p95 khoảng cách snap | Ghi chú |
|--------|---------------|----------------|-----|-------------------|----------------------|---------|
| Task 9 (loadtest trên server) | 8 × 4 | | | | | |
| Task 10.8 (người thật) | | | | | | |
