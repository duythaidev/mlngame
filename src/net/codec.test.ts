import { describe, expect, it } from "vitest";
import { changeKey, decodeSnapshot, encodeSnapshot } from "./codec";
import type { Snapshot } from "../game/protocol";

const snap: Snapshot = {
  t: 2781,
  r: 1,
  k: 1,
  w: 0,
  d: 1,
  c: 0,
  lv: "2",
  p: { s0: [332, 1158], s1: [-15, 1159] },
  v: { s0: [500, -1300], s1: [0, 0] },
  j: { s0: 3, s1: 0 },
  a: { s0: 7, s1: 12 },
};

describe("codec v2", () => {
  it("round-trip giữ nguyên mọi trường", () => {
    expect(decodeSnapshot(encodeSnapshot(snap))).toEqual(snap);
  });
  it("chuỗi bắt đầu bằng v2| và ngắn hơn 100 byte cho 2 người", () => {
    const s = encodeSnapshot(snap);
    expect(s.startsWith("v2|")).toBe(true);
    expect(s.length).toBeLessThan(100);
  });
  it("không có người chơi vẫn mã hóa/giải mã được", () => {
    const empty = { ...snap, p: {}, v: {}, j: {}, a: {} };
    expect(decodeSnapshot(encodeSnapshot(empty))).toEqual(empty);
  });
  it("dữ liệu cũ hoặc hỏng trả null, không ném lỗi", () => {
    expect(decodeSnapshot(null)).toBeNull();
    expect(decodeSnapshot({ k: 0, p: {}, r: 0, t: 1, w: 0 })).toBeNull(); // định dạng JSON cũ
    expect(decodeSnapshot("v1|1|2")).toBeNull();
    expect(decodeSnapshot("v2|abc")).toBeNull();
  });
  it("changeKey bỏ qua t nhưng nhạy với d, j, vị trí", () => {
    expect(changeKey({ ...snap, t: 9999 })).toBe(changeKey(snap));
    expect(changeKey({ ...snap, d: 0 })).not.toBe(changeKey(snap));
    expect(changeKey({ ...snap, j: { s0: 4, s1: 0 } })).not.toBe(changeKey(snap));
    expect(changeKey({ ...snap, p: { ...snap.p, s0: [333, 1158] } })).not.toBe(changeKey(snap));
  });
  it("hỗ trợ cờ host ẩn tab h (bit 8)", () => {
    const withH: Snapshot = { ...snap, h: 1 };
    expect(decodeSnapshot(encodeSnapshot(withH))?.h).toBe(1);
    expect(changeKey(withH)).not.toBe(changeKey(snap));
  });
});
