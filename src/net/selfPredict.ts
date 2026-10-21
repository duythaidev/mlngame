// src/net/selfPredict.ts
// Dự đoán vị trí hiển thị cho nhân vật CỦA CHÍNH MÌNH (client không phải host).
// Snapshot của host luôn trễ ~1 vòng mạng so với phím mình vừa bấm, nên vẽ nhân vật mình
// ở chỗ host *sẽ* đặt nó khi nhận được input: snapshot + vận tốc mình đang bấm × độ trễ ước tính.
import { PHYS, PLAYER_SIZE } from "../lib/constants";
import type { Level } from "../game/level";
import type { InputState } from "../game/protocol";

export interface SelfPredictArgs {
  pos: [number, number]; // vị trí trong snapshot (ô)
  vel: [number, number]; // vận tốc trong snapshot (ô/s)
  input: InputState; // phím mình đang giữ
  jumpPending: boolean; // vừa bấm nhảy mà host chưa xác nhận
  lookahead: number; // giây cần nhìn trước = tuổi snapshot + độ trễ input ước tính
  level: Level;
}

const MAX_LOOKAHEAD = 0.25; // không đoán xa hơn 0.25 s để sai số nhỏ
const GROUNDED_VY = 0.5; // |vy| nhỏ hơn mức này coi như đang đứng trên mặt phẳng

function hitsSolid(level: Level, x: number, y: number): boolean {
  const h = PLAYER_SIZE / 2 - 0.02;
  return level.solids.some((r) => x + h > r.x && x - h < r.x + r.w && y + h > r.y && y - h < r.y + r.h);
}

export function predictSelf(a: SelfPredictArgs): [number, number] {
  const L = Math.max(0, Math.min(a.lookahead, MAX_LOOKAHEAD));
  const grounded = Math.abs(a.vel[1]) < GROUNDED_VY;
  const pressing = a.input.l !== a.input.r;

  // ngang: trên mặt đất phản hồi ngay theo phím (bấm = chạy đều, thả = dừng); trên không giữ quán tính của snapshot
  const vx = grounded ? (pressing ? (a.input.r - a.input.l) * PHYS.speed : 0) : a.vel[0];
  let x = a.pos[0] + vx * L;
  if (hitsSolid(a.level, x, a.pos[1])) x = a.pos[0]; // không đoán xuyên tường

  // dọc: vừa bấm nhảy khi đang đứng → vẽ cú nhảy luôn; còn lại ngoại suy ngắn như người khác
  let y: number;
  if (a.jumpPending && grounded) {
    y = Math.min(a.pos[1], a.pos[1] - PHYS.jump * L + 0.5 * PHYS.gravity * L * L);
  } else {
    y = a.pos[1] + a.vel[1] * Math.min(L, 0.12);
  }
  if (hitsSolid(a.level, x, y)) y = a.pos[1];
  return [x, y];
}
