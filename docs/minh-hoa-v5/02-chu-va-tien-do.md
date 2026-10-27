# 02 · Chữ 25 phần + tiến độ ra giao diện (repo `mlngame`)

`story.ts` là **nguồn duy nhất** cho chữ và ảnh của 25 phần (khung tư liệu, tem, cổng mốc, poster đều đọc từ đây).
Dòng chữ chạy trên canvas của bản 4 bị **bỏ** (thay bằng cổng mốc + khung tư liệu) → xóa `storyTracker.ts`.

> ⚠️ Nhóm soát 2 dòng mới (không có trong bản 4): L2 phần 3 *"Đất nước gặp nhiều khó khăn trước Đổi mới."* và L4 phần 5 *"Tiếp tục xây dựng, hoàn thiện Nhà nước pháp quyền XHCN."*
> Ảnh có cả `.jpg` (ảnh thật) và `.webp` (ảnh AI) cùng tên → dùng `.jpg` (danh sách `REAL_PHOTOS`).

## Bước 1 — Dữ liệu

**Thay toàn bộ** `src/game/story.ts`:

````ts
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
````

## Bước 2 — Tiến độ

**Tạo mới** `src/game/progress.ts`:

````ts
// src/game/progress.ts
// Tiến độ cho giao diện ngoài canvas (thanh thời gian, khung tư liệu, thẻ mở level, màn kết).
// Vòng vẽ (requestAnimationFrame) gọi update() mỗi khung; chỉ báo ra React khi tiến độ đổi.
import { LEVEL_IDS, partAt, type Level } from "./level";

export interface Progress {
  levelId: string;
  era: number; // 1..5; 0 = level luyện tập (ẩn thanh thời gian / khung tư liệu)
  part: number; // 0-based, phần đang ở
  won: boolean;
}

export const START: Progress = { levelId: "1", era: 1, part: 0, won: false };

export function progressOf(level: Level, cp: number, won: boolean): Progress {
  return { levelId: level.id, era: LEVEL_IDS.indexOf(level.id) + 1, part: partAt(level, cp), won };
}

export class ProgressTracker {
  private last = "";

  /** Trả về Progress mới nếu khác lần trước, ngược lại null. */
  update(level: Level, cp: number, won: boolean): Progress | null {
    const p = progressOf(level, cp, won);
    const key = `${p.levelId}|${p.part}|${p.won ? 1 : 0}`;
    if (key === this.last) return null;
    this.last = key;
    return p;
  }
}
````

**Xóa** file `src/game/storyTracker.ts`.

## Bước 3 — Test

**Tạo mới** `src/game/parts.test.ts`:

````ts
// src/game/parts.test.ts
// Bản 5: mỗi level đúng 5 phần; chữ đúng giới hạn; ảnh đúng tên file.
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getLevel, LEVEL_IDS, partAt, TRAINING_IDS } from "./level";
import { PARTS, partImage } from "./story";

describe("5 phần mỗi level", () => {
  for (const id of LEVEL_IDS) {
    it(`level ${id}: partOf phủ mọi đoạn, tăng dần 0 → 4`, () => {
      const L = getLevel(id);
      expect(L.partCount).toBe(5);
      expect(L.partOf).toHaveLength(L.segCount);
      expect(L.partOf[0]).toBe(0);
      expect(L.partOf[L.segCount - 1]).toBe(4);
      L.partOf.forEach((p, i) => i > 0 && expect(p - L.partOf[i - 1]).toBeGreaterThanOrEqual(0));
      L.partOf.forEach((p, i) => i > 0 && expect(p - L.partOf[i - 1]).toBeLessThanOrEqual(1));
    });

    it(`level ${id}: cột mốc cuối thuộc phần 5, xuất phát thuộc phần 1`, () => {
      const L = getLevel(id);
      expect(partAt(L, 0)).toBe(0);
      expect(partAt(L, L.checkpoints.length - 1)).toBe(4);
      expect(partAt(L, 999)).toBe(0); // cp lạ → phần 1, không lỗi
    });

    it(`level ${id}: chữ 5 phần đúng giới hạn, có ảnh`, () => {
      const parts = PARTS[id];
      expect(parts).toHaveLength(5);
      parts.forEach((p, i) => {
        expect(p.year.length).toBeLessThanOrEqual(10);
        expect(p.phrase.split(/\s+/).filter((w) => w !== "·").length).toBeLessThanOrEqual(6);
        expect(p.line.length).toBeLessThanOrEqual(70);
        expect(existsSync(`public${partImage(id, i)}`)).toBe(true);
      });
    });
  }

  it("level luyện tập: 1 phần, không có chữ phần", () => {
    for (const id of TRAINING_IDS) {
      expect(getLevel(id).partCount).toBe(1);
      expect(PARTS[id]).toBeUndefined();
    }
  });

  it("ảnh thật .jpg được ưu tiên", () => {
    expect(partImage("1", 1)).toBe("/art/l1p2.jpg");
    expect(partImage("1", 0)).toBe("/art/l1p1.webp");
  });
});
````

**Tạo mới** `src/game/progress.test.ts`:

````ts
// src/game/progress.test.ts
import { expect, it } from "vitest";
import { getLevel } from "./level";
import { progressOf, ProgressTracker } from "./progress";

it("chỉ báo khi level / phần / thắng đổi", () => {
  const t = new ProgressTracker();
  const L1 = getLevel("1");
  expect(t.update(L1, 0, false)).toEqual({ levelId: "1", era: 1, part: 0, won: false });
  expect(t.update(L1, 0, false)).toBeNull();
  const last = L1.checkpoints.length - 1;
  expect(t.update(L1, last, false)?.part).toBe(4);
  expect(t.update(L1, last, true)?.won).toBe(true);
  expect(t.update(getLevel("2"), 0, false)?.era).toBe(2); // server tự sang level kế
});

it("level luyện tập: era 0", () => {
  expect(progressOf(getLevel("t1"), 0, false).era).toBe(0);
});
````

`renderer.ts`, `GameCanvas.tsx`, `Sandbox.tsx` còn gọi `storyTracker` → được thay ở file 05 và 06. Muốn `tsc` xanh ngay thì làm liền 04 → 06.

✅ **Kiểm tra**

```bash
npx vitest run src/game/parts.test.ts src/game/progress.test.ts
```

Xanh: 18 test (mỗi level 3 test + luyện tập + ảnh jpg + 2 test tiến độ).
