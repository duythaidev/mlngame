# 01 · Game server: kênh admin, lượt thi, xếp hạng (repo `mln-server`)

- Bỏ phím R của "chủ phòng" (`restart`). Từ giờ **chỉ admin** điều khiển lượt thi.
- `Room` có **lượt thi**: admin bấm Bắt đầu → về Level 1, đếm thời gian từng level, số lần thua. Thắng level cuối thì đứng ở màn kết tới khi admin mở lượt mới.
- Kênh admin trên Socket.IO (cùng cổng, cùng tunnel):

| Sự kiện | Hướng | Dữ liệu |
|---|---|---|
| `admin:hello` | admin → server | `{ idToken }` + ack `{ ok:true }` hoặc `{ ok:false, error: "bad-request"\|"auth"\|"forbidden"\|"server" }`. Server kiểm token Firebase rồi đọc `admins/{uid}` = `true` |
| `admin:cmd` | admin → server | `{ action: "start"\|"goto"\|"remove", rooms: [{id, name}], levelId? }` + ack. Phòng chưa có ai vẫn được tạo sẵn |
| `admin:focus` | admin → server | `roomId` hoặc `null` — phòng đang xem to |
| `rooms` | server → admin | **1 lần/giây**: mảng tóm tắt mọi phòng đã xếp hạng (level, phần, thời gian, số lần thua, người chơi, 1 ảnh chụp trạng thái để vẽ ô thu nhỏ) |
| `focus` | server → admin | **5 lần/giây**, chỉ phòng đang xem to: `{ id, snap }` |

Xếp hạng (`src/ranking.ts`): nhiều level xong hơn → đang ở phần xa hơn → tổng thời gian ít hơn; bằng nhau tuyệt đối thì cùng hạng; phòng chưa bắt đầu đứng cuối (hạng 0).

## Bước 1 — Kiểm quyền admin

**Thay toàn bộ** `src/auth.ts`:

````ts
// src/auth.ts
// Xác thực người chơi bằng ID token của Firebase Auth (người dùng ẩn danh cũng có token).
// Không cần file khóa service account: chỉ cần khóa công khai của Google để kiểm tra chữ ký.
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const GOOGLE_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const REMOTE_KEYS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL)); // jose tự cache khóa

/** Chỉ cho phép id phòng kiểu key của Firebase push (chặn chèn đường dẫn "../", "?" …). */
export const ROOM_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export type VerifyFn = (idToken: string) => Promise<{ uid: string }>;

export function createVerifier(projectId: string, keys: JWTVerifyGetKey = REMOTE_KEYS): VerifyFn {
  return async (idToken) => {
    const { payload } = await jwtVerify(idToken, keys, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });
    if (!payload.sub) throw new Error("token không có sub");
    return { uid: payload.sub };
  };
}

export interface Membership {
  slot: string;
  name: string;
  roomName: string;
  levelId: string;
}

export type LookupFn = (roomId: string, uid: string, idToken: string) => Promise<Membership | null>;

/** Đọc ô của người chơi trong phòng từ Realtime Database (REST) bằng chính token của họ → áp dụng đúng Security Rules. */
export function createLookup(dbUrl: string, fetchFn: typeof fetch = fetch): LookupFn {
  const base = dbUrl.replace(/\/$/, "");
  return async (roomId, uid, idToken) => {
    if (!ROOM_ID_RE.test(roomId)) return null;
    const q = `?auth=${encodeURIComponent(idToken)}`;
    const [slotsRes, metaRes] = await Promise.all([
      fetchFn(`${base}/rooms/${roomId}/slots.json${q}`),
      fetchFn(`${base}/roomList/${roomId}.json${q}`),
    ]);
    if (!slotsRes.ok || !metaRes.ok) return null;

    const slots = (await slotsRes.json()) as Record<string, { uid?: string; name?: string }> | null;
    const meta = (await metaRes.json()) as { name?: string; level?: string } | null;
    if (!slots || !meta) return null;

    for (const [slot, v] of Object.entries(slots)) {
      if (v?.uid === uid) {
        return {
          slot,
          name: String(v.name ?? slot).slice(0, 20),
          roomName: String(meta.name ?? roomId),
          levelId: String(meta.level ?? "1"),
        };
      }
    }
    return null;
  };
}

export type AdminCheckFn = (uid: string, idToken: string) => Promise<boolean>;

/** Người dùng có phải admin không: đọc admins/{uid} trong Realtime Database bằng chính token của họ (= true mới là admin). */
export function createAdminCheck(dbUrl: string, fetchFn: typeof fetch = fetch): AdminCheckFn {
  const base = dbUrl.replace(/\/$/, "");
  return async (uid, idToken) => {
    if (!ROOM_ID_RE.test(uid)) return false; // uid Firebase cũng chỉ gồm chữ, số, _ và -
    const res = await fetchFn(`${base}/admins/${uid}.json?auth=${encodeURIComponent(idToken)}`);
    if (!res.ok) return false;
    return (await res.json()) === true;
  };
}
````

**Thay toàn bộ** `src/auth.test.ts`:

````ts
// src/auth.test.ts
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createAdminCheck, createLookup, createVerifier } from "./auth";

const PROJECT = "demo-project";

describe("createVerifier", () => {
  let sign: (claims: { aud?: string; iss?: string; sub?: string; exp?: string }) => Promise<string>;
  let verify: ReturnType<typeof createVerifier>;

  beforeAll(async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" };
    verify = createVerifier(PROJECT, createLocalJWKSet({ keys: [jwk] }));
    sign = (c) =>
      new SignJWT({})
        .setProtectedHeader({ alg: "RS256", kid: "k1" })
        .setIssuer(c.iss ?? `https://securetoken.google.com/${PROJECT}`)
        .setAudience(c.aud ?? PROJECT)
        .setSubject(c.sub ?? "uid-123")
        .setIssuedAt()
        .setExpirationTime(c.exp ?? "1h")
        .sign(privateKey);
  });

  it("token đúng → trả uid", async () => {
    expect(await verify(await sign({}))).toEqual({ uid: "uid-123" });
  });
  it("sai project (audience) → từ chối", async () => {
    await expect(verify(await sign({ aud: "project-khac" }))).rejects.toThrow();
  });
  it("sai issuer → từ chối", async () => {
    await expect(verify(await sign({ iss: "https://evil.example" }))).rejects.toThrow();
  });
  it("token hết hạn → từ chối", async () => {
    await expect(verify(await sign({ exp: "-1m" }))).rejects.toThrow();
  });
  it("chuỗi rác → từ chối, không ném lỗi lạ", async () => {
    await expect(verify("abc")).rejects.toThrow();
  });
});

