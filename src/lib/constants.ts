// src/lib/constants.ts
export const TILE = 32; // pixel / ô khi vẽ
export const VIEW_W = 800; // chiều rộng canvas (25 ô)
export const PLAYER_SIZE = 0.8; // kích thước hitbox nhân vật (ô)

// Màu theo ô: đỏ cờ, xanh dương, xanh lá, cam, tím, vàng sao, hồng, ngà
export const SLOT_COLORS = [
  "#D32F2F", "#1976D2", "#388E3C", "#F57C00",
  "#7B1FA2", "#FBC02D", "#E91E63", "#455A64",
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
  iceGrip: 0.12, // bám trên sàn băng (thay cho grip): tăng tốc/phanh chậm → trượt khoảng 2 ô
  slowSpeed: 0.35, // trong vùng chậm: tốc độ chạy × 0.35
  slowJump: 0.7, // trong vùng chậm: vận tốc nhảy × 0.7 (cao chỉ còn ~0.8 ô)
  liftSpeed: 2, // tốc độ thang nâng (ô/s)
  moverSpeed: 2.5, // tốc độ sàn chở (ô/s)
  stopWait: 4, // sàn chở dừng ở mỗi trạm (giây)
  moverStartDelay: 0.6, // đủ người đứng trên sàn chở liên tục chừng này giây thì sàn mới chạy
  boxSpeed: 1.5, // tốc độ khối số khi đủ người đẩy (ô/s)
  boxGlide: 1, // khối trên băng: chậm dần chừng này ô/s mỗi giây sau khi thôi đẩy
  boxGravity: 30, // khối số rơi: gia tốc (ô/s²)
  boxMaxFall: 12, // khối số rơi: tốc độ tối đa (ô/s)
  boxRespawn: 2, // khối rơi sâu quá 2,5 ô: sau chừng này giây về chỗ cũ
  crumbleStand: 2.7, // sàn sụp: đứng liên tục chừng này giây thì bắt đầu rung (tổng 2.7 + 0.3 = 3s)
  crumbleShake: 0.3, // sàn sụp: rung chừng này giây rồi biến mất
  crumbleBack: 3, // sàn sụp: biến mất chừng này giây rồi hiện lại
  seesawThick: 0.4, // bập bênh: độ dày tấm (ô)
  seesawDensity: 0.5, // bập bênh: mật độ tấm (người = 1)
  seesawDamping: 3, // bập bênh: giảm chấn quay (không lắc mãi)
  seesawLimit: 0.436, // bập bênh: góc nghiêng tối đa (rad, ≈ 25°)
  seesawSlip: 0.24, // bập bênh lệch hơn ≈ 14°: bám như băng
  seesawSlide: 0.35, // bập bênh lệch hơn ≈ 20°: không bám, trượt hẳn
  seesawSpring: 530, // bập bênh: lò xo ở trục (mô-men / rad) — 1 người ở mép tấm chỉ nghiêng ≈ 12°
  seesawSpringDamp: 40, // bập bênh: giảm chấn của lò xo
  loseDelay: 1, // giây hiển thị "Thua" (đóng băng) trước khi restart cả nhóm
  winDelay: 3, // giây hiện "Hoàn thành" trước khi tự sang level kế
  step: 1 / 60, // bước vật lý cố định
  snapshotEvery: 3, // cứ 3 bước ghi 1 snapshot → 20Hz
} as const;
