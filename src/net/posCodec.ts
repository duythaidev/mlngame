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