describe("createLookup", () => {
  const slots = { s0: { uid: "u0", name: "Bo" }, s1: { uid: "u1", name: "Cam" } };
  const meta = { name: "Phòng 1", level: "2", phase: "playing" };

  function fakeFetch(opts: { slots?: unknown; meta?: unknown; status?: number } = {}): typeof fetch {
    return vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      const status = opts.status ?? 200;
      const body = u.includes("/slots.json") ? ("slots" in opts ? opts.slots : slots) : ("meta" in opts ? opts.meta : meta);
      return { ok: status === 200, status, json: async () => body } as Response;
    }) as unknown as typeof fetch;
  }

  it("tìm đúng ô của uid", async () => {
    const lookup = createLookup("https://db.example.com", fakeFetch());
    expect(await lookup("room1", "u1", "tok")).toEqual({ slot: "s1", name: "Cam", roomName: "Phòng 1", levelId: "2" });
  });
  it("uid không có ô → null", async () => {
    const lookup = createLookup("https://db.example.com", fakeFetch());
    expect(await lookup("room1", "ai-do", "tok")).toBeNull();
  });
  it("roomId độc hại → null và không gọi mạng", async () => {
    const f = fakeFetch();
    const lookup = createLookup("https://db.example.com", f);
    expect(await lookup("../admins", "u0", "tok")).toBeNull();
    expect(await lookup("a/b", "u0", "tok")).toBeNull();
    expect(await lookup("a?x=1", "u0", "tok")).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
  it("RTDB trả 401 → null", async () => {
    const lookup = createLookup("https://db.example.com", fakeFetch({ status: 401 }));
    expect(await lookup("room1", "u0", "tok")).toBeNull();
  });
  it("phòng không có dữ liệu → null", async () => {
    const lookup = createLookup("https://db.example.com", fakeFetch({ slots: null }));
    expect(await lookup("room1", "u0", "tok")).toBeNull();
  });
});

