// src/game/story.ts
// TOÀN BỘ chữ hiển thị trong 5 level. Nhóm soát và sửa ở file này.
// Quy tắc (spec bản 5): mỗi phần = năm/nhãn ngắn (≤ 10 ký tự) + cụm ≤ 6 từ + 1 dòng ≤ 70 ký tự + nguồn ngắn.
// Ảnh: public/art/l{level}p{phần}.webp. scene = hình vẽ code dự phòng khi ảnh chưa tải (LinocutSceneSVG).

export type Scene = "scroll" | "flag" | "podium" | "ballot" | "constitution" | "gears" | "scale" | "arch" | "birds" | "sun";

export interface Part {
  year: string; // to trên cổng mốc, khung tư liệu, tem
  phrase: string; // cụm ≤ 6 từ
  line: string; // 1 dòng ≤ 70 ký tự
  source: string; // nguồn ngắn, "" nếu không có
  scene: Scene;
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

/** 5 phần của mỗi level, đúng thứ tự `parts` trong levelData.ts. */
export const PARTS: Record<string, Part[]> = {
  "1": [
    { year: "1919", phrase: "Thần linh pháp quyền", line: "\"Trăm điều phải có thần linh pháp quyền.\"", source: "Việt Nam yêu cầu ca, 1919", scene: "scroll" },
    { year: "02/9/1945", phrase: "Tuyên ngôn Độc lập", line: "Khai sinh nước Việt Nam Dân chủ Cộng hòa.", source: "Tuyên ngôn Độc lập", scene: "flag" },
    { year: "06/01/1946", phrase: "Tổng tuyển cử", line: "Tổng tuyển cử bầu Quốc hội đầu tiên.", source: "giáo trình", scene: "ballot" },
    { year: "1946", phrase: "Hễ là công dân…", line: "\"Hễ là công dân thì đều có quyền đi bầu cử.\"", source: "Hồ Chí Minh", scene: "ballot" },
    { year: "11/1946", phrase: "Hiến pháp đầu tiên", line: "Quốc hội thông qua Hiến pháp đầu tiên.", source: "Hiến pháp 1946", scene: "constitution" },
  ],
  "2": [
    { year: "1976", phrase: "Nước CHXHCN Việt Nam", line: "Nước Cộng hòa xã hội chủ nghĩa Việt Nam.", source: "giáo trình", scene: "flag" },
    { year: "Trước 1986", phrase: "Dân chủ và pháp luật", line: "Việc gắn dân chủ với pháp luật chưa được đặt ra cụ thể.", source: "giáo trình", scene: "scroll" },
    { year: "Trước 1986", phrase: "Khó khăn", line: "Đất nước gặp nhiều khó khăn trước Đổi mới.", source: "", scene: "gears" },
    { year: "12/1986", phrase: "Đổi mới", line: "Đại hội VI khởi xướng Đổi mới: \"lấy dân làm gốc\".", source: "Đại hội VI", scene: "podium" },
    { year: "1986", phrase: "Lấy dân làm gốc", line: "Dân chủ: bản chất, mục tiêu, động lực của sự phát triển.", source: "giáo trình", scene: "sun" },
  ],
  "3": [
    { year: "06/1991", phrase: "Cương lĩnh", line: "Nhà nước quản lý xã hội bằng pháp luật.", source: "Cương lĩnh 1991", scene: "scroll" },
    { year: "29/11/1991", phrase: "Nhà nước pháp quyền XHCN", line: "Lần đầu nêu khái niệm \"Nhà nước pháp quyền xã hội chủ nghĩa\".", source: "giáo trình", scene: "podium" },
    { year: "1992", phrase: "Hiến pháp 1992", line: "Hiến pháp 1992: Điều 4 và Điều 12.", source: "Hiến pháp 1992", scene: "scale" },
    { year: "01/1994", phrase: "Của dân · Do dân · Vì dân", line: "\"Nhà nước pháp quyền thực sự của dân, do dân và vì dân\".", source: "giáo trình", scene: "arch" },
    { year: "01/1995", phrase: "Trình bày đầy đủ hơn", line: "Quan điểm Nhà nước pháp quyền được trình bày đầy đủ hơn.", source: "giáo trình", scene: "arch" },
  ],
  "4": [
    { year: "12/2001", phrase: "Hiến định thuật ngữ", line: "Hiến định thuật ngữ \"Nhà nước pháp quyền xã hội chủ nghĩa\".", source: "Hiến pháp sửa đổi 2001", scene: "constitution" },
    { year: "2011", phrase: "Phân công · Phối hợp · Kiểm soát", line: "Quyền lực nhà nước thống nhất, có phân công, phối hợp, kiểm soát.", source: "Cương lĩnh 2011", scene: "gears" },
    { year: "2013", phrase: "Điều 4", line: "Hoạt động trong khuôn khổ Hiến pháp và pháp luật.", source: "Hiến pháp 2013 · Điều 4", scene: "constitution" },
    { year: "Kiểm soát", phrase: "Không có vùng cấm", line: "Kiểm soát quyền lực: không có vùng cấm.", source: "", scene: "scale" },
    { year: "09/11/2022", phrase: "Nghị quyết 27", line: "Tiếp tục xây dựng, hoàn thiện Nhà nước pháp quyền XHCN.", source: "Nghị quyết 27-NQ/TW", scene: "scroll" },
  ],
  "5": [
    { year: "Điều 4", phrase: "Được Hiến pháp ghi nhận", line: "Quyền lãnh đạo được Hiến pháp ghi nhận.", source: "Hiến pháp 2013 · Điều 4", scene: "constitution" },
    { year: "Khoản 3", phrase: "Trong khuôn khổ pháp luật", line: "…kèm nghĩa vụ hoạt động trong khuôn khổ Hiến pháp và pháp luật.", source: "Hiến pháp 2013 · Điều 4", scene: "scale" },
    { year: "Bãi bỏ", phrase: "Bãi bỏ thủ tục phiền hà", line: "Thủ tục hành chính gây phiền hà phải được bãi bỏ.", source: "giáo trình", scene: "birds" },
    { year: "NQ 27", phrase: "Tiếp tục hoàn thiện", line: "Tiếp tục hoàn thiện cơ chế kiểm soát quyền lực.", source: "Nghị quyết 27-NQ/TW", scene: "sun" },
    { year: "Kết luận", phrase: "Câu trả lời", line: "Không mâu thuẫn.", source: "", scene: "sun" },
  ],
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

/** Phần `part` (0-based) của level; null với level luyện tập. */
export function partInfo(levelId: string, part: number): Part | null {
  return PARTS[levelId]?.[part] ?? null;
}

/** Ảnh thật (lấy trên mạng, .jpg) — ưu tiên hơn ảnh AI (.webp) cùng tên. Khóa "level-phần" (phần 1-based). */
const REAL_PHOTOS = new Set(["1-2", "1-5", "2-2", "2-4", "3-2", "4-3", "4-4", "5-3"]);

/** Ảnh tư liệu của phần (0-based). */
export function partImage(levelId: string, part: number): string {
  const ext = REAL_PHOTOS.has(`${levelId}-${part + 1}`) ? "jpg" : "webp";
  return `/art/l${levelId}p${part + 1}.${ext}`;
}

/** Ảnh bìa thời kỳ. */
export function eraImage(levelId: string): string {
  return `/art/era${levelId}.webp`;
}
