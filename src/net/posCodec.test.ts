// src/net/posCodec.test.ts
import { describe, expect, it } from "vitest";
import { decodePos, encodePos, changeKeyPos, POS_FLAG } from "./posCodec";

describe("posCodec", () => {
  const sample = {
    ms: 12345,
    epoch: 2,
    x: 450,
    y: 1120,
    vx: 180,
    vy: -20,
    flags: POS_FLAG.GROUNDED | POS_FLAG.IN_DOOR,
  };

  it("encodes and decodes round-trip accurately", () => {
    const encoded = encodePos(sample);
    expect(encoded.startsWith("v3|")).toBe(true);
    expect(encoded.length).toBeLessThan(120);

    const decoded = decodePos(encoded);
    expect(decoded).toEqual(sample);
  });

  it("rejects invalid or corrupted inputs", () => {
    expect(decodePos(null)).toBeNull();
    expect(decodePos("v2|1|2|3")).toBeNull();
    expect(decodePos("v3|invalid|epoch|x")).toBeNull();
    expect(decodePos("")).toBeNull();
  });

  it("generates changeKey without ms timestamp", () => {
    const k1 = changeKeyPos(sample);
    const k2 = changeKeyPos({ ...sample, ms: 99999 });
    expect(k1).toBe(k2);
    const k3 = changeKeyPos({ ...sample, x: 451 });
    expect(k1).not.toBe(k3);
  });
});