describe("createAdminCheck", () => {
  const fetchBody = (body: unknown, status = 200) =>
    vi.fn(async () => ({ ok: status === 200, status, json: async () => body }) as Response) as unknown as typeof fetch;

  it("admins/{uid} = true → admin", async () => {
    const f = fetchBody(true);
    expect(await createAdminCheck("https://db.example.com/", f)("u0", "tok")).toBe(true);
    expect(f).toHaveBeenCalledWith("https://db.example.com/admins/u0.json?auth=tok");
  });
  it("không có bản ghi / khác true / lỗi quyền → không phải admin", async () => {
    expect(await createAdminCheck("https://db.example.com", fetchBody(null))("u0", "tok")).toBe(false);
    expect(await createAdminCheck("https://db.example.com", fetchBody("true"))("u0", "tok")).toBe(false);
    expect(await createAdminCheck("https://db.example.com", fetchBody(true, 401))("u0", "tok")).toBe(false);
  });
  it("uid lạ → false, không gọi mạng", async () => {
    const f = fetchBody(true);
    expect(await createAdminCheck("https://db.example.com", f)("../x", "tok")).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
````

## Bước 2 — Lượt thi + xếp hạng

**Tạo mới** `src/ranking.ts`:

````ts
// src/ranking.ts
// Tóm tắt tiến độ một phòng (gửi cho admin 1 lần/giây) và xếp hạng các phòng.
// Xếp hạng: nhiều level xong hơn → đang ở phần xa hơn → tổng thời gian ít hơn.

export interface LevelDone {
  levelId: string;
  seconds: number;
}

export interface RoomSummary {
  id: string;
  name: string;
  players: string[];
  levelId: string; // level đang chơi
  part: number; // phần đang ở (0-based)
  partCount: number;
  levelSeconds: number; // thời gian đã chơi ở level hiện tại
  completed: LevelDone[]; // level đã xong trong lượt này (theo thứ tự)
  totalSeconds: number; // tổng thời gian các level đã xong + level đang chơi (nếu chưa xong)
  deaths: number; // số lần thua trong lượt này
  won: boolean; // đang ở màn "hoàn thành" của level hiện tại
  finished: boolean; // đã xong level cuối
  startedAt: number | null; // Date.now() lúc admin bắt đầu lượt; null = chưa bắt đầu
  snap: string; // snapshot (codec) lúc tóm tắt — admin vẽ ảnh thu nhỏ
}

export interface Ranked extends RoomSummary {
  rank: number; // 1 = dẫn đầu; phòng chưa bắt đầu = 0 (không xếp)
}

/** So sánh tiến độ: âm = a xếp trên b. */
export function compareProgress(a: RoomSummary, b: RoomSummary): number {
  return b.completed.length - a.completed.length || b.part - a.part || a.totalSeconds - b.totalSeconds;
}

/** Phòng đã bắt đầu được xếp hạng (bằng nhau tuyệt đối thì cùng hạng); phòng chưa bắt đầu đứng cuối, rank 0. */
export function rankRooms(rooms: RoomSummary[]): Ranked[] {
  const started = rooms.filter((r) => r.startedAt !== null).sort(compareProgress);
  const idle = rooms.filter((r) => r.startedAt === null).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const out: Ranked[] = [];
  started.forEach((r, i) => {
    const prev = out[i - 1];
    out.push({ ...r, rank: prev && compareProgress(prev, r) === 0 ? prev.rank : i + 1 });
  });
  return [...out, ...idle.map((r) => ({ ...r, rank: 0 }))];
}
````

**Tạo mới** `src/ranking.test.ts`:

````ts
// src/ranking.test.ts
import { expect, it } from "vitest";
import { rankRooms, type RoomSummary } from "./ranking";

function room(id: string, o: Partial<RoomSummary>): RoomSummary {
  return {
    id,
    name: id,
    players: [],
    levelId: "1",
    part: 0,
    partCount: 5,
    levelSeconds: 0,
    completed: [],
    totalSeconds: 0,
    deaths: 0,
    won: false,
    finished: false,
    startedAt: 1,
    snap: "",
    ...o,
  };
}
const done = (n: number) => Array.from({ length: n }, (_, i) => ({ levelId: String(i + 1), seconds: 60 }));

it("nhiều level xong hơn → phần xa hơn → thời gian ít hơn; chưa bắt đầu đứng cuối", () => {
  const ranked = rankRooms([
    room("chua", { startedAt: null }),
    room("a", { completed: done(1), part: 1, totalSeconds: 100 }),
    room("b", { completed: done(2), part: 0, totalSeconds: 300 }),
    room("c", { completed: done(1), part: 3, totalSeconds: 200 }),
    room("d", { completed: done(1), part: 3, totalSeconds: 150 }),
  ]);
  expect(ranked.map((r) => [r.id, r.rank])).toEqual([
    ["b", 1],
    ["d", 2],
    ["c", 3],
    ["a", 4],
    ["chua", 0],
  ]);
});

it("bằng nhau tuyệt đối → cùng hạng", () => {
  const ranked = rankRooms([room("x", { totalSeconds: 10 }), room("y", { totalSeconds: 10 }), room("z", { totalSeconds: 20 })]);
  expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
});
````

**Thay toàn bộ** `src/room.ts`:

````ts
// src/room.ts
// Một phòng chơi: giữ GameEngine (toàn-local), danh sách người chơi, luật thắng / qua màn,
// lượt thi do admin bắt đầu (đếm thời gian từng level + số lần thua), và gửi snapshot cho mọi người trong phòng.
// Không biết gì về mạng → test được bằng đồng hồ giả.
import type { ResultRow } from "./db";
import type { LevelDone, RoomSummary } from "./ranking";
import { GameEngine } from "./shared/game/engine";
import { getLevel, LEVEL_IDS, nextLevelId, partAt } from "./shared/game/level";
import { PHYS } from "./shared/lib/constants";
import { changeKey, encodeSnapshot } from "./shared/net/codec";
import { StateSender } from "./shared/net/stateSender";

const MAX_INPUTS_PER_SEC = 60;

export interface RoomOptions {
  id: string;
  name: string;
  levelId: string;
  /** Gửi một chuỗi snapshot cho mọi người trong phòng. */
  emit: (snap: string) => void;
  onResult: (r: ResultRow) => void;
  /** Đồng hồ đơn điệu (ms) — mặc định performance.now(). Test truyền đồng hồ giả. */
  now?: () => number;
  /** Đồng hồ treo tường (ms) — mặc định Date.now(). Chỉ dùng cho created_at của kết quả. */
  wall?: () => number;
}

export class Room {
  readonly id: string;
  readonly name: string;
  /** null = đang có người; số = thời điểm (now) phòng trở nên trống. */
  emptySince: number | null;
  /** Số input đã được nhận (sau khi lọc tốc độ) — dùng cho test. */
  inputsAccepted = 0;

  private levelId: string;
  private players = new Map<string, string>(); // slot -> tên
  private engine: GameEngine;
  private sender: StateSender;
  private levelStartTick = 0;
  private wonBefore = false;
  private winSince: number | null = null;
  private loseBefore = false;
  private deaths = 0;
  private completed: LevelDone[] = [];
  private startedAt: number | null = null;
  private rate = new Map<string, { windowStart: number; count: number }>();
  private now: () => number;
  private wall: () => number;
  private onResult: (r: ResultRow) => void;

  constructor(opts: RoomOptions) {
    this.id = opts.id;
    this.name = opts.name;
    this.levelId = opts.levelId;
    this.now = opts.now ?? (() => performance.now());
    this.wall = opts.wall ?? (() => Date.now());
    this.onResult = opts.onResult;
    this.emptySince = this.now();
    this.engine = this.makeEngine();
    this.sender = new StateSender(
      async (payload) => {
        opts.emit(payload);
      },
      { minIntervalMs: 33, heartbeatMs: 1000, maxInFlight: 1 },
    );
  }

  get playerCount(): number {
    return this.players.size;
  }

  get currentLevelId(): string {
    return this.engine.levelId;
  }

  slots(): string[] {
    return [...this.players.keys()].sort();
  }

  addPlayer(slot: string, name: string): void {
    if (this.players.has(slot)) {
      this.players.set(slot, name); // tải lại trang: chỉ cập nhật tên, không dựng lại engine
      return;
    }
    this.players.set(slot, name);
    this.emptySince = null;
    this.rebuild();
  }

  removePlayer(slot: string): void {
    if (!this.players.delete(slot)) return;
    this.rate.delete(slot);
    if (this.players.size === 0) this.emptySince = this.now();
    this.rebuild();
  }

  /** Nhận input thô từ mạng: chuẩn hóa về 0/1, bỏ quá 60 lần/giây. */
  setInput(slot: string, raw: unknown): void {
    if (!this.players.has(slot) || typeof raw !== "object" || raw === null) return;

    const t = this.now();
    const r = this.rate.get(slot);
    if (!r || t - r.windowStart >= 1000) {
      this.rate.set(slot, { windowStart: t, count: 1 });
    } else if (r.count >= MAX_INPUTS_PER_SEC) {
      return;
    } else {
      r.count++;
    }

    const o = raw as Record<string, unknown>;
    const seq = typeof o.q === "number" && Number.isInteger(o.q) && o.q >= 0 ? o.q : undefined;
    this.engine.setInput(slot, { l: o.l === 1 ? 1 : 0, r: o.r === 1 ? 1 : 0, j: o.j === 1 ? 1 : 0 }, seq);
    this.inputsAccepted++;
  }

  /** Admin bắt đầu lượt mới: về `levelId` (mặc định Level 1), xóa thời gian và số lần thua của lượt trước. */
  start(levelId: string = LEVEL_IDS[0]): void {
    this.setLevel(levelId);
    this.completed = [];
    this.deaths = 0;
    this.startedAt = this.wall();
  }

  /** Admin cho nhảy tới level khác giữa lượt (giữ kết quả đã có). */
  goto(levelId: string): void {
    this.setLevel(levelId);
  }

  get hasRun(): boolean {
    return this.startedAt !== null;
  }

  /** Tóm tắt cho admin (tiến độ, thời gian, số lần thua, ảnh chụp trạng thái). */
  summary(): RoomSummary {
    const level = getLevel(this.engine.levelId);
    const done = this.completed.reduce((a, c) => a + c.seconds, 0);
    const levelSeconds = this.levelSeconds();
    const won = this.engine.won;
    return {
      id: this.id,
      name: this.name,
      players: this.slots().map((s) => this.players.get(s) ?? s),
      levelId: this.engine.levelId,
      part: partAt(level, this.engine.checkpoint),
      partCount: level.partCount,
      levelSeconds,
      completed: [...this.completed],
      totalSeconds: Math.round((done + (won ? 0 : levelSeconds)) * 10) / 10,
      deaths: this.deaths,
      won,
      finished: this.completed.some((c) => c.levelId === LEVEL_IDS[LEVEL_IDS.length - 1]),
      startedAt: this.startedAt,
      snap: this.snapshotString(),
    };
  }

  /** Chuỗi snapshot hiện tại — gửi ngay cho người vừa vào để họ không phải chờ nhịp nhắc lại. */
  snapshotString(): string {
    return encodeSnapshot(this.engine.snapshot());
  }

  /** Gọi mỗi nhịp của vòng lặp chung (dt tính bằng giây). */
  step(dt: number): void {
    this.engine.update(dt);
    const now = this.now();

    const losing = this.engine.lose !== null;
    if (losing && !this.loseBefore && this.startedAt !== null) this.deaths++;
    this.loseBefore = losing;

    if (this.engine.won && !this.wonBefore) {
      const seconds = this.levelSeconds();
      if (this.startedAt !== null) this.completed.push({ levelId: this.engine.levelId, seconds });
      this.onResult({
        roomId: this.id,
        roomName: this.name,
        levelId: this.engine.levelId,
        seconds,
        players: this.slots().map((s) => this.players.get(s) ?? s),
        createdAt: this.wall(),
      });
    }
    this.wonBefore = this.engine.won;

    if (this.engine.won) {
      this.winSince ??= now;
      const next = nextLevelId(this.engine.levelId);
      if (next && now - this.winSince >= PHYS.winDelay * 1000) this.setLevel(next); // level cuối: đứng ở màn kết tới khi admin cho chơi lại
    } else {
      this.winSince = null;
    }

    const snap = this.engine.snapshot();
    this.sender.offer(encodeSnapshot(snap), changeKey(snap), now);
  }

  private levelSeconds(): number {
    return Math.round(((this.engine.tick - this.levelStartTick) / 60) * 10) / 10;
  }

  private setLevel(levelId: string): void {
    this.engine.setLevel(getLevel(levelId));
    this.levelId = this.engine.levelId;
    this.levelStartTick = this.engine.tick;
    this.wonBefore = false;
    this.winSince = null;
    this.loseBefore = false;
  }

  private makeEngine(): GameEngine {
    return new GameEngine(getLevel(this.levelId), this.slots());
  }

  /** Danh sách người đổi → dựng lại engine cùng level (hành vi cũ: level reset). */
  private rebuild(): void {
    this.engine = this.makeEngine();
    this.levelStartTick = 0;
    this.wonBefore = false;
    this.winSince = null;
  }
}
````

**Thay toàn bộ** `src/room.test.ts`:

````ts
// src/room.test.ts
import { describe, expect, it } from "vitest";
import type { ResultRow } from "./db";
import { Room } from "./room";
import { decodeSnapshot } from "./shared/net/codec";

function setup(levelId = "1") {
  let t = 0;
  const emitted: string[] = [];
  const results: ResultRow[] = [];
  const room = new Room({
    id: "R1",
    name: "Phòng 1",
    levelId,
    emit: (s) => emitted.push(s),
    onResult: (r) => results.push(r),
    now: () => t,
    wall: () => 1_700_000_000_000,
  });
  /** Chạy `seconds` giây mô phỏng (bước 1/60) với đồng hồ giả. */
  const run = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      t += 1000 / 60;
      room.step(1 / 60);
    }
  };
  // truy cập engine riêng tư để ép trạng thái trong test
  const engine = () => (room as unknown as { engine: { won: boolean; hasKey: boolean; levelId: string; tick: number } }).engine;
  return { room, emitted, results, run, engine, setT: (v: number) => (t = v) };
}

describe("Room", () => {
  it("thêm 2 người → snapshot có 2 slot và đúng level", () => {
    const { room } = setup("2");
    room.addPlayer("s0", "Bo");
    room.addPlayer("s1", "Cam");
    const snap = decodeSnapshot(room.snapshotString());
    expect(snap).not.toBeNull();
    expect(Object.keys(snap!.p).sort()).toEqual(["s0", "s1"]);
    expect(snap!.lv).toBe("2");
  });

  it("addPlayer lại cùng ô không dựng lại engine", () => {
    const { room, run } = setup();
    room.addPlayer("s0", "Bo");
    run(1);
    const before = decodeSnapshot(room.snapshotString())!.t;
    room.addPlayer("s0", "Bo mới");
    expect(decodeSnapshot(room.snapshotString())!.t).toBe(before);
  });

  it("người mới vào giữa ván → dựng lại engine (tick về 0)", () => {
    const { room, run } = setup();
    room.addPlayer("s0", "Bo");
    run(1);
    room.addPlayer("s1", "Cam");
    expect(decodeSnapshot(room.snapshotString())!.t).toBe(0);
  });

  it("input rác được chuẩn hóa và không ném lỗi", () => {
    const { room, run } = setup();
    room.addPlayer("s0", "Bo");
    expect(() => {
      room.setInput("s0", { l: 5, r: "x", j: null, q: -3 });
      room.setInput("s0", null);
      room.setInput("s0", "chuỗi");
      room.setInput("s9", { l: 1 }); // ô không tồn tại
      run(0.2);
    }).not.toThrow();
  });

  it("quá 60 input/giây bị bỏ", () => {
    const { room } = setup();
    room.addPlayer("s0", "Bo");
    for (let i = 0; i < 100; i++) room.setInput("s0", { l: 0, r: 1, j: 0, q: i });
    expect(room.inputsAccepted).toBe(60);
  });

  it("input phải làm nhân vật chạy", () => {
    const { room, run } = setup();
    room.addPlayer("s0", "Bo");
    run(0.5);
    const x0 = decodeSnapshot(room.snapshotString())!.p.s0[0];
    room.setInput("s0", { l: 0, r: 1, j: 0, q: 1 });
    run(0.5);
    expect(decodeSnapshot(room.snapshotString())!.p.s0[0]).toBeGreaterThan(x0 + 100); // > 1 ô
  });

  it("thắng → ghi kết quả đúng 1 lần, 3 s sau sang level kế", () => {
    const { room, results, run, engine } = setup("1");
    room.addPlayer("s0", "Bo");
    room.addPlayer("s1", "Cam");
    run(2);
    engine().hasKey = true;
    engine().won = true;
    run(0.1);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ roomId: "R1", roomName: "Phòng 1", levelId: "1", players: ["Bo", "Cam"] });
    expect(results[0].seconds).toBeGreaterThan(1.9);
    expect(results[0].seconds).toBeLessThan(2.4);
    expect(results[0].createdAt).toBe(1_700_000_000_000);

    run(2); // chưa đủ 3 s
    expect(room.currentLevelId).toBe("1");
    run(1.2);
    expect(room.currentLevelId).toBe("2");
    expect(results).toHaveLength(1); // sang level kế không ghi thêm
    expect(decodeSnapshot(room.snapshotString())!.lv).toBe("2");
  });

  it("chưa bắt đầu lượt: không tính thời gian / số lần thua vào tóm tắt", () => {
    const { room, run, engine } = setup("1");
    room.addPlayer("s0", "Bo");
    run(1);
    engine().won = true;
    run(0.1);
    const s = room.summary();
    expect(s.startedAt).toBeNull();
    expect(s.completed).toEqual([]);
    expect(room.hasRun).toBe(false);
  });

  it("admin bắt đầu lượt → tính thời gian từng level, tổng thời gian, phần đang ở", () => {
    const { room, run, engine } = setup("3");
    room.addPlayer("s0", "Bo");
    room.addPlayer("s1", "Cam");
    run(1);
    room.start(); // về Level 1, lượt mới
    expect(room.currentLevelId).toBe("1");
    run(2);
    let s = room.summary();
    expect(s.startedAt).toBe(1_700_000_000_000);
    expect(s).toMatchObject({ levelId: "1", part: 0, partCount: 5, completed: [], deaths: 0, won: false, finished: false });
    expect(s.levelSeconds).toBeCloseTo(2, 0);
    expect(s.players).toEqual(["Bo", "Cam"]);

    engine().won = true;
    run(0.1);
    s = room.summary();
    expect(s.completed).toHaveLength(1);
    expect(s.completed[0].levelId).toBe("1");
    expect(s.totalSeconds).toBe(s.completed[0].seconds); // đang ở màn hoàn thành: không cộng thêm
    run(3.2);
    s = room.summary();
    expect(s.levelId).toBe("2");
    expect(s.totalSeconds).toBeGreaterThan(s.completed[0].seconds);
  });

  it("đếm số lần thua trong lượt", () => {
    const { room, run } = setup("1");
    room.addPlayer("s0", "Bo");
    room.start();
    run(0.5);
    const eng = (room as unknown as { engine: { lose: { t: number; culprit: string } | null } }).engine;
    eng.lose = { t: 0, culprit: "s0" };
    run(0.1);
    eng.lose = { t: 0, culprit: "s0" }; // vẫn đang thua → không đếm thêm
    run(0.1);
    expect(room.summary().deaths).toBe(1);
    run(2); // hồi sinh xong
    eng.lose = { t: 0, culprit: "s0" };
    run(0.1);
    expect(room.summary().deaths).toBe(2);
    room.start();
    expect(room.summary().deaths).toBe(0);
  });

  it("level cuối thắng → đứng yên ở màn kết (không tự quay về), finished = true", () => {
    const { room, run, engine } = setup("1");
    room.addPlayer("s0", "Bo");
    room.start("5");
    run(0.5);
    engine().won = true;
    run(5);
    expect(room.currentLevelId).toBe("5");
    expect(room.summary().finished).toBe(true);
    room.start();
    expect(room.currentLevelId).toBe("1");
    expect(room.summary().finished).toBe(false);
  });

  it("goto: nhảy level giữa lượt, giữ kết quả đã có", () => {
    const { room, run, engine } = setup("1");
    room.addPlayer("s0", "Bo");
    room.start();
    run(0.5);
    engine().won = true;
    run(0.1);
    room.goto("4");
    expect(room.currentLevelId).toBe("4");
    expect(room.summary().completed).toHaveLength(1);
  });

  it("đứng yên 2 s → chỉ gửi vài snapshot (không gửi 60/s)", () => {
    const { room, emitted, run } = setup();
    room.addPlayer("s0", "Bo");
    run(2);
    expect(emitted.length).toBeGreaterThanOrEqual(1);
    expect(emitted.length).toBeLessThanOrEqual(4);
  });

  it("phòng trống ghi nhận emptySince", () => {
    const { room, setT } = setup();
    expect(room.emptySince).not.toBeNull();
    room.addPlayer("s0", "Bo");
    expect(room.emptySince).toBeNull();
    setT(5000);
    room.removePlayer("s0");
    expect(room.emptySince).toBe(5000);
  });
});
````

