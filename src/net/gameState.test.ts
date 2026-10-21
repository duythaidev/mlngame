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
