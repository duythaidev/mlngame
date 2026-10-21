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
  d: 0 | 1; // đang trong 1 giây "Thua" (vật lý đóng băng)
  c: number; // chỉ số (trong các ô đã sắp xếp) của người gây ra thua; -1 = không có
  lv: string; // id level đang chơi (host quyết định, client vẽ theo)
  j: Record<string, number>; // slot -> số lần nhảy thật sự đã thực hiện (client phát tiếng nhảy khi số này tăng)
  p: Record<string, [number, number]>; // slot -> [x*100, y*100] (đơn vị ô)
  a?: Record<string, number>; // seq input cuối cùng host đã áp dụng cho từng slot
  v?: Record<string, [number, number]>; // vận tốc slot [vx*100, vy*100]
  h?: 0 | 1; // host đang ẩn tab
}