**Thay toàn bộ** `src/roomManager.ts`:

````ts
// src/roomManager.ts
// Quản lý mọi phòng + MỘT vòng lặp 60 Hz chung (rẻ hơn mỗi phòng một timer).
import type { ResultRow } from "./db";
import { Room } from "./room";

export interface RoomManagerOptions {
  /** Trả về hàm gửi snapshot cho riêng phòng đó. */
  createRoomEmit: (roomId: string) => (snap: string) => void;
  onResult: (r: ResultRow) => void;
  now?: () => number;
  wall?: () => number;
  /** Sau bao lâu phòng trống thì hủy (ms). Mặc định 60 000. */
  emptyTtlMs?: number;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private last: number;
  private opts: RoomManagerOptions;
  private now: () => number;
  private ttl: number;

  constructor(opts: RoomManagerOptions) {
    this.opts = opts;
    this.now = opts.now ?? (() => performance.now());
    this.ttl = opts.emptyTtlMs ?? 60_000;
    this.last = this.now();
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  get(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  list(): Room[] {
    return [...this.rooms.values()];
  }

  /** Admin xóa phòng. */
  remove(id: string): void {
    this.rooms.delete(id);
  }

  getOrCreate(id: string, name: string, levelId: string): Room {
    let room = this.rooms.get(id);
    if (!room) {
      room = new Room({
        id,
        name,
        levelId,
        emit: this.opts.createRoomEmit(id),
        onResult: this.opts.onResult,
        now: this.now,
        wall: this.opts.wall,
      });
      this.rooms.set(id, room);
    }
    return room;
  }

  /** Một nhịp: cho mọi phòng chạy dt thực tế, rồi hủy phòng trống quá lâu (trừ phòng đã có lượt thi — giữ để xếp hạng). */
  tick(): void {
    const t = this.now();
    const dt = (t - this.last) / 1000;
    this.last = t;
    for (const [id, room] of this.rooms) {
      room.step(dt);
      if (room.emptySince !== null && !room.hasRun && t - room.emptySince >= this.ttl) this.rooms.delete(id);
    }
  }

  start(): void {
    if (this.timer) return;
    this.last = this.now();
    this.timer = setInterval(() => this.tick(), 1000 / 60);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
````

## Bước 3 — Kênh admin

**Thay toàn bộ** `src/index.ts`:

````ts
// src/index.ts
// Nối Express (/health, /api/results) + Socket.IO (người chơi: join / in / snap · admin: admin:hello / admin:cmd / admin:focus)
// với RoomManager và SQLite.
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import express from "express";
import { Server, type Socket } from "socket.io";
import { createAdminCheck, createLookup, createVerifier, ROOM_ID_RE, type AdminCheckFn, type LookupFn, type Membership, type VerifyFn } from "./auth";
import { loadConfig, type Config } from "./config";
import { openDb, type GameDb } from "./db";
import { rankRooms } from "./ranking";
import { RoomManager } from "./roomManager";
import { LEVEL_IDS } from "./shared/game/level";

export interface ServerDeps {
  config: Config;
  db: GameDb;
  verify: VerifyFn;
  lookup: LookupFn;
  adminCheck: AdminCheckFn;
  /** false = không tự chạy vòng lặp 60 Hz (test tự gọi manager.tick()). Mặc định true. */
  startLoop: boolean;
}

export type JoinResult = { ok: true; slot: string } | { ok: false; error: "bad-request" | "auth" | "not-in-room" | "server" };

interface JoinPayload {
  roomId: string;
  idToken: string;
  // chỉ dùng khi AUTH_DISABLED=1 (dev/test)
  slot?: string;
  name?: string;
  levelId?: string;
}

interface SocketData {
  roomId?: string;
  slot?: string;
  admin?: boolean;
  focus?: string | null; // phòng admin đang xem to
}

export type AdminAck = { ok: true } | { ok: false; error: "bad-request" | "auth" | "forbidden" | "server" };

/** Lệnh admin. rooms = danh sách phòng (id + tên từ Firebase) — phòng chưa có ai vào cũng được tạo sẵn trên server. */
interface AdminCmd {
  action: "start" | "goto" | "remove";
  rooms: { id: string; name: string }[];
  levelId: string;
}

const ADMINS = "admins"; // kênh Socket.IO của admin
const SUMMARY_MS = 1000; // tóm tắt mọi phòng gửi admin 1 lần/giây
const FOCUS_MS = 200; // phòng đang xem to: 5 snapshot/giây (client tự nội suy)

function parseAdminCmd(p: unknown): AdminCmd | null {
  if (typeof p !== "object" || p === null) return null;
  const o = p as Record<string, unknown>;
  if (o.action !== "start" && o.action !== "goto" && o.action !== "remove") return null;
  if (!Array.isArray(o.rooms) || o.rooms.length === 0 || o.rooms.length > 50) return null;
  const rooms: AdminCmd["rooms"] = [];
  for (const x of o.rooms as unknown[]) {
    const r = x as Record<string, unknown> | null;
    if (!r || typeof r.id !== "string" || !ROOM_ID_RE.test(r.id)) return null;
    rooms.push({ id: r.id, name: typeof r.name === "string" ? r.name.slice(0, 60) : r.id });
  }
  const levelId = typeof o.levelId === "string" && LEVEL_IDS.includes(o.levelId) ? o.levelId : LEVEL_IDS[0];
  return { action: o.action, rooms, levelId };
}

const SLOT_RE = /^s[0-7]$/;

function parseJoin(p: unknown): JoinPayload | null {
  if (typeof p !== "object" || p === null) return null;
  const o = p as Record<string, unknown>;
  if (typeof o.roomId !== "string" || !ROOM_ID_RE.test(o.roomId)) return null;
  return {
    roomId: o.roomId,
    idToken: typeof o.idToken === "string" ? o.idToken : "",
    slot: typeof o.slot === "string" ? o.slot : undefined,
    name: typeof o.name === "string" ? o.name : undefined,
    levelId: typeof o.levelId === "string" ? o.levelId : undefined,
  };
}

export function createServer(partial: Partial<ServerDeps> = {}) {
  const config = partial.config ?? loadConfig();
  const db = partial.db ?? openDb(config.dbPath);
  const verify = partial.verify ?? createVerifier(config.firebaseProjectId);
  const lookup = partial.lookup ?? createLookup(config.firebaseDbUrl);
  const adminCheck = partial.adminCheck ?? createAdminCheck(config.firebaseDbUrl);

  const app = express();
  app.disable("x-powered-by");

  // CORS thủ công cho /api (Socket.IO có cấu hình CORS riêng bên dưới)
  app.use("/api", (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (config.corsOrigins.includes("*") || config.corsOrigins.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    next();
  });

  const httpServer: HttpServer = createHttpServer(app);
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigins },
    transports: ["websocket"],
    pingInterval: 10_000,
    pingTimeout: 8_000,
  });

  const manager = new RoomManager({
    createRoomEmit: (roomId) => (snap) => {
      io.to(roomId).volatile.emit("snap", snap);
    },
    onResult: (r) => {
      try {
        db.insertResult(r);
      } catch (e) {
        console.error("ghi kết quả lỗi:", e);
      }
    },
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, rooms: manager.roomCount, players: io.engine.clientsCount });
  });

