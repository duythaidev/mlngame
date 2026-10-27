// src/components/illustrations/erasData.ts
// Dữ liệu 5 thời kỳ cho các khối minh họa. Chữ + ảnh 25 phần lấy từ src/game/story.ts (nguồn duy nhất) — KHÔNG gõ lại ở đây.
import { eraImage, PARTS, partImage, type Scene } from "../../game/story";

export interface EraStep {
  step: number; // 1..5
  code: string;
  year: string;
  title: string;
  quote: string;
  source: string;
  img: string;
  sceneType: Scene;
}

export interface EraData {
  id: number;
  shortRange: string;
  sealYears: string;
  chapterTag: string;
  stampCode: string;
  ribbonTitle: string;
  portalYear: string;
  portalSlogan: string;
  eraImg: string;
  stampIcon: string;
  steps: EraStep[];
}

type EraHead = Omit<EraData, "id" | "eraImg" | "steps">;

const HEADS: Record<number, EraHead> = {
  1: {
    shortRange: "1919–1946",
    sealYears: "1919 - 1946",
    chapterTag: "LEVEL 1 · NỀN MÓNG",
    stampCode: "✓ 1946",
    ribbonTitle: "TỪ \"THẦN LINH PHÁP QUYỀN\" ĐẾN HIẾN PHÁP ĐẦU TIÊN",
    portalYear: "1945 - 1946",
    portalSlogan: "ĐỘC LẬP • DÂN CHỦ",
    stampIcon: "ballot",
  },
  2: {
    shortRange: "1976–1986",
    sealYears: "1976 - 1986",
    chapterTag: "LEVEL 2 · THỐNG NHẤT VÀ ĐỔI MỚI",
    stampCode: "✓ 1986",
    ribbonTitle: "THỐNG NHẤT ĐẤT NƯỚC · ĐỔI MỚI \"LẤY DÂN LÀM GỐC\"",
    portalYear: "1976 - 1986",
    portalSlogan: "LẤY DÂN LÀM GỐC",
    stampIcon: "scale",
  },
  3: {
    shortRange: "1991–1995",
    sealYears: "1991 - 1995",
    chapterTag: "LEVEL 3 · HÌNH THÀNH KHÁI NIỆM",
    stampCode: "✓ 1994",
    ribbonTitle: "NHÀ NƯỚC PHÁP QUYỀN XÃ HỘI CHỦ NGHĨA",
    portalYear: "1991 - 1995",
    portalSlogan: "CỦA DÂN • DO DÂN • VÌ DÂN",
    stampIcon: "book",
  },
  4: {
    shortRange: "2001–2022",
    sealYears: "2001 - 2022",
    chapterTag: "LEVEL 4 · HIẾN ĐỊNH VÀ HOÀN THIỆN",
    stampCode: "✓ 2013",
    ribbonTitle: "PHÂN CÔNG · PHỐI HỢP · KIỂM SOÁT QUYỀN LỰC",
    portalYear: "2001 - 2022",
    portalSlogan: "THƯỢNG TÔN HIẾN PHÁP",
    stampIcon: "gears",
  },
  5: {
    shortRange: "Câu trả lời",
    sealYears: "KẾT LUẬN",
    chapterTag: "LEVEL 5 · CÂU TRẢ LỜI",
    stampCode: "✓ KẾT LUẬN",
    ribbonTitle: "ĐẢNG LÃNH ĐẠO VÀ NGUYÊN TẮC PHÁP QUYỀN",
    portalYear: "KẾT LUẬN",
    portalSlogan: "KHÔNG MÂU THUẪN",
    stampIcon: "star",
  },
};

function stepsOf(era: number): EraStep[] {
  return PARTS[String(era)].map((p, i) => ({
    step: i + 1,
    code: `#L${era}.${i + 1}`,
    year: p.year,
    title: p.phrase.toUpperCase(),
    quote: p.line,
    source: p.source,
    img: partImage(String(era), i),
    sceneType: p.scene,
  }));
}

export const ERAS_DATA: Record<number, EraData> = Object.fromEntries(
  [1, 2, 3, 4, 5].map((id) => [id, { id, ...HEADS[id], eraImg: eraImage(String(id)), steps: stepsOf(id) }]),
);
