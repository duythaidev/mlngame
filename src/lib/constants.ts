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
  gravity: 50, // ô/s²
  speed: 5, // tốc độ chạy tối đa (ô/s)
  grip: 5, // lực chân khi BẤM chạy = grip × lực ép xuống đất. >1 để 1 người kéo được 1 người treo
  idleBrake: 12, // phanh khi đứng yên (1/s): trượt 3 ô/s dừng trong ~0.25 ô; bị kéo liên tục thì vẫn bị lôi đi từ từ
  airControl: 0.5, // lực lái trên không khi TỰ nhảy (× trọng lượng): đổi hướng dần, không tức thì
  swingControl: 0.15, // lực đu khi rơi/bị treo dây (× trọng lượng): chỉ đu nhẹ như con lắc
  jump: 13, // vận tốc nhảy (ô/s) → cao ≈ jump²/(2·gravity) ≈ 1.7 ô
  ropeRest: 4, // chiều dài dây (ô): dây thẳng nối tâm, xuyên địa hình; ngắn hơn thì chùng
  ropeBias: 0.5, // tốc độ kéo dây về đúng chiều dài khi bị giãn (càng nhỏ dây càng "đàn hồi")
  ropeMaxTension: 1.6, // lực căng tối đa của dây (× trọng lượng 1 người): vượt thì dây giãn nhẹ thay vì giật
  ropeMaxStretch: 0.25, // dây giãn tối đa (ô) khi chịu lực quá trần; vượt mức này dây cứng hẳn
  ropeLiftSpeed: 5, // tốc độ tối đa dây kéo một người đang lơ lửng đi lên (ô/s)
  stepUp: 0.5, // người bị dây kéo vào vách tự bước qua mép nếu mép cao hơn chân tối đa chừng này (ô)
  ropeSlop: 0.03, // dây giãn tới mức này mới bắt đầu kéo về (tránh rung/nảy khi tì vào tường)
  ropeIters: 4, // số vòng giải ràng buộc dây mỗi bước (chuỗi dài cần nhiều hơn)
  step: 1 / 60, // bước vật lý cố định
  snapshotEvery: 3, // cứ 3 bước ghi 1 snapshot → 20Hz
} as const;
