// src/lib/constants.ts
export const TILE = 32; // pixel / ô khi vẽ
export const VIEW_W = 800; // chiều rộng canvas (25 ô)
export const PLAYER_SIZE = 0.8; // kích thước hitbox nhân vật (ô)

// Màu theo ô (lấy cảm hứng từ ảnh bìa): tím, cam, vàng, xanh dương, đỏ, xanh lá, hồng, trắng
export const SLOT_COLORS = [
  "#b388f0", "#ffa06b", "#fff27a", "#6ab4ff",
  "#ff7a7a", "#8ef09a", "#ff9be6", "#e8e8e8",
];

export const PHYS = {
  gravity: 30, // ô/s²
  speed: 6, // tốc độ chạy tối đa (ô/s)
  grip: 1.6, // lực chân tối đa = grip × lực ép xuống đất. >1 để 1 người kéo được 1 người treo
  airControl: 0.5, // lực lái trên không khi TỰ nhảy (× trọng lượng): đổi hướng dần, không tức thì
  swingControl: 0.15, // lực đu khi rơi/bị treo dây (× trọng lượng): chỉ đu nhẹ như con lắc
  jump: 13, // vận tốc nhảy (ô/s) → cao ~2.8 ô
  ropeRest: 3, // chiều dài dây (ô): dây thẳng nối tâm, xuyên địa hình; ngắn hơn thì chùng
  ropeBias: 0.25, // tốc độ kéo dây về đúng chiều dài khi bị giãn (càng nhỏ dây càng "đàn hồi")
  ropeIters: 4, // số vòng giải ràng buộc dây mỗi bước (chuỗi dài cần nhiều hơn)
  step: 1 / 60, // bước vật lý cố định
  snapshotEvery: 3, // cứ 3 bước ghi 1 snapshot → 20Hz
} as const;