  app.get("/api/results", (req, res) => {
    const roomId = typeof req.query.roomId === "string" ? req.query.roomId : undefined;
    const limit = Number(req.query.limit);
    res.json(db.listResults({ roomId, limit: Number.isFinite(limit) ? limit : undefined }));
  });

  // slot đang được socket nào giữ: "roomId:slot" -> socket
  const owners = new Map<string, Socket>();
  const admins = new Set<Socket>();

  io.on("connection", (socket) => {
    const data = socket.data as SocketData;

    socket.on("join", async (payload: unknown, ack?: (r: JoinResult) => void) => {
      const reply = typeof ack === "function" ? ack : () => undefined;
      try {
        const p = parseJoin(payload);
        if (!p) return reply({ ok: false, error: "bad-request" });

        let m: Membership | null;
        if (config.authDisabled) {
          if (!p.slot || !SLOT_RE.test(p.slot)) return reply({ ok: false, error: "bad-request" });
          m = { slot: p.slot, name: (p.name ?? p.slot).slice(0, 20), roomName: p.roomId, levelId: p.levelId ?? "1" };
        } else {
          let uid: string;
          try {
            uid = (await verify(p.idToken)).uid;
          } catch {
            return reply({ ok: false, error: "auth" });
          }
          m = await lookup(p.roomId, uid, p.idToken);
          if (!m) return reply({ ok: false, error: "not-in-room" });
        }
        if (socket.disconnected) return; // đã ngắt trong lúc chờ xác thực

        // join lại phòng/ô khác trên cùng socket: rời chỗ cũ trước
        releaseSocket(socket);

        const key = `${p.roomId}:${m.slot}`;
        const old = owners.get(key);
        owners.set(key, socket);
        if (old && old.id !== socket.id) old.disconnect(true); // tải lại trang: socket mới thay socket cũ

        const room = manager.getOrCreate(p.roomId, m.roomName, m.levelId);
        void socket.join(p.roomId);
        data.roomId = p.roomId;
        data.slot = m.slot;
        room.addPlayer(m.slot, m.name);

        reply({ ok: true, slot: m.slot });
        socket.emit("snap", room.snapshotString());
      } catch (e) {
        console.error("join lỗi:", e);
        reply({ ok: false, error: "server" });
      }
    });

    socket.on("in", (payload: unknown) => {
      if (!data.roomId || !data.slot) return;
      manager.get(data.roomId)?.setInput(data.slot, payload);
    });

    // đo độ trễ vòng đi-về (overlay ?net=1 ở client)
    socket.on("echo", (ack?: () => void) => {
      if (typeof ack === "function") ack();
    });

    // ---------------- admin
    socket.on("admin:hello", async (payload: unknown, ack?: (r: AdminAck) => void) => {
      const reply = typeof ack === "function" ? ack : () => undefined;
      try {
        const idToken = typeof payload === "object" && payload !== null ? (payload as { idToken?: unknown }).idToken : undefined;
        if (typeof idToken !== "string") return reply({ ok: false, error: "bad-request" });
        if (!config.authDisabled) {
          let uid: string;
          try {
            uid = (await verify(idToken)).uid;
          } catch {
            return reply({ ok: false, error: "auth" });
          }
          if (!(await adminCheck(uid, idToken))) return reply({ ok: false, error: "forbidden" });
        }
        if (socket.disconnected) return;
        data.admin = true;
        data.focus = null;
        admins.add(socket);
        void socket.join(ADMINS);
        reply({ ok: true });
        socket.emit("rooms", summaries()); // không phải chờ nhịp 1 giây
      } catch (e) {
        console.error("admin:hello lỗi:", e);
        reply({ ok: false, error: "server" });
      }
    });

    socket.on("admin:cmd", (payload: unknown, ack?: (r: AdminAck) => void) => {
      const reply = typeof ack === "function" ? ack : () => undefined;
      if (!data.admin) return reply({ ok: false, error: "forbidden" });
      const cmd = parseAdminCmd(payload);
      if (!cmd) return reply({ ok: false, error: "bad-request" });
      for (const r of cmd.rooms) {
        if (cmd.action === "remove") manager.remove(r.id);
        else {
          const room = manager.getOrCreate(r.id, r.name, cmd.levelId);
          if (cmd.action === "start") room.start(cmd.levelId);
          else room.goto(cmd.levelId);
        }
      }
      reply({ ok: true });
      io.to(ADMINS).emit("rooms", summaries());
    });

    socket.on("admin:focus", (roomId: unknown) => {
      if (!data.admin) return;
      data.focus = typeof roomId === "string" && ROOM_ID_RE.test(roomId) ? roomId : null;
    });

    socket.on("disconnect", () => {
      releaseSocket(socket);
      admins.delete(socket);
    });
  });

