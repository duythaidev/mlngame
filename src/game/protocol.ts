// src/game/protocol.ts
export interface InputState {
  l: 0 | 1; // trái
  r: 0 | 1; // phải
  j: 0 | 1; // nhảy
}

export const EMPTY_INPUT: InputState = { l: 0, r: 0, j: 0 };

export interface Snapshot {
  t: number; // số bước vật lý đã chạy
  r: number; // số lần reset (client dùng để "dịch chuyển" thay vì nội suy)
  k: 0 | 1; // đã có chìa khóa
  w: 0 | 1; // đã thắng
  p: Record<string, [number, number]>; // slot -> [x*100, y*100] (đơn vị ô)
}
