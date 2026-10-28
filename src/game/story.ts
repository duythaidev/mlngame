// src/game/story.ts
// TOÀN BỘ chữ hiển thị trong 5 level. Nhóm soát và sửa ở file này.
// Chữ của các thẻ phần nằm trong levelData.ts (cùng chỗ với hình học); file này giữ nhãn vật thể, màn kết và hàm tra cứu.
// Ảnh: public/art/l{level}p{phần}.webp. scene = hình vẽ code dự phòng khi ảnh chưa tải (LinocutSceneSVG).

import { CHAPTERS } from "./levelData";
import type { PartCard, Scene } from "./level";

export type { Scene };
export type Part = PartCard;

/** Nhãn trên vật thể (khóa `label` dùng trong objs của src/game/levelData.ts). */
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

/**
 * Thẻ tư liệu của các phần: LẤY TỪ levelData.ts (mỗi phần = thẻ + đoạn hình học đi cùng nhau), không gõ lại ở đây.
 * Sửa chữ / nguồn / ảnh của một thẻ: sửa `card` của phần đó trong src/game/levelData.ts.
 */
export const PARTS: Record<string, Part[]> = Object.fromEntries(
  CHAPTERS.map((c) => [c.id, c.parts.map((p) => p.card).filter((cd): cd is Part => !!cd)]),
);

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

/** Số phần của level (chính = độ dài PARTS; level luyện tập = 0). Level có thể có 4 hoặc 5 phần. */
export function partCountOf(levelId: string): number {
  return PARTS[levelId]?.length ?? 0;
}

/** Tổng số phần (= số tem) của mọi level chính. */
export function totalParts(): number {
  return Object.values(PARTS).reduce((n, p) => n + p.length, 0);
}

/** Số tem của các level đứng trước level `era` (1..5). */
export function stampsBefore(era: number): number {
  let n = 0;
  for (let e = 1; e < era; e++) n += partCountOf(String(e));
  return n;
}

/** Phần `part` (0-based) của level; null với level luyện tập. */
export function partInfo(levelId: string, part: number): Part | null {
  return PARTS[levelId]?.[part] ?? null;
}

/** Ảnh tư liệu của phần (0-based): file `art` ghi trong thẻ; không có thì l{level}p{phần}.webp. */
export function partImage(levelId: string, part: number): string {
  return `/art/${PARTS[levelId]?.[part]?.art ?? `l${levelId}p${part + 1}.webp`}`;
}

/** Ảnh bìa thời kỳ. */
export function eraImage(levelId: string): string {
  return `/art/era${levelId}.webp`;
}
