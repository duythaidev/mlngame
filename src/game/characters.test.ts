// src/game/characters.test.ts
import { describe, expect, it } from "vitest";
import { colorOf, MotionTracker, roleOf, ROLES, SPRITE_H, SPRITE_W, spriteRows, type Pose } from "./characters";

describe("sprite", () => {
  for (const r of ROLES)
    for (const [pose, frame] of [["idle", 0], ["walk", 0], ["walk", 1]] as [Pose, number][])
      it(`${r.id} ${pose} ${frame}: lưới đúng cỡ, mọi ký tự có màu`, () => {
        const rows = spriteRows(r.id, pose, frame);
        expect(rows).toHaveLength(SPRITE_H);
        for (const row of rows) {
          expect(row).toHaveLength(SPRITE_W);
          for (const ch of row) if (ch !== ".") expect(colorOf(r.id, ch), `${r.id} thiếu màu "${ch}"`).not.toBeNull();
        }
      });

  it("đi khác đứng yên ở phần chân", () => {
    expect(spriteRows("soldier", "walk", 0).slice(-3)).not.toEqual(spriteRows("soldier", "idle", 0).slice(-3));
  });
});

it("vai theo avatar đã lưu", () => {
  expect(roleOf("builder")).toBe("builder");
  expect(roleOf("/src/assets/avatar-scholar.svg")).toBe("scholar");
  expect(roleOf(null, "s1")).toBe("volunteer");
  expect(roleOf("data:image/webp;base64,xx", "s4")).toBe("soldier");
});

describe("tư thế", () => {
  it("đứng yên → đi phải → đi trái → dừng", () => {
    const m = new MotionTracker();
    expect(m.update("s0", 5, 1 / 60).pose).toBe("idle");
    let s = m.update("s0", 5.05, 1 / 60);
    expect([s.pose, s.face]).toEqual(["walk", 1]);
    s = m.update("s0", 5.0, 1 / 60);
    expect([s.pose, s.face]).toEqual(["walk", -1]);
    for (let i = 0; i < 10; i++) s = m.update("s0", 5.0, 1 / 60);
    expect([s.pose, s.face]).toEqual(["idle", -1]); // giữ hướng cuối
  });

  it("khung chân đổi theo quãng đường", () => {
    const m = new MotionTracker();
    m.update("s0", 0, 0.016);
    const frames = new Set<number>();
    for (let i = 1; i <= 20; i++) frames.add(m.update("s0", i * 0.05, 0.016).frame);
    expect(frames).toEqual(new Set([0, 1]));
  });

  it("hồi sinh (nhảy vị trí xa) không tính là đi", () => {
    const m = new MotionTracker();
    m.update("s0", 50, 0.016);
    expect(m.update("s0", 10, 0.016).pose).toBe("idle");
  });
});
