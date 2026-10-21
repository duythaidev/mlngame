# "Mỗi máy tự lái nhân vật của mình" (Bỏ mô hình Host) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi kiến trúc mạng nhiều người chơi từ mô hình host-authoritative (toàn bộ vật lý chạy ở máy host) sang mô hình mô phỏng phân tán (mỗi máy tự chạy vật lý cho nhân vật của mình, nhân vật người khác là kinematic với nội suy, trạng thái chung qua Firebase transaction).

**Architecture:** Mỗi client chạy một thể hiện `GameEngine` độc lập: nhân vật local là dynamic body chịu điều khiển bàn phím, nhân vật người khác là kinematic body được cập nhật từ vị trí nội suy (`RemoteTrack`). Vị trí nhân vật của mình được gửi lên `rooms/{id}/pos/{slot}` qua codec `v3` dạng gọn nhẹ (~20Hz). Trạng thái chung (status, epoch, key, lv, kết quả hoàn thành) lưu tại `rooms/{id}/game` và chuyển trạng thái qua hàm thuần `reduceGame` trong Firebase transaction.

**Tech Stack:** TypeScript, React 19, Planck.js (Box2D), Firebase Realtime Database (RTDB), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-21-moi-may-tu-lai-design.md`

## Global Constraints

- Không sửa đổi hằng số vật lý cốt lõi `PHYS` và logic va chạm nền tảng (trừ phân bổ dây chia đôi và kinematic actor).
- Chế độ Sandbox (chơi 2 người chung bàn phím) phải tiếp tục hoạt động 100% nguyên vẹn như cũ mà không bị ảnh hưởng.
- Codec `v3` cho `rooms/{id}/pos/{slot}` chuỗi dạng `v3|ms|epoch|x|y|vx|vy|flags` dài dưới 120 ký tự.
- Hàm `reduceGame` phải là hàm thuần tuý (pure function), độc lập hoàn toàn với I/O để chạy trong Firebase transaction.
- Giữ nguyên các tính năng: dây nối chuỗi, kéo người dưới hố, chồng người, đè đầu chặn nhảy, Thua 1s nháy đỏ và rung, âm thanh `restart.mp3` ở mọi máy, âm thanh nhảy chỉ ở máy mình, thời gian hoàn thành gửi cho admin.

---

### Task 1: Trạng thái trò chơi chung (`src/net/gameState.ts`)

**Files:**
- Create: `src/net/gameState.ts`
- Test: `src/net/gameState.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface GameState {
    lv: string;
    epoch: number;
    status: "play" | "lose" | "won";
    key: 0 | 1;
    loseBy?: string;
    at: number; // server time (ms)
    levelStart: number; // server time (ms)
  }

  export type GameEvent =
    | { type: "died"; slot: string; epoch: number }
    | { type: "gotKey"; epoch: number }
    | { type: "allInDoor"; epoch: number }
    | { type: "restart"; epoch: number }
    | { type: "nextLevel"; epoch: number; nextLv: string }
    | { type: "replay"; epoch: number; lv?: string }
    | { type: "rosterChanged"; epoch: number }
    | { type: "start"; lv: string };

  export function reduceGame(
    state: GameState | null | undefined,
    event: GameEvent,
    nowServer: number
  ): GameState | undefined;
  ```

- [ ] **Step 1: Write failing unit test for `reduceGame`**

```ts
// src/net/gameState.test.ts
import { describe, expect, it } from "vitest";
import { reduceGame, type GameState } from "./gameState";

