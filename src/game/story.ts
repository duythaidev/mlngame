// src/game/story.ts
// TOÀN BỘ chữ hiển thị trong 5 level. Nhóm soát và sửa ở file này.
// Quy tắc: mỗi đoạn MỘT dòng ý chính (≤ 90 ký tự, có năm hoặc nguồn ngắn); nhãn ≤ 4 từ; không chữ hướng dẫn cách chơi.

export interface LevelStory {
  lines: string[]; // dòng chữ của từng đoạn (theo thứ tự trong levelData.ts); "" = đoạn không có chữ
}

/** Nhãn trên vật thể (khóa dùng trong scripts/levels/chapters.py). */
const LABELS: Record<string, string> = {
  homphieu: "Hòm phiếu",
  khungchu: "Khung chữ",
  lapphap: "Lập pháp",
  hanhphap: "Hành pháp",
  tuphap: "Tư pháp",
  du3nut: "Cần đủ 3 nút",
  ranhgioi: "Ranh giới Hiến pháp & pháp luật",
  kiemsoat: "Kiểm soát quyền lực",
  dich: "Đích",
  baibo: "Bãi bỏ",
  thutuc: "Thủ tục phiền hà",
  // mảnh chữ
  banchat: "bản chất",
  muctieu: "mục tiêu",
  dongluc: "động lực",
  cuadan: "của dân",
  dodan: "do dân",
  vidan: "vì dân",
};

export const STORY: Record<string, LevelStory> = {
  "1": {
    lines: [
      "1919 — \"Trăm điều phải có thần linh pháp quyền\" (Việt Nam yêu cầu ca).",
      "02/9/1945 — Tuyên ngôn Độc lập, khai sinh nước Việt Nam Dân chủ Cộng hòa.",
      "06/01/1946 — Tổng tuyển cử bầu Quốc hội đầu tiên.",
      "\"Hễ là công dân thì đều có quyền đi bầu cử.\" — Hồ Chí Minh",
      "",
      "11/1946 — Quốc hội thông qua Hiến pháp đầu tiên.",
      "",
      "",
    ],
  },
  "2": {
    lines: [
      "1976 — Nước Cộng hòa xã hội chủ nghĩa Việt Nam.",
      "Trước 1986, việc gắn dân chủ với pháp luật chưa được đặt ra cụ thể. (giáo trình)",
      "",
      "",
      "12/1986 — Đại hội VI khởi xướng Đổi mới: \"lấy dân làm gốc\".",
      "Dân chủ: bản chất, mục tiêu, động lực của sự phát triển. (giáo trình)",
      "",
      "",
    ],
  },
  "3": {
    lines: [
      "06/1991 — Cương lĩnh: Nhà nước quản lý xã hội bằng pháp luật.",
      "29/11/1991 — Lần đầu nêu khái niệm \"Nhà nước pháp quyền xã hội chủ nghĩa\".",
      "1992 — Hiến pháp: Điều 4 và Điều 12.",
      "01/1994 — \"Nhà nước pháp quyền thực sự của dân, do dân và vì dân\".",
      "",
      "01/1995 — Quan điểm Nhà nước pháp quyền được trình bày đầy đủ hơn.",
      "",
      "",
    ],
  },
  "4": {
    lines: [
      "12/2001 — Hiến định thuật ngữ \"Nhà nước pháp quyền xã hội chủ nghĩa\".",
      "2011 — Quyền lực nhà nước thống nhất, có phân công, phối hợp, kiểm soát.",
      "2013 — Hiến pháp, Điều 4: hoạt động trong khuôn khổ Hiến pháp và pháp luật.",
      "",
      "Hiến pháp 2013 — Điều 2 và Điều 8.",
      "Kiểm soát quyền lực: không có vùng cấm.",
      "2021 — Đại hội XIII · 09/11/2022 — Nghị quyết 27-NQ/TW.",
      "",
    ],
  },
  "5": {
    lines: [
      "Quyền lãnh đạo được Hiến pháp ghi nhận (Điều 4).",
      "…kèm nghĩa vụ hoạt động trong khuôn khổ Hiến pháp và pháp luật.",
      "Quyền lực được phân công, phối hợp, kiểm soát.",
      "Thủ tục hành chính gây phiền hà phải được bãi bỏ. (giáo trình)",
      "Vẫn phải tiếp tục hoàn thiện cơ chế kiểm soát quyền lực (Nghị quyết 27-NQ/TW).",
      "",
    ],
  },
};

/** Màn kết sau level 5. */
export const ENDING = {
  question: "Vai trò lãnh đạo của Đảng có mâu thuẫn với nguyên tắc pháp quyền?",
  answer: "Không mâu thuẫn",
  points: [
    "Sự lãnh đạo của Đảng được Hiến pháp ghi nhận, kèm nghĩa vụ hoạt động trong khuôn khổ Hiến pháp và pháp luật.",
    "Nguyên tắc pháp quyền giúp sự lãnh đạo không lạm quyền, không làm thay Nhà nước.",
    "Còn phải tiếp tục hoàn thiện cơ chế kiểm soát quyền lực (Nghị quyết 27-NQ/TW).",
  ],
};

/** Nhãn của một khóa; không có thì trả lại nguyên khóa. */
export function label(key: string): string {
  return LABELS[key] ?? key;
}

/** Dòng chữ của đoạn `seg` trong level (rỗng nếu không có). */
export function segmentLine(levelId: string, seg: number): string {
  return STORY[levelId]?.lines[seg] ?? "";
}
