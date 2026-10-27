// src/net/codec.ts
import type { Snapshot } from "../game/protocol";

export const WIRE_VERSION = "v2";

export function encodeSnapshot(s: Snapshot): string {
  const flags = (s.k ? 1 : 0) | (s.w ? 2 : 0) | (s.d ? 4 : 0) | (s.h ? 8 : 0);
  const slots = Object.keys(s.p ?? {}).sort();
  const pParts = slots.map((slot) => {
    const pos = s.p[slot] ?? [0, 0];
    const vel = s.v?.[slot] ?? [0, 0];
    const j = s.j?.[slot] ?? 0;
    const a = s.a?.[slot] ?? 0;
    return `${slot},${pos[0]},${pos[1]},${vel[0]},${vel[1]},${j},${a}`;
  });
  const base = `${WIRE_VERSION}|${s.t}|${s.r}|${flags}|${s.c}|${s.lv}|${pParts.join(";")}`;
  return s.o ? `${base}|${s.o}` : base; // phần thứ 8 (trạng thái vật thể) có thể không có
}

export function decodeSnapshot(raw: unknown): Snapshot | null {
  if (typeof raw !== "string") return null;
  if (!raw.startsWith(`${WIRE_VERSION}|`)) return null;

  const parts = raw.split("|");
  if (parts.length < 7) return null;

  const t = Number(parts[1]);
  const r = Number(parts[2]);
  const flags = Number(parts[3]);
  const c = Number(parts[4]);
  const lv = parts[5];
  const playersStr = parts[6];

  if (
    !Number.isFinite(t) ||
    !Number.isFinite(r) ||
    !Number.isFinite(flags) ||
    !Number.isFinite(c) ||
    !lv
  ) {
    return null;
  }

  const p: Record<string, [number, number]> = {};
  const v: Record<string, [number, number]> = {};
  const j: Record<string, number> = {};
  const a: Record<string, number> = {};

  if (playersStr && playersStr.trim().length > 0) {
    const playerTokens = playersStr.split(";");
    for (const token of playerTokens) {
      if (!token) continue;
      const sub = token.split(",");
      if (sub.length < 7) return null;
      const slot = sub[0];
      const px = Number(sub[1]);
      const py = Number(sub[2]);
      const vx = Number(sub[3]);
      const vy = Number(sub[4]);
      const jVal = Number(sub[5]);
      const aVal = Number(sub[6]);

      if (
        !slot ||
        !Number.isFinite(px) ||
        !Number.isFinite(py) ||
        !Number.isFinite(vx) ||
        !Number.isFinite(vy) ||
        !Number.isFinite(jVal) ||
        !Number.isFinite(aVal)
      ) {
        return null;
      }

      p[slot] = [px, py];
      v[slot] = [vx, vy];
      j[slot] = jVal;
      a[slot] = aVal;
    }
  }

  const res: Snapshot = {
    t,
    r,
    k: (flags & 1) ? 1 : 0,
    w: (flags & 2) ? 1 : 0,
    d: (flags & 4) ? 1 : 0,
    c,
    lv,
    p,
    v,
    j,
    a,
  };

  if ((flags & 8) !== 0) {
    res.h = 1;
  }
  if (parts[7]) res.o = parts[7];

  return res;
}

export function changeKey(s: Snapshot): string {
  const flags = (s.k ? 1 : 0) | (s.w ? 2 : 0) | (s.d ? 4 : 0) | (s.h ? 8 : 0);
  const slots = Object.keys(s.p ?? {}).sort();
  const pParts = slots.map((slot) => {
    const pos = s.p[slot] ?? [0, 0];
    const vel = s.v?.[slot] ?? [0, 0];
    const j = s.j?.[slot] ?? 0;
    const a = s.a?.[slot] ?? 0;
    return `${slot}:${pos[0]},${pos[1]},${vel[0]},${vel[1]},${j},${a}`;
  });
  return `${s.r}|${flags}|${s.c}|${s.lv}|${pParts.join(";")}|${s.o ?? ""}`;
}