  /** Nếu socket này đang giữ một ô → nhả ô và xóa người chơi khỏi phòng. */
  function releaseSocket(socket: Socket): void {
    const d = socket.data as SocketData;
    if (!d.roomId || !d.slot) return;
    const key = `${d.roomId}:${d.slot}`;
    if (owners.get(key)?.id === socket.id) {
      owners.delete(key);
      manager.get(d.roomId)?.removePlayer(d.slot);
    }
    d.roomId = undefined;
    d.slot = undefined;
  }

  /** Mọi phòng trên server, đã xếp hạng. */
  function summaries() {
    return rankRooms(manager.list().map((r) => r.summary()));
  }

  const timers: ReturnType<typeof setInterval>[] = [];
  if (partial.startLoop ?? true) {
    manager.start();
    timers.push(
      setInterval(() => {
        if (admins.size > 0) io.to(ADMINS).emit("rooms", summaries());
      }, SUMMARY_MS),
      setInterval(() => {
        for (const s of admins) {
          const id = (s.data as SocketData).focus;
          const room = id ? manager.get(id) : undefined;
          if (room) s.volatile.emit("focus", { id, snap: room.snapshotString() });
        }
      }, FOCUS_MS),
    );
  }

  async function close(): Promise<void> {
    manager.stop();
    timers.forEach(clearInterval);
    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });
    if (!partial.db) db.close();
  }

  return { httpServer, io, manager, config, close };
}
````

