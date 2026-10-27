// src/game/objects.ts
// Dùng chung cho engine (server) và client: vật nào đang bật theo số người, cần bao nhiêu cho một tín hiệu,
// và chuỗi trạng thái vật thể gửi trong snapshot.
import type { Level, ObjDef } from "./level";

/** Trạng thái vật thể ở một thời điểm (giải mã từ snapshot.o). */
export interface ObjView {
  cp: number; // cột mốc hồi sinh đã tới (level.checkpoints)
  bits: string; // "0"/"1": [nút đang bấm / khối đã vào đích / sàn sụp đang ẩn theo level.bitOf] + [từng tín hiệu theo level.sigNames]
  bodies: [number, number][]; // góc trên-trái (ô) của thang/sàn chở/khối/khối đỏ theo level.bodyOf
  carry: string; // mỗi vật mang 1 ký tự theo level.carryOf: "." ở chỗ cũ · "d" đã nộp · "0".."4" đang trên đầu người thứ k
  angles: number[]; // góc bập bênh (radian) theo level.angleOf
  crumbles?: number[]; // thời gian còn lại (giây) của từng sàn sụp theo level.crumbleOf
}

/** Vật có tồn tại với n người không: vật "perPlayer" thứ k chỉ bật khi k < n. */
export function isActive(o: ObjDef, n: number): boolean {
  const per = (o.spec.t === "pad" || o.spec.t === "carry") && o.spec.perPlayer;
  return !per || o.k < n;
}

/** Tín hiệu mà vật làm "nguồn": nút, khối (vào đích), vật mang (đã nộp). */
export function sourceSig(o: ObjDef): string | null {
  const s = o.spec;
  if (s.t === "pad") return s.sig;
  if (s.t === "box") return s.sig ?? null;
  if (s.t === "carry") return s.to;
  return null;
}

export function sigSources(level: Level, sig: string, n: number): ObjDef[] {
  return level.objects.filter((o) => sourceSig(o) === sig && isActive(o, n));
}

/** Số nguồn cần bật để tín hiệu bật. */
export function sigNeed(level: Level, sig: string, n: number): number {
  const total = sigSources(level, sig, n).length;
  const need = level.sigs[sig]?.need ?? "all";
  return need === "all" ? total : Math.min(need, total);
}

/** Số người cần cho thang / bục số / sàn chở / khối số. */
export function crowdNeed(need: number | "all" | undefined, n: number): number {
  return need === undefined || need === "all" ? n : Math.min(need, n);
}

/** Số nút gắn trên sàn chở có `pads` (mỗi người một nút, tối đa 5). */
export function moverPadCount(n: number): number {
  return Math.max(1, Math.min(5, n));
}

export function encodeObjView(v: ObjView): string {
  const bodies = v.bodies.map(([x, y]) => `${Math.round(x * 100)},${Math.round(y * 100)}`).join(";");
  const angles = v.angles.map((a) => Math.round(a * 1000)).join(",");
  const crumbles = v.crumbles ? v.crumbles.map((c) => Math.round(c * 10)).join(",") : "";
  return `${v.cp}~${v.bits}~${bodies}~${v.carry}~${angles}~${crumbles}`;
}

export function decodeObjView(raw: string | undefined): ObjView | null {
  if (!raw) return null;
  const [cp, bits, bodies, carry = "", angles = "", crumbles = ""] = raw.split("~");
  if (bits === undefined || bodies === undefined || !/^[01]*$/.test(bits) || !/^[.d0-9]*$/.test(carry)) return null;
  const list: [number, number][] = [];
  for (const t of bodies ? bodies.split(";") : []) {
    const [x, y] = t.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    list.push([x / 100, y / 100]);
  }
  const ang = angles ? angles.split(",").map((a) => Number(a) / 1000) : [];
  if (ang.some((a) => !Number.isFinite(a))) return null;
  const crum = crumbles ? crumbles.split(",").map((c) => Number(c) / 10) : [];
  if (crum.some((c) => !Number.isFinite(c))) return null;
  const c = Number(cp);
  return Number.isInteger(c) ? { cp: c, bits, bodies: list, carry, angles: ang, crumbles: crum } : null;
}

export function objBit(level: Level, v: ObjView | null, o: ObjDef): boolean {
  const i = level.bitOf[o.id];
  return !!v && i >= 0 && v.bits[i] === "1";
}

export function sigBit(level: Level, v: ObjView | null, sig: string): boolean {
  const i = level.sigNames.indexOf(sig);
  return !!v && i >= 0 && v.bits[level.bitCount + i] === "1";
}

/** Vật mang đang ở đâu: "home" · "done" (đã nộp) · số = chỉ số người đang mang (trong các ô đã sắp xếp). */
export function carryState(level: Level, v: ObjView | null, o: ObjDef): "home" | "done" | number {
  const i = level.carryOf[o.id];
  const c = v && i >= 0 ? v.carry[i] : ".";
  if (c === "d") return "done";
  if (c === undefined || c === ".") return "home";
  return Number(c);
}
