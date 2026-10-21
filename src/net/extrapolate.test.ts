import { describe, expect, it } from "vitest";
import { extrapolate } from "./extrapolate";

describe("extrapolate", () => {
  it("ngoại suy tuyến tính theo tuổi snapshot", () => {
    expect(extrapolate([10, 5], [5, -10], 0.05)).toEqual([10.25, 4.5]);
  });

  it("không ngoại suy quá maxSec", () => {
    expect(extrapolate([10, 5], [5, 0], 1)).toEqual([10.6, 5]);
  });

  it("tuổi âm (đồng hồ lệch) coi như 0", () => {
    expect(extrapolate([1, 1], [5, 5], -0.2)).toEqual([1, 1]);
  });
});
