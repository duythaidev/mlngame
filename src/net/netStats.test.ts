import { describe, expect, it } from "vitest";
import { NetStats } from "./netStats";

describe("NetStats", () => {
  it("đo trễ từ lúc gửi seq tới lúc host xác nhận seq đó", () => {
    const s = new NetStats();
    s.markSent(1, 1000);
    s.markSent(2, 1100);
    s.markAcked(2, 1250); // ack seq 2 cũng ack luôn seq 1
    const r = s.summary(1300);
    expect(r.p50).toBeGreaterThanOrEqual(150);
    expect(r.p95).toBe(250);
  });
  it("đếm message mỗi giây trên cửa sổ trượt 1 s", () => {
    const s = new NetStats();
    for (let i = 0; i < 30; i++) s.countSend();
    expect(s.summary(performance.now()).sendPerSec).toBe(30);
  });
});
