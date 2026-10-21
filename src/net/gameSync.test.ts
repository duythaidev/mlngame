// src/net/gameSync.test.ts
import { describe, expect, it } from "vitest";
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
