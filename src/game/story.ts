// src/game/story.ts
// TOÀN BỘ chữ hiển thị trong 5 level. Nhóm soát và sửa ở file này.
// Quy tắc: mỗi phần = năm/nhãn ngắn (≤ 10 ký tự) + cụm ≤ 6 từ + 1 dòng tóm tắt nội dung ≤ 120 ký tự + nguồn cụ thể (bắt buộc).
// Ảnh: public/art/l{level}p{phần}.webp. scene = hình vẽ code dự phòng khi ảnh chưa tải (LinocutSceneSVG).

export type Scene = "scroll" | "flag" | "podium" | "ballot" | "constitution" | "gears" | "scale" | "arch" | "birds" | "sun";

export interface Part {
  year: string; // to trên cổng mốc, khung tư liệu, tem
  phrase: string; // cụm ≤ 6 từ
  line: string; // 1 dòng tóm tắt nội dung ≤ 120 ký tự
  source: string; // nguồn cụ thể (văn kiện / mục giáo trình / lời trích) — bắt buộc
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

/** Nguồn chuẩn (luôn ghi rõ chương/mục, không ghi chung chung "giáo trình"). */
const GT = "Giáo trình CNXHKH";
const HP13 = "Hiến pháp 2013";

/**
 * 5 phần của mỗi level, đúng thứ tự `parts` trong levelData.ts.
 * Quy tắc: line = tóm tắt NỘI DUNG của mốc (người xem không cần biết trước), có số điều/tên văn kiện khi nhắc điều luật;
 * source LUÔN có (văn kiện / mục giáo trình / lời trích). Chỉ dùng ý có trong bài thuyết trình (.docx) hoặc giáo trình.
 */
export const PARTS: Record<string, Part[]> = {
  "1": [
    { year: "1919", phrase: "Thần linh pháp quyền", line: "\"Bảy xin Hiến pháp ban hành, trăm điều phải có thần linh pháp quyền\": đòi có luật pháp.", source: "Việt Nam yêu cầu ca · Nguyễn Ái Quốc", scene: "scroll" },
    { year: "02/9/1945", phrase: "Tuyên ngôn Độc lập", line: "Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập, khai sinh nước Việt Nam Dân chủ Cộng hòa.", source: "Tuyên ngôn Độc lập, 02/9/1945", scene: "flag" },
    { year: "06/01/1946", phrase: "Tổng tuyển cử", line: "Toàn dân tự do chọn người có tài, có đức gánh vác việc nước: bầu Quốc hội đầu tiên.", source: `${GT} · Ch.4, mục I.2.b`, scene: "ballot" },
    { year: "1946", phrase: "Hễ là công dân…", line: "\"Hễ là công dân thì đều có quyền đi bầu cử\": ai cũng được tham gia công việc nhà nước.", source: "Hồ Chí Minh, Toàn tập, t.4", scene: "ballot" },
    { year: "11/1946", phrase: "Hiến pháp đầu tiên", line: "Đặt nền móng cho nhà nước dân chủ, thượng tôn pháp luật. Chưa có điều khoản về vai trò lãnh đạo của Đảng.", source: "Hiến pháp 1946", scene: "constitution" },
  ],
  "2": [
    { year: "1976", phrase: "Nước CHXHCN Việt Nam", line: "Tên nước đổi thành CHXHCN Việt Nam; văn kiện Đảng nêu \"chế độ làm chủ tập thể XHCN\".", source: `${GT} · Ch.4, mục III.1.a`, scene: "flag" },
    { year: "Trước 1986", phrase: "Dân chủ và pháp luật", line: "Bản chất dân chủ XHCN và quan hệ của nó với nhà nước pháp quyền chưa được xác định rõ.", source: `${GT} · Ch.4, mục III.1.a`, scene: "scroll" },
    { year: "Trước 1986", phrase: "Dân sinh · Dân trí · Dân quyền", line: "Dân sinh, dân trí, dân quyền chưa được đặt đúng vị trí để thúc đẩy xây dựng dân chủ.", source: `${GT} · Ch.4, mục III.1.a`, scene: "gears" },
    { year: "12/1986", phrase: "Đổi mới", line: "Đại hội VI đề ra đổi mới toàn diện; Đảng quán triệt tư tưởng \"lấy dân làm gốc\".", source: `Đại hội VI · ${GT} Ch.4`, scene: "podium" },
    { year: "Đổi mới", phrase: "Bản chất · Mục tiêu · Động lực", line: "Dân chủ XHCN là bản chất của chế độ ta, vừa là mục tiêu, vừa là động lực phát triển.", source: `${GT} · Ch.4, mục III.1.a`, scene: "sun" },
  ],
  "3": [
    { year: "06/1991", phrase: "Cương lĩnh", line: "Cương lĩnh xây dựng đất nước thời kỳ quá độ: Nhà nước quản lý xã hội bằng pháp luật.", source: "Cương lĩnh 1991", scene: "scroll" },
    { year: "29/11/1991", phrase: "Nhà nước pháp quyền XHCN", line: "Hội nghị Trung ương 2 khóa VII lần đầu nêu khái niệm \"Nhà nước pháp quyền xã hội chủ nghĩa\".", source: "Hội nghị Trung ương 2 khóa VII", scene: "podium" },
    { year: "1992", phrase: "Hiến pháp 1992", line: "Điều 4: Đảng lãnh đạo, hoạt động trong khuôn khổ pháp luật. Điều 12: Nhà nước quản lý xã hội bằng pháp luật.", source: "Hiến pháp 1992 · Điều 4, Điều 12", scene: "scale" },
    { year: "01/1994", phrase: "Của dân · Do dân · Vì dân", line: "Văn kiện Đảng lần đầu nêu: \"Nhà nước pháp quyền thực sự của dân, do dân và vì dân\".", source: "Hội nghị đại biểu toàn quốc giữa nhiệm kỳ khóa VII", scene: "arch" },
    { year: "01/1995", phrase: "Trình bày đầy đủ hơn", line: "Hội nghị Trung ương 8 khóa VII trình bày đầy đủ hơn quan điểm xây dựng Nhà nước pháp quyền XHCN.", source: "Hội nghị Trung ương 8 khóa VII", scene: "arch" },
  ],
  "4": [
    { year: "12/2001", phrase: "Hiến định thuật ngữ", line: "Sửa đổi Hiến pháp 1992: lần đầu ghi thuật ngữ \"Nhà nước pháp quyền xã hội chủ nghĩa\" vào Hiến pháp.", source: "Hiến pháp 1992 (sửa đổi 2001)", scene: "constitution" },
    { year: "2011", phrase: "Phân công · Phối hợp · Kiểm soát", line: "Quyền lực nhà nước thống nhất; phân công, phối hợp, kiểm soát giữa lập pháp, hành pháp, tư pháp.", source: "Cương lĩnh (bổ sung, phát triển 2011)", scene: "gears" },
    { year: "2013", phrase: "Điều 4", line: "Điều 4 bổ sung: đảng viên cũng phải tuân thủ pháp luật; Đảng chịu sự giám sát của Nhân dân.", source: `${HP13} · Điều 4`, scene: "constitution" },
    { year: "Kiểm soát", phrase: "Không có vùng cấm", line: "Ủy ban Kiểm tra các cấp xử lý vi phạm: đảng viên vi phạm bị xử lý theo kỷ luật Đảng và theo pháp luật.", source: "Phương châm \"không có vùng cấm, không có ngoại lệ\"", scene: "scale" },
    { year: "09/11/2022", phrase: "Nghị quyết 27", line: "Hội nghị Trung ương 6 khóa XIII: tiếp tục xây dựng, hoàn thiện Nhà nước pháp quyền XHCN giai đoạn mới.", source: "Nghị quyết 27-NQ/TW", scene: "scroll" },
  ],
  "5": [
    { year: "Điều 4", phrase: "Được Hiến pháp ghi nhận", line: "Khoản 1: Đảng Cộng sản Việt Nam là lực lượng lãnh đạo Nhà nước và xã hội.", source: `${HP13} · Điều 4, khoản 1`, scene: "constitution" },
    { year: "Khoản 3", phrase: "Trong khuôn khổ pháp luật", line: "\"Các tổ chức của Đảng và đảng viên hoạt động trong khuôn khổ Hiến pháp và pháp luật.\"", source: `${HP13} · Điều 4, khoản 3`, scene: "scale" },
    { year: "Bãi bỏ", phrase: "Bãi bỏ thủ tục phiền hà", line: "Đẩy mạnh cải cách hành chính, giảm mạnh và bãi bỏ thủ tục gây phiền hà cho tổ chức và công dân.", source: `${GT} · Ch.4, mục III.3.b`, scene: "birds" },
    { year: "NQ 27", phrase: "Tiếp tục hoàn thiện", line: "Còn phải hoàn thiện cơ chế kiểm soát quyền lực và nâng cao hiệu lực thực thi pháp luật.", source: "Nghị quyết 27-NQ/TW (2022)", scene: "sun" },
    { year: "Kết luận", phrase: "Không mâu thuẫn", line: "Quyền lãnh đạo đi kèm nghĩa vụ tuân thủ pháp luật: hai mặt của cùng một mô hình.", source: "Quan điểm chính thức · Bài thuyết trình, Phần VI", scene: "sun" },
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
