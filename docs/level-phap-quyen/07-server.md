# 07 — Server (repo `mln-server`)

Server chạy engine thật nên cần bản copy mới của code dùng chung. Thêm 2 file vào danh sách đồng bộ, sửa 2 test vốn dựa vào level cũ.
(`story.ts`, `storyTracker.ts`, `renderer.ts` chỉ dùng ở web — server không cần.)

## Bước 1 — Danh sách file dùng chung

**Tạo mới / thay toàn bộ** `scripts/sync-shared.mjs` (34 dòng):

```js
// scripts/sync-shared.mjs
// Copy code game dùng chung từ repo web (mlngame) sang src/shared/. Nguồn duy nhất là mlngame — KHÔNG sửa tay bản copy.
// Dùng:  npm run sync-shared            (mặc định ../mlngame)
//        MLNGAME_DIR=/đường/dẫn npm run sync-shared
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const source = resolve(process.env.MLNGAME_DIR ?? join(root, "..", "mlngame"));

export const SHARED_FILES = [
  "game/engine.ts",
  "game/level.ts",
  "game/levelData.ts",
  "game/objects.ts",
  "game/protocol.ts",
  "lib/constants.ts",
  "net/codec.ts",
  "net/stateSender.ts",
];
export const HEADER = "// AUTO-COPIED from mlngame/src — do not edit; run `npm run sync-shared`\n";

// chỉ chạy khi gọi trực tiếp (không chạy khi test import HEADER / SHARED_FILES)
if (process.argv[1]?.endsWith("sync-shared.mjs")) {
  for (const f of SHARED_FILES) {
    const from = join(source, "src", f);
    const to = join(root, "src", "shared", f);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, HEADER + readFileSync(from, "utf8"));
    console.log(`copied ${f}`);
  }
}
```

## Bước 2 — Đồng bộ

```bash
npm run sync-shared
```

In 8 dòng `copied …`, có `game/levelData.ts` và `game/objects.ts`.

## Bước 3 — Test qua màn dùng level luyện tập `t1`

Level 1 cũ nay là `t1` (cùng hình học), không tự sang level khác.

**Tạo mới / thay toàn bộ** `src/levels.test.ts` (114 dòng):