**Thay toàn bộ** `src/socket.test.ts`:

````ts
// src/socket.test.ts — kiểm thử tích hợp với socket.io-client thật
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { loadConfig } from "./config";
import { openDb } from "./db";
import { createServer, type JoinResult } from "./index";
import type { Snapshot } from "./shared/game/protocol";
import { decodeSnapshot } from "./shared/net/codec";

let srv: ReturnType<typeof createServer>;
let url = "";
const clients: Socket[] = [];

function client(): Socket {
  const s = connect(url, { transports: ["websocket"], forceNew: true });
  clients.push(s);
  return s;
}

function join(s: Socket, payload: object): Promise<JoinResult> {
  return new Promise((resolve) => s.emit("join", payload, resolve));
}

function nextSnap(s: Socket, pred: (snap: Snapshot) => boolean = () => true, timeoutMs = 1500): Promise<Snapshot> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("hết giờ chờ snap")), timeoutMs);
    const onSnap = (raw: string) => {
      const snap = decodeSnapshot(raw);
      if (snap && pred(snap)) {
        clearTimeout(timer);
        s.off("snap", onSnap);
        resolve(snap);
      }
    };
    s.on("snap", onSnap);
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  srv = createServer({
    config: loadConfig({ AUTH_DISABLED: "1" } as NodeJS.ProcessEnv),
    db: openDb(":memory:"),
  });
  await new Promise<void>((r) => srv.httpServer.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${(srv.httpServer.address() as { port: number }).port}`;
});
afterEach(() => {
  while (clients.length) clients.pop()!.disconnect();
});
afterAll(() => srv.close());

it("2 client vào cùng phòng → cả hai nhận snap có 2 slot", async () => {
  const a = client();
  const b = client();
  expect(await join(a, { roomId: "r1", idToken: "", slot: "s0", name: "Bo" })).toEqual({ ok: true, slot: "s0" });
  const sb = nextSnap(b, (s) => Object.keys(s.p).length === 2);
  expect(await join(b, { roomId: "r1", idToken: "", slot: "s1", name: "Cam" })).toEqual({ ok: true, slot: "s1" });
  expect(Object.keys((await sb).p).sort()).toEqual(["s0", "s1"]);
});

it("phím phải làm vị trí tăng", async () => {
  const a = client();
  await join(a, { roomId: "r2", idToken: "", slot: "s0", name: "Bo" });
  await wait(300); // đứng yên cho tiếp đất
  const before = await nextSnap(a);
  a.emit("in", { l: 0, r: 1, j: 0, q: 1 });
  const after = await nextSnap(a, (s) => s.p.s0[0] > before.p.s0[0] + 100);
  expect(after.p.s0[0]).toBeGreaterThan(before.p.s0[0] + 100);
});

it("tải lại trang: socket mới thay socket cũ, phòng vẫn đúng 1 người", async () => {
  const a1 = client();
  await join(a1, { roomId: "r3", idToken: "", slot: "s0", name: "Bo" });
  const closed = new Promise<void>((r) => a1.on("disconnect", () => r()));
  const a2 = client();
  expect(await join(a2, { roomId: "r3", idToken: "", slot: "s0", name: "Bo" })).toEqual({ ok: true, slot: "s0" });
  await closed;
  await wait(100);
  expect(srv.manager.get("r3")?.playerCount).toBe(1);
});

it("rời đi → người chơi bị xóa khỏi phòng", async () => {
  const a = client();
  await join(a, { roomId: "r4", idToken: "", slot: "s0", name: "Bo" });
  a.disconnect();
  await wait(150);
  expect(srv.manager.get("r4")?.playerCount).toBe(0);
});

it("join sai định dạng → bad-request, server vẫn sống", async () => {
  const a = client();
  expect(await join(a, { roomId: "../x", idToken: "", slot: "s0" })).toEqual({ ok: false, error: "bad-request" });
  expect(await join(a, { roomId: "ok", idToken: "", slot: "zz" })).toEqual({ ok: false, error: "bad-request" });
  expect((await fetch(`${url}/health`)).status).toBe(200);
});

it("echo trả ack để client đo ping", async () => {
  const a = client();
  const ms = await new Promise<number>((resolve) => {
    a.on("connect", () => {
      const t0 = performance.now();
      a.emit("echo", () => resolve(performance.now() - t0));
    });
  });
  expect(ms).toBeGreaterThanOrEqual(0);
  expect(ms).toBeLessThan(500);
});

it("gửi input trước khi join không làm sập server", async () => {
  const a = client();
  a.emit("in", { l: 1 });
  a.emit("restart");
  await wait(100);
  expect((await fetch(`${url}/health`)).status).toBe(200);
});

function adminHello(s: Socket): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => s.emit("admin:hello", { idToken: "" }, resolve));
}

it("admin: xin quyền → nhận tóm tắt phòng; lệnh start tạo phòng chưa có ai, xếp hạng", async () => {
  const ad = client();
  const first = new Promise<unknown[]>((r) => ad.once("rooms", r));
  expect(await adminHello(ad)).toEqual({ ok: true });
  expect(Array.isArray(await first)).toBe(true);

  const ack = await new Promise<{ ok: boolean }>((r) =>
    ad.emit("admin:cmd", { action: "start", rooms: [{ id: "adm1", name: "Tổ 1" }, { id: "adm2", name: "Tổ 2" }] }, r),
  );
  expect(ack).toEqual({ ok: true });
  const rooms = await new Promise<Array<{ id: string; rank: number; startedAt: number | null; levelId: string }>>((r) => ad.once("rooms", r));
  const mine = rooms.filter((x) => x.id.startsWith("adm"));
  expect(mine.map((x) => x.id).sort()).toEqual(["adm1", "adm2"]);
  expect(mine.every((x) => x.startedAt !== null && x.levelId === "1" && x.rank >= 1)).toBe(true);
});

it("admin: xem to 1 phòng → nhận 'focus' nhiều lần mỗi giây", async () => {
  const p = client();
  await join(p, { roomId: "adm3", idToken: "", slot: "s0", name: "Bo" });
  const ad = client();
  await adminHello(ad);
  let n = 0;
  ad.on("focus", (m: { id: string; snap: string }) => {
    if (m.id === "adm3" && decodeSnapshot(m.snap)) n++;
  });
  ad.emit("admin:focus", "adm3");
  await wait(1100);
  expect(n).toBeGreaterThanOrEqual(3);
  expect(n).toBeLessThanOrEqual(7);
});

it("chưa xin quyền admin → lệnh bị từ chối; lệnh sai → bad-request", async () => {
  const a = client();
  const deny = await new Promise((r) => a.emit("admin:cmd", { action: "start", rooms: [{ id: "x", name: "x" }] }, r));
  expect(deny).toEqual({ ok: false, error: "forbidden" });
  await adminHello(a);
  const bad = await new Promise((r) => a.emit("admin:cmd", { action: "nuke", rooms: [] }, r));
  expect(bad).toEqual({ ok: false, error: "bad-request" });
  const bad2 = await new Promise((r) => a.emit("admin:cmd", { action: "start", rooms: [{ id: "../x", name: "x" }] }, r));
  expect(bad2).toEqual({ ok: false, error: "bad-request" });
});
````

**Tạo mới** `src/admin.test.ts`:

````ts
// src/admin.test.ts — kênh admin khi BẬT xác thực (token + admins/{uid} giả lập)
import { io as connect, type Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { loadConfig } from "./config";
import { openDb } from "./db";
import { createServer } from "./index";

let srv: ReturnType<typeof createServer>;
let url = "";
const clients: Socket[] = [];

beforeAll(async () => {
  srv = createServer({
    config: loadConfig({ FIREBASE_PROJECT_ID: "p", FIREBASE_DB_URL: "https://db.example" } as NodeJS.ProcessEnv),
    db: openDb(":memory:"),
    verify: async (token) => {
      if (token === "tok-admin") return { uid: "boss" };
      if (token === "tok-user") return { uid: "user" };
      throw new Error("bad token");
    },
    lookup: async () => null,
    adminCheck: async (uid) => uid === "boss",
    startLoop: false,
  });
  await new Promise<void>((r) => srv.httpServer.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${(srv.httpServer.address() as { port: number }).port}`;
});
afterEach(() => {
  while (clients.length) clients.pop()!.disconnect();
});
afterAll(() => srv.close());

