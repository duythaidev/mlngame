// src/net/codec.test.ts
import { describe, expect, it } from "vitest";
import { changeKey, decodeSnapshot, encodeSnapshot } from "./codec";
import type { Snapshot } from "../game/protocol";

describe("codec v2", () => {
  const sample: Snapshot = {
    t: 120,
    r: 2,
    k: 1,
    w: 0,
    d: 0,
    c: -1,
    lv: "1",
    j: { s0: 5, s1: 3 },
    p: { s0: [100, 200], s1: [300, 400] },
    v: { s0: [10, -20], s1: [0, 5] },
    a: { s0: 12, s1: 14 },
  };

  it("round-trip encode/decode chính xác", () => {
    const raw = encodeSnapshot(sample);
    expect(raw.startsWith("v2|")).toBe(true);
    const decoded = decodeSnapshot(raw);
    expect(decoded).toEqual(sample);
  });

  it("chứa flag ẩn tab (h)", () => {
    const withHidden: Snapshot = { ...sample, h: 1 };
    const raw = encodeSnapshot(withHidden);
    const decoded = decodeSnapshot(raw);
    expect(decoded?.h).toBe(1);
  });

  it("changeKey bỏ qua t (tick)", () => {
    const k1 = changeKey(sample);
    const k2 = changeKey({ ...sample, t: 999 });
    expect(k1).toBe(k2);
  });

  it("từ chối chuỗi hỏng hoặc phiên bản cũ", () => {
    expect(decodeSnapshot(null)).toBeNull();
    expect(decodeSnapshot("v1|123")).toBeNull();
    expect(decodeSnapshot("v2|abc|def")).toBeNull();
  });
});
