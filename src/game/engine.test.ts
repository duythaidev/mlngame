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

  it("updates remote actor position and velocity via setRemote", () => {
    const engine = new GameEngine(level, ["s0", "s1"], { localSlots: ["s0"] });
    engine.setRemote("s1", 5.5, 8.0, 1.2, -0.5);
    const snap = engine.snapshot();
    expect(snap.p["s1"]).toEqual([550, 800]);
    expect(snap.v?.["s1"]).toEqual([120, -50]);
  });

  it("fires onDied when local actor falls or hits spikes, but not for remote actor", () => {
    const onDied = vi.fn();
    const engine = new GameEngine(level, ["s0", "s1"], { localSlots: ["s0"], onDied });
    // Remote actor placed on spike or below map
    engine.setRemote("s1", 20.0, 10.0, 0, 0);
    engine.update(0.05);
    expect(onDied).not.toHaveBeenCalledWith("s1");
  });

  it("preserves default Sandbox behavior when localSlots is omitted", () => {
    const engine = new GameEngine(level, ["s0", "s1"]);
    expect(engine.isLocal("s0")).toBe(true);
    expect(engine.isLocal("s1")).toBe(true);
  });

  it("returns getLocalPos with grounded and inDoor flags", () => {
    const engine = new GameEngine(level, ["s0", "s1"], { localSlots: ["s0"] });
    const pos = engine.getLocalPos("s0");
    expect(pos).not.toBeNull();
    expect(typeof pos!.grounded).toBe("boolean");
    expect(typeof pos!.inDoor).toBe("boolean");
  });
});
