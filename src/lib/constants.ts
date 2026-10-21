// src/lib/constants.ts
export const TILE = 32; // pixel / ô khi vẽ
export const VIEW_W = 800; // chiều rộng canvas (25 ô)
export const PLAYER_SIZE = 0.8; // kích thước hitbox nhân vật (ô)

import avatarSoldier from "../assets/avatar-soldier.jpg";
import avatarVolunteer from "../assets/avatar-volunteer.jpg";
import avatarBuilder from "../assets/avatar-builder.svg";
import avatarScholar from "../assets/avatar-scholar.svg";

export interface PresetAvatar {
  id: string;
  name: string;
  src: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: "soldier", name: "Chiến sĩ", src: avatarSoldier },
  { id: "volunteer", name: "Thanh niên", src: avatarVolunteer },
  { id: "builder", name: "Công nhân", src: avatarBuilder },
  { id: "scholar", name: "Sinh viên", src: avatarScholar },
];

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
  loseDelay: 1, // giây hiển thị "Thua" (đóng băng) trước khi restart cả nhóm
  winDelay: 3, // giây hiện "Hoàn thành" trước khi tự sang level kế
  step: 1 / 60, // bước vật lý cố định
  snapshotEvery: 3, // cứ 3 bước ghi 1 snapshot → 20Hz
} as const;