```ts
// src/levels.test.ts
// Hai người chơi (qua Room, như người thật gửi phím) chơi hết level luyện tập t1 → thắng, 0 lần chết, ghi kết quả.
// (5 chương chính được bot chơi thử trong mlngame: src/game/levels.play.test.ts.)
import { expect, it } from "vitest";
import type { ResultRow } from "./db";
import { Room } from "./room";

type Gen = Generator<void, void, void>;

it("2 người chơi qua level luyện tập t1 bằng kịch bản phím, không chết", () => {
  let t = 0;
  const results: ResultRow[] = [];
  const room = new Room({ id: "L1", name: "L1", levelId: "t1", emit: () => undefined, onResult: (r) => results.push(r), now: () => t });
  room.addPlayer("s0", "Bo");
  room.addPlayer("s1", "Cam");

  const eng = () => (room as unknown as { engine: any }).engine;
  const actors = () => eng().actors as Array<{ body: { getPosition(): { x: number; y: number } }; supports: Map<unknown, number> }>;
  const P = (i: number) => actors()[i].body.getPosition();
  const gr = (i: number) => actors()[i].supports.size > 0;

  const last: Record<number, string> = {};
  let q = 0;
  const key = (i: number, l: number, r: number, j: number) => {
    const sig = `${l}${r}${j}`;
    if (last[i] === sig) return; // chỉ gửi khi đổi, như bàn phím thật
    last[i] = sig;
    room.setInput(`s${i}`, { l, r, j, q: ++q });
  };

  function* wait(k: number): Gen {
    for (let n = 0; n < k; n++) yield;
  }
  function* walkTo(i: number, x: number, tol = 0.1): Gen {
    let n = 0;
    for (;;) {
      const d = x - P(i).x;
      if (Math.abs(d) < tol || n++ > 400) break;
      key(i, d < 0 ? 1 : 0, d > 0 ? 1 : 0, 0);
      yield;
    }
    key(i, 0, 0, 0);
  }
  function* leap(i: number, untilX: number): Gen {
    key(i, 0, 1, 1);
    yield;
    for (let n = 0; n < 150; n++) {
      key(i, 0, 1, 0);
      if (P(i).x >= untilX && gr(i)) break;
      yield;
    }
    key(i, 0, 0, 0);
  }
  function* runJump(i: number, takeoffX: number, untilX: number): Gen {
    for (let n = 0; n < 400 && P(i).x < takeoffX; n++) {
      key(i, 0, 1, 0);
      yield;
    }
    yield* leap(i, untilX);
  }
  function* par(...gs: Gen[]): Gen {
    const live = [...gs];
    while (live.length) {
      for (let k = live.length - 1; k >= 0; k--) if (live[k].next().done) live.splice(k, 1);
      yield;
    }
  }
  function* late(k: number, g: Gen): Gen {
    yield* wait(k);
    yield* g;
  }
  function* until(cond: () => boolean, max: number): Gen {
    for (let n = 0; n < max && !cond(); n++) yield;
  }

  function* script(): Gen {
    yield* wait(40);
    yield* par(runJump(0, 10.9, 13.6), late(14, runJump(1, 10.9, 13.6))); // hố cột 11-12
    yield* par(runJump(0, 21.2, 23.6), late(14, runJump(1, 21.2, 23.6))); // gai cột 22
    yield* par(walkTo(0, 26.2), walkTo(1, 25.0)); // chồng người: s0 làm đế
    yield* wait(20);
    key(1, 0, 1, 1);
    yield;
    key(1, 0, 1, 0);
    yield* until(() => P(1).y < P(0).y - 0.7 && gr(1), 90);
    yield* wait(6);
    yield* leap(1, 29.0); // lên bục chìa khóa
    yield* walkTo(1, 30.4);
    yield* wait(10);
    yield* par(walkTo(1, 35.0, 0.2), walkTo(0, 34.0, 0.2)); // vào cửa
    yield* par(walkTo(0, 35.8, 0.2), walkTo(1, 36.4, 0.2));
    yield* wait(60);
  }

  const g = script();
  let frames = 0;
  while (frames < 60 * 40 && results.length === 0) {
    g.next();
    t += 1000 / 60;
    room.step(1 / 60);
    frames++;
  }

  expect(results).toHaveLength(1);
  expect(results[0].levelId).toBe("t1");
  expect(results[0].seconds).toBeGreaterThan(3);
  expect(eng().snapshot().r).toBe(0); // 0 lần chết/restart

  for (let n = 0; n < 60 * 4; n++) {
    t += 1000 / 60;
    room.step(1 / 60);
  }
  expect(room.currentLevelId).toBe("t1"); // level luyện tập không tự sang level khác
});
```

## Bước 4 — Test phím R ở level cuối (nay là level 5)

**Tạo mới / thay toàn bộ** `src/room.test.ts` (151 dòng):

```ts
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

  it("phím R: ô không phải nhỏ nhất bị bỏ qua; ô nhỏ nhất ở level cuối → về Level 1", () => {
    const { room, run, engine } = setup("5"); // chương cuối
    room.addPlayer("s0", "Bo");
    room.addPlayer("s1", "Cam");
    run(0.5);
    engine().won = true;
    run(0.1);
    room.requestRestart("s1");
    expect(engine().won).toBe(true); // s1 không có quyền
    room.requestRestart("s0");
    expect(room.currentLevelId).toBe("1");
    expect(engine().won).toBe(false);
  });

  it("R khi chưa thắng không làm gì", () => {
    const { room, run } = setup("1");
    room.addPlayer("s0", "Bo");
    run(1);
    const t = decodeSnapshot(room.snapshotString())!.t;
    room.requestRestart("s0");
    expect(decodeSnapshot(room.snapshotString())!.t).toBeGreaterThanOrEqual(t);
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
```

### ✅ Kiểm tra

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

`tsc` sạch; `Tests  48 passed (48)`; build ra `dist/main.mjs`.

## Triển khai

Như `mln-server/docs/07-trien-khai.md`: kéo code mới lên server VN, `npm ci && npm run build`, `sudo systemctl restart mln-server`; web deploy Vercel như cũ.
**Triển khai server và web cùng lúc** — web mới đọc phần `o` của snapshot; server cũ không gửi thì web vẫn chạy nhưng không vẽ được vật thể.