function hello(idToken: string): Promise<unknown> {
  const s = connect(url, { transports: ["websocket"], forceNew: true });
  clients.push(s);
  return new Promise((r) => s.emit("admin:hello", { idToken }, r));
}

it("token sai → auth; người thường → forbidden; admin → ok", async () => {
  expect(await hello("rác")).toEqual({ ok: false, error: "auth" });
  expect(await hello("tok-user")).toEqual({ ok: false, error: "forbidden" });
  expect(await hello("tok-admin")).toEqual({ ok: true });
});

it("thiếu idToken → bad-request", async () => {
  const s = connect(url, { transports: ["websocket"], forceNew: true });
  clients.push(s);
  expect(await new Promise((r) => s.emit("admin:hello", {}, r))).toEqual({ ok: false, error: "bad-request" });
});
````

**Tạo mới** `scripts/adminprobe.ts`:

````ts
// scripts/adminprobe.ts
// Admin giả để đo tải: xin quyền (server chạy AUTH_DISABLED=1), bắt đầu 9 phòng load0..8 (đúng tên phòng của scripts/loadtest.ts),
// xem to load0; sau N giây in số gói + dung lượng admin nhận và top 3 xếp hạng.
//   npx tsx scripts/adminprobe.ts http://127.0.0.1:3601 40
import { io } from "socket.io-client";

const url = process.argv[2] ?? "http://127.0.0.1:3611";
const secs = Number(process.argv[3] ?? "40");
const s = io(url, { transports: ["websocket"] });
let rooms = 0;
let roomBytes = 0;
let focus = 0;
let focusBytes = 0;
let lastRanked = "";
s.on("connect", () => {
  s.emit("admin:hello", { idToken: "" }, () => {
    const list = Array.from({ length: 9 }, (_, i) => ({ id: `load${i}`, name: `Tổ ${i + 1}` }));
    s.emit("admin:cmd", { action: "start", rooms: list }, () => s.emit("admin:focus", "load0"));
  });
});
s.on("rooms", (r: Array<{ name: string; rank: number; levelId: string; part: number; deaths: number }>) => {
  rooms++;
  roomBytes += JSON.stringify(r).length;
  lastRanked = r.slice(0, 3).map((x) => `#${x.rank} ${x.name} L${x.levelId}p${x.part + 1} thua${x.deaths}`).join(" | ");
});
s.on("focus", (m: { snap: string }) => {
  focus++;
  focusBytes += m.snap.length;
});
setTimeout(() => {
  console.log(`admin nhận: rooms ${(rooms / secs).toFixed(1)}/s (${Math.round(roomBytes / secs / 1024)} KB/s) · focus ${(focus / secs).toFixed(1)}/s (${Math.round(focusBytes / secs)} B/s)`);
  console.log("top 3:", lastRanked);
  process.exit(0);
}, secs * 1000);
````


✅ **Kiểm tra**

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

`tsc` sạch; **61/61 test xanh** (thêm: 3 test kiểm quyền admin, 2 test xếp hạng, 5 test lượt thi / số lần thua, 3 test kênh admin qua socket thật, 2 test admin khi bật xác thực); build ra `dist/main.mjs`.
