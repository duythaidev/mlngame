// src/net/gameSync.ts
import { get, ref, runTransaction } from "firebase/database";
import { db } from "../lib/firebase";
import { reduceGame, type GameEvent, type GameState } from "./gameState";

let cachedOffset = 0;
let offsetInitialized = false;

export async function initServerTimeOffset(): Promise<number> {
  if (offsetInitialized) return cachedOffset;
  try {
    const snap = await get(ref(db, ".info/serverTimeOffset"));
    cachedOffset = (snap.val() as number) ?? 0;
    offsetInitialized = true;
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
