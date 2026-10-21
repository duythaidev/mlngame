import { describe, expect, it } from "vitest";
import { StateSender } from "./stateSender";

function fakeWrite() {
  const calls: string[] = [];
  let resolve: () => void = () => {};
  let reject: () => void = () => {};
  const write = (p: string) => {
    calls.push(p);
    return new Promise<void>((res, rej) => {
      resolve = res;
      reject = () => rej(new Error("x"));
    });
  };
  return { calls, write, ack: () => resolve(), fail: () => reject() };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("StateSender", () => {
  it("không gửi khi key không đổi trong thời gian ngắn hơn heartbeat", async () => {
    const f = fakeWrite();
    const s = new StateSender(f.write);
    s.offer("a", "k1", 0);
    f.ack();
    await flush();
    s.offer("b", "k1", 100);
    s.offer("c", "k1", 500);
    expect(f.calls).toEqual(["a"]);
  });
  it("gửi lại sau heartbeatMs dù không đổi", async () => {
    const f = fakeWrite();
    const s = new StateSender(f.write);
    s.offer("a", "k1", 0);
    f.ack();
    await flush();
    s.offer("b", "k1", 1000);
    expect(f.calls).toEqual(["a", "b"]);
  });
  it("maxInFlight=1: tối đa 1 ghi đang bay; chỉ giữ payload mới nhất", async () => {
    const f = fakeWrite();
    const s = new StateSender(f.write, { maxInFlight: 1 });
    s.offer("a", "k1", 0);
    s.offer("b", "k2", 40);
    s.offer("c", "k3", 80);
    expect(f.calls).toEqual(["a"]);
    f.ack();
    await flush();
    s.offer("d", "k4", 120);
    expect(f.calls).toEqual(["a", "d"]);
  });
  it("mặc định gửi gối đầu tối đa 3 ghi chưa ack (không bị khóa theo RTT)", () => {
    const f = fakeWrite();
    const s = new StateSender(f.write);
    for (let i = 0; i < 6; i++) s.offer(`p${i}`, `k${i}`, i * 40);
    expect(f.calls).toEqual(["p0", "p1", "p2"]);
  });
  it("tôn trọng minIntervalMs", async () => {
    const f = fakeWrite();
    const s = new StateSender(f.write, { minIntervalMs: 33 });
    s.offer("a", "k1", 0);
    f.ack();
    await flush();
    s.offer("b", "k2", 10);
    expect(f.calls).toEqual(["a"]);
    s.offer("c", "k3", 40);
    expect(f.calls).toEqual(["a", "c"]);
  });
  it("write bị reject vẫn mở khóa", async () => {
    const f = fakeWrite();
    const s = new StateSender(f.write, { maxInFlight: 1 });
    s.offer("a", "k1", 0);
    f.fail();
    await flush();
    s.offer("b", "k2", 50);
    expect(f.calls).toEqual(["a", "b"]);
  });
});