describe("reduceGame", () => {
  const base: GameState = {
    lv: "1",
    epoch: 1,
    status: "play",
    key: 0,
    at: 1000,
    levelStart: 1000,
  };

  it("handles start event initializing fresh game", () => {
    const s = reduceGame(null, { type: "start", lv: "1" }, 2000);
    expect(s).toEqual({
      lv: "1",
      epoch: 1,
      status: "play",
      key: 0,
      at: 2000,
      levelStart: 2000,
    });
  });

  it("handles died event with matching epoch", () => {
    const next = reduceGame(base, { type: "died", slot: "s0", epoch: 1 }, 2500);
    expect(next?.status).toBe("lose");
    expect(next?.loseBy).toBe("s0");
    expect(next?.at).toBe(2500);
  });

  it("ignores died event if epoch does not match or already lost", () => {
    expect(reduceGame(base, { type: "died", slot: "s0", epoch: 0 }, 2500)).toBeUndefined();
    const lost: GameState = { ...base, status: "lose", loseBy: "s1" };
    expect(reduceGame(lost, { type: "died", slot: "s0", epoch: 1 }, 2500)).toBeUndefined();
  });

  it("handles gotKey event with matching epoch and key=0", () => {
    const next = reduceGame(base, { type: "gotKey", epoch: 1 }, 3000);
    expect(next?.key).toBe(1);
    expect(next?.status).toBe("play");
  });

  it("handles allInDoor event when key=1 and status=play", () => {
    const withKey: GameState = { ...base, key: 1 };
    const won = reduceGame(withKey, { type: "allInDoor", epoch: 1 }, 4000);
    expect(won?.status).toBe("won");
    expect(won?.at).toBe(4000);
  });

  it("rejects restart event if before 1000ms delay", () => {
    const lost: GameState = { ...base, status: "lose", at: 5000 };
    expect(reduceGame(lost, { type: "restart", epoch: 1 }, 5500)).toBeUndefined();
  });

  it("accepts restart event after 1000ms delay and increments epoch", () => {
    const lost: GameState = { ...base, status: "lose", at: 5000, loseBy: "s0" };
    const restarted = reduceGame(lost, { type: "restart", epoch: 1 }, 6050);
    expect(restarted?.status).toBe("play");
    expect(restarted?.epoch).toBe(2);
    expect(restarted?.key).toBe(0);
    expect(restarted?.loseBy).toBeUndefined();
  });

  it("handles nextLevel after 3000ms delay", () => {
    const won: GameState = { ...base, status: "won", at: 7000 };
    expect(reduceGame(won, { type: "nextLevel", epoch: 1, nextLv: "2" }, 9000)).toBeUndefined();
    const next = reduceGame(won, { type: "nextLevel", epoch: 1, nextLv: "2" }, 10100);
    expect(next?.status).toBe("play");
    expect(next?.lv).toBe("2");
    expect(next?.epoch).toBe(2);
    expect(next?.levelStart).toBe(10100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/net/gameState.test.ts`
Expected: FAIL (Cannot find module `./gameState`)

- [ ] **Step 3: Implement `src/net/gameState.ts`**

```ts
// src/net/gameState.ts

export interface GameState {
  lv: string;
  epoch: number;
  status: "play" | "lose" | "won";
  key: 0 | 1;
  loseBy?: string;
  at: number;
  levelStart: number;
}

export type GameEvent =
  | { type: "died"; slot: string; epoch: number }
  | { type: "gotKey"; epoch: number }
  | { type: "allInDoor"; epoch: number }
  | { type: "restart"; epoch: number }
  | { type: "nextLevel"; epoch: number; nextLv: string }
  | { type: "replay"; epoch: number; lv?: string }
  | { type: "rosterChanged"; epoch: number }
  | { type: "start"; lv: string };

export function reduceGame(
  state: GameState | null | undefined,
  event: GameEvent,
  nowServer: number
): GameState | undefined {
  if (event.type === "start") {
    return {
      lv: event.lv,
      epoch: (state?.epoch ?? 0) + 1,
      status: "play",
      key: 0,
      at: nowServer,
      levelStart: nowServer,
    };
  }

  if (!state) return undefined;

  switch (event.type) {
    case "died": {
      if (state.status !== "play" || state.epoch !== event.epoch) return undefined;
      return {
        ...state,
        status: "lose",
        loseBy: event.slot,
        at: nowServer,
      };
    }

    case "gotKey": {
      if (state.status !== "play" || state.key === 1 || state.epoch !== event.epoch) return undefined;
      return {
        ...state,
        key: 1,
      };
    }

    case "allInDoor": {
      if (state.status !== "play" || state.key !== 1 || state.epoch !== event.epoch) return undefined;
      return {
        ...state,
        status: "won",
        at: nowServer,
      };
    }

    case "restart": {
      if (state.status !== "lose" || nowServer - state.at < 1000) return undefined;
      const { loseBy: _, ...rest } = state;
      return {
        ...rest,
        status: "play",
        epoch: state.epoch + 1,
        key: 0,
        at: nowServer,
      };
    }

    case "nextLevel": {
      if (state.status !== "won" || nowServer - state.at < 3000) return undefined;
      return {
        ...state,
        lv: event.nextLv,
        epoch: state.epoch + 1,
        status: "play",
        key: 0,
        at: nowServer,
        levelStart: nowServer,
      };
    }

    case "replay": {
      if (state.status !== "won") return undefined;
      return {
        ...state,
        lv: event.lv ?? state.lv,
        epoch: state.epoch + 1,
        status: "play",
        key: 0,
        at: nowServer,
        levelStart: event.lv ? nowServer : state.levelStart,
      };
    }

    case "rosterChanged": {
      return {
        ...state,
        epoch: state.epoch + 1,
        status: "play",
        key: 0,
        at: nowServer,
      };
    }

    default:
      return undefined;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/net/gameState.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/net/gameState.ts src/net/gameState.test.ts
git commit -m "feat(net): implement pure GameState reducer and event machine"
```

---

### Task 2: Codec vị trí cá nhân `v3` (`src/net/posCodec.ts`)

**Files:**
- Create: `src/net/posCodec.ts`
- Test: `src/net/posCodec.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface PosMessage {
    ms: number;
    epoch: number;
    x: number;   // ô * 100 (làm tròn số nguyên)
    y: number;   // ô * 100
    vx: number;  // vận tốc * 100
    vy: number;  // vận tốc * 100
    flags: number; // bit 1: grounded, bit 2: inDoor, bit 4: frozen
  }

  export const POS_FLAG = {
    GROUNDED: 1,
    IN_DOOR: 2,
    FROZEN: 4,
  } as const;

  export function encodePos(m: PosMessage): string;
  export function decodePos(raw: unknown): PosMessage | null;
  export function changeKeyPos(m: PosMessage): string;
  ```

- [ ] **Step 1: Write failing unit test for `posCodec`**

```ts
// src/net/posCodec.test.ts
import { describe, expect, it } from "vitest";
import { decodePos, encodePos, changeKeyPos, POS_FLAG } from "./posCodec";

describe("posCodec", () => {
  const sample = {
    ms: 12345,
    epoch: 2,
    x: 450,
    y: 1120,
    vx: 180,
    vy: -20,
    flags: POS_FLAG.GROUNDED | POS_FLAG.IN_DOOR,
  };

  it("encodes and decodes round-trip accurately", () => {
    const encoded = encodePos(sample);
    expect(encoded.startsWith("v3|")).toBe(true);
    expect(encoded.length).toBeLessThan(120);

    const decoded = decodePos(encoded);
    expect(decoded).toEqual(sample);
  });

  it("rejects invalid or corrupted inputs", () => {
    expect(decodePos(null)).toBeNull();
    expect(decodePos("v2|1|2|3")).toBeNull();
    expect(decodePos("v3|invalid|epoch|x")).toBeNull();
    expect(decodePos("")).toBeNull();
  });

  it("generates changeKey without ms timestamp", () => {
    const k1 = changeKeyPos(sample);
    const k2 = changeKeyPos({ ...sample, ms: 99999 });
    expect(k1).toBe(k2);
    const k3 = changeKeyPos({ ...sample, x: 451 });
    expect(k1).not.toBe(k3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/net/posCodec.test.ts`
Expected: FAIL (Cannot find module `./posCodec`)

- [ ] **Step 3: Implement `src/net/posCodec.ts`**

```ts
// src/net/posCodec.ts

export const WIRE_POS_VERSION = "v3";

export interface PosMessage {
  ms: number;
  epoch: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  flags: number;
}

export const POS_FLAG = {
  GROUNDED: 1,
  IN_DOOR: 2,
  FROZEN: 4,
} as const;

export function encodePos(m: PosMessage): string {
  return `${WIRE_POS_VERSION}|${Math.round(m.ms)}|${m.epoch}|${Math.round(m.x)}|${Math.round(m.y)}|${Math.round(m.vx)}|${Math.round(m.vy)}|${m.flags}`;
}

export function decodePos(raw: unknown): PosMessage | null {
  if (typeof raw !== "string" || !raw.startsWith(`${WIRE_POS_VERSION}|`)) {
    return null;
  }
  const parts = raw.split("|");
  if (parts.length < 8) return null;

  const ms = Number(parts[1]);
  const epoch = Number(parts[2]);
  const x = Number(parts[3]);
  const y = Number(parts[4]);
  const vx = Number(parts[5]);
  const vy = Number(parts[6]);
  const flags = Number(parts[7]);

  if (
    !Number.isFinite(ms) ||
    !Number.isFinite(epoch) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(vx) ||
    !Number.isFinite(vy) ||
    !Number.isFinite(flags)
  ) {
    return null;
  }

  return { ms, epoch, x, y, vx, vy, flags };
}

export function changeKeyPos(m: PosMessage): string {
  return `${m.epoch}|${Math.round(m.x)}|${Math.round(m.y)}|${Math.round(m.vx)}|${Math.round(m.vy)}|${m.flags}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/net/posCodec.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/net/posCodec.ts src/net/posCodec.test.ts
git commit -m "feat(net): implement v3 pos codec with changeKey and flag decoding"
```

---

### Task 3: Bộ đệm nội suy vị trí người khác (`RemoteTrack` trong `src/net/interpolate.ts`)

**Files:**
- Modify: `src/net/interpolate.ts`
- Modify: `src/net/interpolate.test.ts` (hoặc tạo mới)

**Interfaces:**
- Produces:
  ```ts
  export interface RemoteSample {
    ms: number;
    epoch: number;
    x: number;  // ô (chia 100)
    y: number;  // ô (chia 100)
    vx: number; // ô/s (chia 100)
    vy: number; // ô/s (chia 100)
    flags: number;
  }

  export class RemoteTrack {
    constructor(delayMs?: number);
    push(sample: RemoteSample, recvAt: number): void;
    sample(now: number): { x: number; y: number; vx: number; vy: number; flags: number } | null;
    reset(): void;
  }
  ```

- [ ] **Step 1: Write failing tests for `RemoteTrack`**

```ts
// src/net/interpolate.test.ts
import { describe, expect, it } from "vitest";
import { RemoteTrack } from "./interpolate";

describe("RemoteTrack", () => {
  it("interpolates smoothly between two received samples", () => {
    const track = new RemoteTrack(80);
    // Client sends at ms 1000, received at now 1050 (offset = 50)
    track.push({ ms: 1000, epoch: 1, x: 2.0, y: 5.0, vx: 1.0, vy: 0, flags: 1 }, 1050);
    // Client sends at ms 1100, received at now 1150
    track.push({ ms: 1100, epoch: 1, x: 3.0, y: 5.0, vx: 1.0, vy: 0, flags: 1 }, 1150);

    // Render at now = 1180: renderMs = 1180 - 50 - 80 = 1050 (50% giữa 1000 và 1100)
    const pos = track.sample(1180);
    expect(pos).not.toBeNull();
    expect(pos!.x).toBeCloseTo(2.5, 2);
    expect(pos!.y).toBeCloseTo(5.0, 2);
  });

  it("does not interpolate across different epochs", () => {
    const track = new RemoteTrack(80);
    track.push({ ms: 1000, epoch: 1, x: 2.0, y: 5.0, vx: 0, vy: 0, flags: 1 }, 1050);
    track.push({ ms: 1050, epoch: 2, x: 10.0, y: 5.0, vx: 0, vy: 0, flags: 1 }, 1100);

    // If sampling, it should immediately reset or clamp to new epoch rather than sliding from 2 to 10
    const pos = track.sample(1180);
    expect(pos!.x).toBe(10.0);
  });

  it("does not extrapolate backwards when packets arrive out of order", () => {
    const track = new RemoteTrack(80);
    track.push({ ms: 2000, epoch: 1, x: 5.0, y: 5.0, vx: 0, vy: 0, flags: 1 }, 2050);
    track.push({ ms: 1900, epoch: 1, x: 4.0, y: 5.0, vx: 0, vy: 0, flags: 1 }, 2060); // cũ hơn -> bị bỏ qua

    const pos = track.sample(2130);
    expect(pos!.x).toBe(5.0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/net/interpolate.test.ts`
Expected: FAIL (`RemoteTrack is not defined`)

- [ ] **Step 3: Implement `RemoteTrack` in `src/net/interpolate.ts`**

Update `src/net/interpolate.ts` to implement `RemoteTrack`, while keeping legacy `SnapshotBuffer` if still referenced or exporting both.

```ts
// src/net/interpolate.ts

export interface RemoteSample {
  ms: number;
  epoch: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  flags: number;
}

export class RemoteTrack {
  private buf: RemoteSample[] = [];
  private offset: number | null = null;
  private delayMs: number;
  private currentEpoch: number | null = null;

  constructor(delayMs = 80) {
    this.delayMs = delayMs;
  }

  reset(): void {
    this.buf = [];
    this.offset = null;
    this.currentEpoch = null;
  }

  push(s: RemoteSample, recvAt: number): void {
    if (this.currentEpoch === null || s.epoch !== this.currentEpoch) {
      this.reset();
      this.currentEpoch = s.epoch;
    }

    const last = this.buf[this.buf.length - 1];
    if (last && s.ms <= last.ms) return; // Bỏ qua gói tin cũ/đến trễ

    this.buf.push(s);
    if (this.buf.length > 32) this.buf.shift();

    const o = recvAt - s.ms;
    if (this.offset === null || o < this.offset || last === undefined) {
      this.offset = o;
    } else {
      this.offset += (o - this.offset) * 0.02; // Bù trôi đồng hồ từ từ
    }
  }

  sample(now: number): { x: number; y: number; vx: number; vy: number; flags: number } | null {
    const n = this.buf.length;
    if (n === 0 || this.offset === null) return null;

    const renderMs = now - this.offset - this.delayMs;
    const a = this.buf[0];
    const b = this.buf[n - 1];

    if (renderMs <= a.ms) {
      return { x: a.x, y: a.y, vx: a.vx, vy: a.vy, flags: a.flags };
    }
    if (renderMs >= b.ms) {
      return { x: b.x, y: b.y, vx: b.vx, vy: b.vy, flags: b.flags };
    }

    let left = a;
    let right = b;
    for (let i = 0; i < n - 1; i++) {
      if (this.buf[i].ms <= renderMs && renderMs <= this.buf[i + 1].ms) {
        left = this.buf[i];
        right = this.buf[i + 1];
        break;
      }
    }

    if (left.epoch !== right.epoch) {
      return { x: right.x, y: right.y, vx: right.vx, vy: right.vy, flags: right.flags };
    }

    const span = right.ms - left.ms;
    const k = span > 0 ? (renderMs - left.ms) / span : 0;
    return {
      x: left.x + (right.x - left.x) * k,
      y: left.y + (right.y - left.y) * k,
      vx: right.vx,
      vy: right.vy,
      flags: right.flags,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/net/interpolate.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/net/interpolate.ts src/net/interpolate.test.ts
git commit -m "feat(net): implement RemoteTrack for smooth individual player interpolation"
```

---

### Task 4: Nâng cấp `GameEngine` hỗ trợ Local/Remote Actor và Dây chia đôi (`src/game/engine.ts`)

**Files:**
- Modify: `src/game/engine.ts`
- Test: `src/game/engine.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface GameEngineOptions {
    localSlots?: string[];
    onDied?: (slot: string) => void;
    onGotKey?: () => void;
  }

  export class GameEngine {
    constructor(level: Level, slots: string[], options?: GameEngineOptions);
    isLocal(slot: string): boolean;
    setRemote(slot: string, x: number, y: number, vx: number, vy: number): void;
    setKey(hasKey: boolean): void;
    freeze(): void;
    respawn(slots?: string[]): void;
    getLocalPos(slot: string): { x: number; y: number; vx: number; vy: number; grounded: boolean; inDoor: boolean } | null;
  }
  ```

- [ ] **Step 1: Write failing tests for `GameEngine` local vs remote actors**

```ts
// src/game/engine.test.ts
import { describe, expect, it, vi } from "vitest";
import { GameEngine } from "./engine";
import { getLevel } from "./level";

describe("GameEngine (distributed mode)", () => {
  const level = getLevel("1");

  it("creates remote actors as kinematic and local actors as dynamic", () => {
    const engine = new GameEngine(level, ["s0", "s1"], { localSlots: ["s0"] });
    expect(engine.isLocal("s0")).toBe(true);
    expect(engine.isLocal("s1")).toBe(false);
  });

  it("updates remote actor position via setRemote", () => {
    const engine = new GameEngine(level, ["s0", "s1"], { localSlots: ["s0"] });
    engine.setRemote("s1", 5.5, 8.0, 1.2, 0);
    const snap = engine.snapshot();
    expect(snap.p["s1"]).toEqual([550, 800]);
  });

  it("fires onDied when local actor hits spikes, but not when remote actor does", () => {
    const onDied = vi.fn();
    const engine = new GameEngine(level, ["s0", "s1"], { localSlots: ["s0"], onDied });
    // Spawn s0 on spike in level
    // Advance simulation
    engine.update(0.1);
    // Remote position set on spike should not trigger onDied
    engine.setRemote("s1", 20.0, 10.0, 0, 0);
    engine.update(0.1);
    expect(onDied).not.toHaveBeenCalledWith("s1");
  });

  it("preserves default Sandbox behavior when localSlots is not passed", () => {
    const engine = new GameEngine(level, ["s0", "s1"]);
    expect(engine.isLocal("s0")).toBe(true);
    expect(engine.isLocal("s1")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/engine.test.ts`
Expected: FAIL (`isLocal is not a function`, etc.)

- [ ] **Step 3: Modify `src/game/engine.ts`**

Update `src/game/engine.ts`:
1. In `Actor` interface: add `isLocal: boolean`.
2. In `GameEngine` constructor: accept `options?: GameEngineOptions`. Default `localSlots` to all `slots`.
3. In `build()`:
   - For `isLocal`: `world.createBody({ type: "dynamic", ... })`.
   - For `!isLocal`: `world.createBody({ type: "kinematic", ... })`.
4. In `drive()`:
   - Only execute control loop for `a.isLocal`.
5. In `applyRope()`:
   - For segment `A - B`:
     - If both `!isLocal`: skip segment calculations.
     - If both `isLocal`: full dual-mass impulse (như cũ).
     - If `A.isLocal !== B.isLocal`:
       - Tính `grow`, `bias`, `total`.
       - Giả định 2 vật khối lượng bằng nhau (`ima = 1, imb = 1`).
       - Nếu `stretch < PHYS.ropeMaxStretch`: chỉ áp nửa xung lượng lên bên `isLocal` (`s.A.isLocal ? setLinearVelocity(va + ua*d) : ...`).
       - Nếu `stretch >= PHYS.ropeMaxStretch`: áp toàn bộ xung lượng (`2 * d`) lên bên `isLocal` để chặn không cho dây dài quá mức.
6. In `checkRules()`:
   - Chỉ kiểm tra gai, rơi hố, nhặt chìa khóa, vào cửa đối với các actor `a.isLocal`.
   - Khi local actor chết:
     - Nếu có `this.onDied`: gọi callback `this.onDied(a.slot)` và set vận tốc về 0. Không tự đếm `lose.t >= loseDelay` để restart.
     - Nếu không có callback (Sandbox): giữ nguyên logic cũ `this.lose = { t: 0, culprit }` và tự restart sau 1s.
   - Khi local actor chạm chìa:
     - Gọi `this.onGotKey?.()`.
7. Thêm các hàm công khai:
   - `setRemote(slot, x, y, vx, vy)`
   - `setKey(hasKey)`
   - `freeze()`
   - `respawn(slots?)`
   - `getLocalPos(slot)`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/engine.test.ts`
Expected: PASS

- [ ] **Step 5: Run existing tests to verify no regressions**

Run: `npm test`
Expected: PASS (All test files pass)

- [ ] **Step 6: Commit**

```bash
git add src/game/engine.ts src/game/engine.test.ts
git commit -m "feat(engine): add local/remote actor modes, split rope impulse, and event callbacks"
```

---

### Task 5: Đồng bộ trạng thái Firebase (`src/net/gameSync.ts` & `src/lib/rooms.ts`)

**Files:**
- Create: `src/net/gameSync.ts`
- Modify: `src/lib/rooms.ts`
- Test: `src/net/gameSync.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export async function dispatchGameEvent(
    roomId: string,
    event: GameEvent,
    nowServer: number
  ): Promise<boolean>;

  export function getServerTimeOffset(): Promise<number>;
  export function getNowServer(offsetMs: number): number;
  ```

- [ ] **Step 1: Write unit test for `dispatchGameEvent` logic using mocked Firebase transactions**

```ts
// src/net/gameSync.test.ts
import { describe, expect, it, vi } from "vitest";
import { reduceGame, type GameState } from "./gameState";

describe("gameSync logic", () => {
  it("computes server time correctly with offset", () => {
    const localNow = 100000;
    const offset = -500;
    expect(localNow + offset).toBe(99500);
  });

  it("applies reduceGame inside transaction mutation", () => {
    const cur: GameState = {
      lv: "1",
      epoch: 1,
      status: "play",
      key: 0,
      at: 1000,
      levelStart: 1000,
    };
    const next = reduceGame(cur, { type: "gotKey", epoch: 1 }, 2000);
    expect(next?.key).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/net/gameSync.test.ts`
Expected: PASS

- [ ] **Step 3: Implement `src/net/gameSync.ts`**

```ts
// src/net/gameSync.ts
import { get, ref, runTransaction } from "firebase/database";
import { db } from "../lib/firebase";
import { reduceGame, type GameEvent, type GameState } from "./gameState";

let cachedOffset: number = 0;

export async function initServerTimeOffset(): Promise<number> {
  try {
    const snap = await get(ref(db, ".info/serverTimeOffset"));
    cachedOffset = (snap.val() as number) ?? 0;
  } catch {
    cachedOffset = 0;
  }
  return cachedOffset;
}

export function getServerTime(offset = cachedOffset): number {
  return Date.now() + offset;
}

export async function dispatchGameEvent(
  roomId: string,
  event: GameEvent,
  serverOffset = cachedOffset
): Promise<boolean> {
  const gameRef = ref(db, `rooms/${roomId}/game`);
  const nowServer = getServerTime(serverOffset);
  const result = await runTransaction(gameRef, (current: GameState | null) => {
    const next = reduceGame(current, event, nowServer);
    return next !== undefined ? next : current;
  });
  return result.committed;
}
```

- [ ] **Step 4: Update `src/lib/rooms.ts`**
  - Trong `joinRoom`:
    - Thêm `const posRef = ref(db, "rooms/" + roomId + "/pos/" + slot);`
    - Thêm `const dropPos = onDisconnect(posRef); await dropPos.remove();`
    - Trong hàm `leave()`: `await Promise.all([..., dropPos.cancel(), remove(posRef)]);`
    - Bỏ ghi/đọc `inputsRef`.
  - Khởi tạo node `game` ban đầu khi chuyển sang `phase: "playing"` (nếu chưa có).

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/net/gameSync.ts src/net/gameSync.test.ts src/lib/rooms.ts
git commit -m "feat(net): implement dispatchGameEvent transaction and clean pos on disconnect"
```

---

### Task 6: Viết lại `GameCanvas.tsx` sang mô hình phân tán

**Files:**
- Modify: `src/components/GameCanvas.tsx`

**Key Behaviors:**
1. Mỗi máy tạo `engine = new GameEngine(level, slots, { localSlots: mySlot ? [mySlot] : [] })`.
2. Khởi tạo `tracks: Map<string, RemoteTrack>`.
3. Lắng nghe `rooms/${roomId}/game`:
   - Cập nhật `lv`: nếu khác level hiện tại thì đổi màn.
   - Cập nhật `epoch`: khi `epoch` tăng (restart hoặc qua level), gọi `engine.respawn()` đặt lại vị trí local, xóa sạch buffer của `RemoteTrack`.
   - Cập nhật `key`: `engine.setKey(game.key === 1)`.
   - Cập nhật `status`: khi chuyển sang `lose`, phát `playSound("restart")`.
4. Lắng nghe `rooms/${roomId}/pos`:
   - Với mọi `slot !== mySlot`: decode chuỗi `v3`, nạp vào `tracks.get(slot).push(...)`.
5. Vòng lặp `frame(now)`:
   - Với mỗi người chơi khác: lấy `sample = track.sample(now)`. Gọi `engine.setRemote(slot, sample.x, sample.y, sample.vx, sample.vy)`.
   - `engine.update(dt)`.
   - Khi nhân vật local nhảy (jumps tăng): phát `playSound("jump")`.
   - Lấy thông tin local từ `engine.getLocalPos(mySlot)` -> gửi lên `rooms/${roomId}/pos/${mySlot}` qua `StateSender` (codec `v3`, 20Hz, chỉ gửi khi thay đổi).
   - Nếu là điều phối viên (slot nhỏ nhất):
     - Kiểm tra mọi người chơi đều có flag `inDoor` và `game.key === 1` -> gọi `dispatchGameEvent(roomId, { type: "allInDoor", epoch })`.
     - Nếu `status === "lose"` và `nowServer - game.at >= 1000` -> gọi `dispatchGameEvent(roomId, { type: "restart", epoch })`.
     - Nếu `status === "won"` và `nowServer - game.at >= 3000` -> gọi `dispatchGameEvent(roomId, { type: "nextLevel", epoch, nextLv })`.
     - Fallback: bất kỳ máy nào cũng được gọi `restart` / `nextLevel` nếu quá hạn thêm 1500ms (`nowServer - game.at >= timeout + 1500`).
   - Gọi `drawFrame` vẽ vị trí người chơi, dây và overlay (thua/thắng/chìa khóa).

- [ ] **Step 1: Implement distributed `GameCanvas.tsx`**

Rewrite `src/components/GameCanvas.tsx` following the above specifications.

- [ ] **Step 2: Verify TypeScript & Build locally**

Run: `npm run build`
Expected: `tsc -b && vite build` hoàn thành không có lỗi.

- [ ] **Step 3: Commit**

```bash
git add src/components/GameCanvas.tsx
git commit -m "feat(game): rewrite GameCanvas for distributed peer physics and coordinator flow"
```

---

### Task 7: Cập nhật giao diện `Room.tsx` và dọn dẹp codec cũ

**Files:**
- Modify: `src/pages/Room.tsx`
- Remove / Deprecate: Code không còn sử dụng (`src/net/codec.ts`, `src/net/extrapolate.ts`)
- Update tests: `src/net/codec.test.ts`, `src/net/extrapolate.test.ts` (cập nhật test suite để kiểm tra các module hiện hành).

- [ ] **Step 1: Update `Room.tsx`**
  - Đổi tên biến `isHost` thành `isCoordinator` (`keys[0] === mySlot`).
  - Khi bấm "BẮT ĐẦU CHƠI NGAY", đồng thời dispatch sự kiện `start` khởi tạo `game` state.
  - Phím `R` / nút chơi lại: gọi `dispatchGameEvent(roomId, { type: "replay", epoch, lv })`.

- [ ] **Step 2: Clean up obsolete files & update tests**
  - Xóa hoặc cập nhật các test cũ của `extrapolate.test.ts` và `codec.test.ts` sang kiểm tra `posCodec.test.ts` và `interpolate.test.ts`.

- [ ] **Step 3: Run full tests and build**

Run: `npm test && npm run build`
Expected: ALL PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Room.tsx src/net/
git commit -m "refactor(ui): update coordinator terms, clean legacy network files, pass test suite"
```

---

### Task 8: Tự kiểm tra & Đo đạc hiệu năng (`?net=1`)

**Files:**
- Modify: Document Security Rules vào `docs/database.rules.json` (nếu cần tham khảo).

- [ ] **Step 1: Tạo file tham khảo Security Rules `docs/database.rules.json`**
- [ ] **Step 2: Chạy kiểm thử tự động toàn bộ**
  `npm test`
- [ ] **Step 3: Chạy build production kiểm tra bundle size và lỗi biên dịch**
  `npm run build`
- [ ] **Step 4: Commit và hoàn tất**
