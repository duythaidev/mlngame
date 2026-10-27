# 04 · Các khối minh họa đọc dữ liệu thật (repo `mlngame`)

Thư mục `src/components/illustrations/` (do agent trước dựng từ file HTML) có **dữ liệu riêng lệch spec** (vd phần 2 Level 1 là "1930", có "Hội nghị Versailles" chưa có nguồn) và CSS có luật **toàn cục** (`* {…}`, `body { nền tối }`) — nạp vào trang chơi sẽ làm cả trang tối.
File này: dữ liệu lấy từ `story.ts`; tem theo phần của level; khung tư liệu có lật thẻ + ảnh dự phòng; thẻ mở level phủ canvas; poster kết **nền sáng**; CSS chỉ áp trong các khối.

## Bước 1 — Dữ liệu + tem

**Thay toàn bộ** `src/components/illustrations/erasData.ts`:

````ts
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
````

**Tạo mới** `src/components/illustrations/stamps.ts`:

````ts
// src/components/illustrations/stamps.ts
// Tem của level hiện tại: tem phần i có khi nhóm đã sang phần i+1; thắng level = đủ 5 tem.

export function earnedStamps(part: number, won: boolean): number {
  return won ? 5 : Math.max(0, Math.min(5, part));
}

/** Tổng tem cả game (0..25) khi đang ở level `era` (1..5). */
export function totalStamps(era: number, part: number, won: boolean): number {
  return era <= 0 ? 0 : (era - 1) * 5 + earnedStamps(part, won);
}
````

**Tạo mới** `src/components/illustrations/stamps.test.ts`:

````ts
// src/components/illustrations/stamps.test.ts
import { expect, it } from "vitest";
import { ERAS_DATA } from "./erasData";
import { earnedStamps, totalStamps } from "./stamps";

it("tem theo phần", () => {
  expect(earnedStamps(0, false)).toBe(0);
  expect(earnedStamps(3, false)).toBe(3);
  expect(earnedStamps(4, true)).toBe(5);
  expect(earnedStamps(9, false)).toBe(5);
  expect(totalStamps(5, 4, true)).toBe(25);
  expect(totalStamps(0, 3, false)).toBe(0);
});

it("dữ liệu thời kỳ lấy từ story.ts", () => {
  for (const id of [1, 2, 3, 4, 5]) expect(ERAS_DATA[id].steps).toHaveLength(5);
  expect(ERAS_DATA[1].steps[1].img).toBe("/art/l1p2.jpg");
  expect(ERAS_DATA[3].eraImg).toBe("/art/era3.webp");
  const all = Object.values(ERAS_DATA).flatMap((e) => e.steps.map((s) => s.source + s.quote));
  expect(all.some((s) => s.includes("Versailles"))).toBe(false);
});
````

## Bước 2 — Các khối

**Thay toàn bộ** `src/components/illustrations/TimelineRibbon.tsx`:

````tsx
// src/components/illustrations/TimelineRibbon.tsx
import React, { useEffect, useRef, useState } from "react";
import type { Scene } from "../../game/story";
import { ERAS_DATA } from "./erasData";
import { earnedStamps } from "./stamps";

export interface TimelineRibbonProps {
  currentEra: number;
  /** Phần đang ở (0-based) trong level hiện tại. */
  currentPart?: number;
  won?: boolean;
  onSelectEra?: (eraId: number) => void;
  className?: string;
  id?: string;
}

function renderStampIcon(type: string) {
  switch (type) {
    case "ballot":
      return (
        <svg className="stamp-icon-svg" viewBox="0 0 32 32" fill="none">
          <rect x="5" y="14" width="22" height="14" fill="#B5382A" stroke="#231811" strokeWidth="2" />
          <rect x="10" y="5" width="12" height="12" fill="#FFF" stroke="#231811" strokeWidth="2" />
          <path d="M13 11L15 13L19 9" stroke="#B5382A" strokeWidth="2" />
        </svg>
      );
    case "scale":
      return (
        <svg className="stamp-icon-svg" viewBox="0 0 32 32" fill="none">
          <path d="M16 5V27M9 27H23M6 11H26" stroke="#231811" strokeWidth="2.2" />
          <polygon points="7,11 4,19 10,19" fill="#A4533A" stroke="#231811" strokeWidth="1.5" />
          <polygon points="25,11 22,19 28,19" fill="#A4533A" stroke="#231811" strokeWidth="1.5" />
        </svg>
      );
    case "book":
      return (
        <svg className="stamp-icon-svg" viewBox="0 0 32 32" fill="none">
          <rect x="7" y="4" width="18" height="24" rx="2" fill="#2E8B7A" stroke="#231811" strokeWidth="2" />
          <polygon points="16,9 17.8,13 22,13 18.5,15.5 19.8,19.5 16,17 12.2,19.5 13.5,15.5 10,13 14.2,13" fill="#FFD700" />
        </svg>
      );
    case "gears":
      return (
        <svg className="stamp-icon-svg" viewBox="0 0 32 32" fill="none">
          <circle cx="12" cy="13" r="6" fill="#14305C" stroke="#231811" strokeWidth="2" />
          <circle cx="21" cy="19" r="6" fill="#D9A92B" stroke="#231811" strokeWidth="2" />
          <circle cx="12" cy="13" r="2" fill="#FFF" />
          <circle cx="21" cy="19" r="2" fill="#231811" />
        </svg>
      );
    default:
      return (
        <svg className="stamp-icon-svg" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="11" fill="#C8102E" stroke="#231811" strokeWidth="2" />
          <polygon points="16,7 18.5,13 25,13 19.8,17 21.8,23 16,19.2 10.2,23 12.2,17 7,13 13.5,13" fill="#FFD700" />
        </svg>
      );
  }
}

/** Biểu tượng tem theo cảnh của phần. */
function stampIconOf(scene: Scene): string {
  if (scene === "ballot" || scene === "scale" || scene === "gears") return scene;
  if (scene === "constitution" || scene === "scroll" || scene === "arch") return "book";
  return "star";
}

export const TimelineRibbon: React.FC<TimelineRibbonProps> = ({
  currentEra,
  currentPart = 0,
  won = false,
  onSelectEra,
  className = "",
  id = "block2Ribbon",
}) => {
  const era = ERAS_DATA[currentEra] ?? ERAS_DATA[1];
  const earned = earnedStamps(currentPart, won);
  // thanh ray: tô tới thời kỳ hiện tại + tiến độ trong level
  const fillPct = ((currentEra - 1 + earned / 5) / 4) * 100;

  // tem vừa có (số tem TĂNG trong cùng level) thì bay vào ô; giảm / đổi level thì không bay
  const prev = useRef({ era: currentEra, earned });
  const [flyIdx, setFlyIdx] = useState(-1);
  useEffect(() => {
    const p = prev.current;
    prev.current = { era: currentEra, earned };
    if (p.era !== currentEra || earned <= p.earned) return;
    setFlyIdx(earned - 1);
    const t = window.setTimeout(() => setFlyIdx(-1), 1000);
    return () => window.clearTimeout(t);
  }, [currentEra, earned]);

  return (
    <div className={`ui-block-ribbon paper-texture ${className}`} id={id}>
      {/* Trục mốc thời gian 5 thời kỳ */}
      <div className="timeline-track-wrap">
        <div className="timeline-metal-bar">
          <div className="timeline-metal-fill" style={{ width: `${Math.max(4, Math.min(100, fillPct))}%` }} />
        </div>
        <div className="timeline-nodes">
          {[1, 2, 3, 4, 5].map((eraId) => {
            const e = ERAS_DATA[eraId];
            const stateClass = eraId < currentEra ? "passed" : eraId === currentEra ? "current" : "";
            return (
              <div
                key={eraId}
                className={`tl-node ${stateClass}`}
                onClick={() => onSelectEra?.(eraId)}
                title={`Level ${eraId}: ${e.shortRange}`}
              >
                <div className="tl-node-circle">{eraId < currentEra ? "✓" : eraId}</div>
                <span className="tl-node-label">{e.shortRange}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5 tem của level hiện tại: tem phần i có khi nhóm qua cổng mốc phần i+1 */}
      <div className="stamp-collection-row">
        {era.steps.map((s, i) => {
          const unlocked = i < earned;
          return (
            <div
              key={`${currentEra}-${i}`}
              className={`postage-stamp-wrap ${unlocked ? "" : "locked"} ${i === flyIdx ? "stamp-fly" : ""}`}
              title={`${s.year} · ${s.title}`}
            >
              <div className="postage-stamp">
                <div className="postage-stamp-inner">
                  <span className="stamp-year-tiny">{s.year}</span>
                  {renderStampIcon(stampIconOf(s.sceneType))}
                </div>
              </div>
              {unlocked && (
                <div className="postal-cancel-seal animate-stamp" style={{ "--stamp-rot": "14deg" } as React.CSSProperties}>
                  <span>✓ {s.year}</span>
                  <span>PHẦN {i + 1}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
````

**Thay toàn bộ** `src/components/illustrations/StoryPolaroidCard.tsx`:

````tsx
// src/components/illustrations/StoryPolaroidCard.tsx
// Khung tư liệu bên phải canvas (spec B4): ảnh phần hiện tại + năm + cụm + 1 dòng + nguồn + 5 chấm.
// Đổi phần → thẻ lật 400 ms, ảnh phóng nhẹ (Ken Burns). Ảnh lỗi / đang tải → hình vẽ khắc gỗ dự phòng.
import React, { useState } from "react";
import { ERAS_DATA, type EraStep } from "./erasData";
import { LinocutSceneSVG } from "./LinocutSceneSVG";

export interface StoryPolaroidCardProps {
  currentEra: number;
  currentStep: number; // 1..5
  onSelectStep?: (step: number) => void;
  /** "side" = cột phải 296 px; "bottom" = dưới canvas, ảnh 160 px, chữ cạnh ảnh (màn hẹp). */
  variant?: "side" | "bottom";
  className?: string;
  id?: string;
}

/** Ảnh có fallback: hiện hình vẽ cho tới khi ảnh tải xong; lỗi thì giữ hình vẽ. Gắn key theo ảnh để reset. */
function PartPhoto({ step, era }: { step: EraStep; era: number }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  return (
    <div className={`polaroid-art-viewport ${state === "ok" ? "kenburns" : "developing"}`}>
      {state !== "ok" && (
        <div className="polaroid-art-fallback">
          <LinocutSceneSVG sceneType={step.sceneType} eraId={era} yearText={step.year} />
        </div>
      )}
      {state !== "error" && (
        <img
          src={step.img}
          alt={step.title}
          style={state === "ok" ? undefined : { position: "absolute", opacity: 0 }}
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
        />
      )}
    </div>
  );
}

export const StoryPolaroidCard: React.FC<StoryPolaroidCardProps> = ({
  currentEra,
  currentStep,
  onSelectStep,
  variant = "side",
  className = "",
  id = "block1Polaroid",
}) => {
  const era = ERAS_DATA[currentEra] ?? ERAS_DATA[1];
  const stepObj: EraStep = era.steps[currentStep - 1] ?? era.steps[0];
  const longYear = stepObj.year.length > 6;

  return (
    <div className={`ui-block-polaroid-wrapper polaroid-${variant} ${className}`} id={id}>
      <div className="paper-stack-layer-1 paper-texture" />
      <div className="paper-stack-layer-2 paper-texture" />

      {/* key đổi theo phần → React dựng lại thẻ → chạy lại hoạt ảnh lật */}
      <article key={`${currentEra}-${stepObj.step}`} className="polaroid-main-card paper-texture card-flip">
        <svg className="push-pin-svg" viewBox="0 0 64 64" fill="none">
          <ellipse cx="34" cy="54" rx="10" ry="4" fill="rgba(0,0,0,0.35)" />
          <path d="M32 34L32 54" stroke="#78909C" strokeWidth="4" strokeLinecap="round" />
          <circle cx="32" cy="22" r="14" fill="#B71C1C" stroke="#231811" strokeWidth="3" />
          <circle cx="32" cy="22" r="9" fill="#E53935" />
          <ellipse cx="28" cy="18" rx="4" ry="2.5" fill="#FFCDD2" transform="rotate(-20 28 18)" />
        </svg>

        <div className="polaroid-photo-frame">
          <div className="polaroid-tape" />
          <PartPhoto key={stepObj.img} step={stepObj} era={currentEra} />
        </div>

        <div className="polaroid-text">
          <div className="archive-eyebrow">
            <span>TƯ LIỆU · LEVEL {currentEra} · PHẦN {stepObj.step}/5</span>
          </div>

          <div className="archive-year-wrap">
            <div className="archive-year-brush" />
            <div className={`archive-year-num font-oswald ${longYear ? "is-long" : ""}`}>{stepObj.year}</div>
          </div>

          <h3 className="archive-event-title font-oswald">{stepObj.title}</h3>

          <blockquote className="archive-quote-box">
            <p className="archive-quote-text font-serif-vn">{stepObj.quote}</p>
          </blockquote>

          {stepObj.source && (
            <div className="archive-source">
              <span>📜</span>
              <span>{stepObj.source}</span>
            </div>
          )}

          <div className="archive-step-dots">
            {[1, 2, 3, 4, 5].map((s) => {
              const cls = s < currentStep ? "done" : s === currentStep ? "active" : "";
              return (
                <button
                  key={s}
                  type="button"
                  className={`step-dot-btn ${cls}`}
                  onClick={onSelectStep ? () => onSelectStep(s) : undefined}
                  disabled={!onSelectStep}
                  aria-label={`Phần ${s}/5`}
                />
              );
            })}
          </div>
        </div>
      </article>
    </div>
  );
};
````

**Thay toàn bộ** `src/components/illustrations/EraSplashBanner.tsx`:

````tsx
// src/components/illustrations/EraSplashBanner.tsx
import React, { useState } from "react";
import { ERAS_DATA } from "./erasData";
import { LinocutSceneSVG } from "./LinocutSceneSVG";

export interface EraSplashBannerProps {
  currentEra: number;
  className?: string;
  id?: string;
  onReplaySeal?: () => void;
  /** Phủ kín khung canvas (thẻ mở level, spec B5): tự trượt đi sau 1,6 s rồi gọi onDone lúc 2 s. */
  overlay?: boolean;
  onDone?: () => void;
}

export const EraSplashBanner: React.FC<EraSplashBannerProps> = ({
  currentEra,
  className = "",
  id = "block3Splash",
  onReplaySeal,
  overlay = false,
  onDone,
}) => {
  const [imgError, setImgError] = useState(false);
  const [animating, setAnimating] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const doneRef = React.useRef(onDone);
  React.useEffect(() => {
    doneRef.current = onDone;
  });

  React.useEffect(() => {
    if (!overlay) return; // overlay được dựng lại theo key mỗi lần đổi level → leaving bắt đầu từ false
    const a = window.setTimeout(() => setLeaving(true), 1600);
    const b = window.setTimeout(() => doneRef.current?.(), 2000);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [overlay, currentEra]);
  const era = ERAS_DATA[currentEra] || ERAS_DATA[1];

  React.useEffect(() => {
    setImgError(false);
    setAnimating(false);
    const timer = setTimeout(() => setAnimating(true), 10);
    return () => clearTimeout(timer);
  }, [currentEra]);

  const handleSealClick = () => {
    setAnimating(false);
    setTimeout(() => setAnimating(true), 10);
    onReplaySeal?.();
  };

  return (
    <div
      className={`ui-block-splash-banner ${overlay ? "splash-overlay" : ""} ${leaving ? "is-leaving" : ""} ${className}`}
      id={id}
    >
      <div className="splash-double-frame" />

      {/* Nền mờ tranh bìa /art/era{L}.webp kết hợp SVG Panorama khắc gỗ fallback */}
      <div className="splash-bg-art" id="splashBgArt">
        {!imgError ? (
          <img
            src={era.eraImg}
            alt={era.ribbonTitle}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{ width: "100%", height: "100%" }}>
            <LinocutSceneSVG
              sceneType={era.steps[2]?.sceneType || "podium"}
              eraId={currentEra}
              yearText={era.sealYears}
            />
          </div>
        )}
      </div>
      <div className="splash-dark-overlay" />

      {/* Tâm điểm thị giác: Con dấu niêm phong tròn đỏ khổng lồ (Wax/Ink Seal) */}
      <div
        className={`giant-wax-seal ${animating ? "animate-stamp" : ""}`}
        id="giantWaxSeal"
        onClick={handleSealClick}
        title="Bấm để đóng dấu lại"
        style={{ cursor: "pointer" }}
      >
        <svg className="wax-seal-svg" viewBox="0 0 220 220">
          {/* Vòng tròn răng cưa 24 đỉnh màu đỏ son */}
          <polygon
            fill="#B71C1C"
            stroke="#FFD54F"
            strokeWidth="3"
            points="
              110,4 123,14 137,7 147,20 163,16 169,31 185,31 187,47 202,52 199,68 212,77 205,92 215,104 205,117 212,131 199,141 202,157 187,162 185,178 169,178 163,193 147,189 137,202 123,195 110,205 97,195 83,202 73,189 57,193 51,178 35,178 33,162 18,157 21,141 8,131 15,117 5,104 15,92 8,77 21,68 18,52 33,47 35,31 51,31 57,16 73,20 83,7 97,14
            "
          />
          <circle
            cx="110"
            cy="105"
            r="82"
            fill="#C62828"
            stroke="#FFD54F"
            strokeWidth="2.5"
            strokeDasharray="6 4"
          />
          <circle
            cx="110"
            cy="105"
            r="73"
            fill="none"
            stroke="#FFF8E7"
            strokeWidth="1.5"
            opacity="0.65"
          />
        </svg>

        <div className="wax-seal-content">
          <span className="wax-seal-sub">{era.chapterTag}</span>
          <div className="wax-seal-star">★</div>
          <div className="wax-seal-years font-oswald">{era.sealYears}</div>
          <span
            className="wax-seal-sub font-mono-code"
            style={{ marginTop: "0.35em", color: "#FFF8E7" }}
          >
            {era.stampCode}
          </span>
        </div>
      </div>

      {/* Dải biểu ngữ (Ribbon) vắt ngang phía dưới */}
      <div className="splash-ribbon-banner">
        <span className="splash-ribbon-text font-oswald">{era.ribbonTitle}</span>
      </div>
    </div>
  );
};
````

**Thay toàn bộ** `src/components/illustrations/ConclusionPoster.tsx`:

````tsx
// src/components/illustrations/ConclusionPoster.tsx
// Màn kết (spec B6): 5 ảnh thời kỳ nối dây · câu hỏi · "KHÔNG MÂU THUẪN" hiện từng chữ · 3 ý · lưới 25 tem.
// Chữ lấy từ ENDING trong src/game/story.ts.
import React, { useState } from "react";
import { ENDING } from "../../game/story";
import { ERAS_DATA } from "./erasData";

export interface ConclusionPosterProps {
  className?: string;
  id?: string;
  onReplaySeal?: () => void;
  /** Số tem đã thu (0..25); mặc định 25. */
  stampsEarned?: number;
  /** Có thì hiện nút "Chơi lại". */
  onReplay?: () => void;
  /** Dòng nhỏ dưới cùng (vd "Chủ phòng bấm R để chơi lại"). */
  footnote?: string;
}

const ICONS = [
  // cuốn Hiến pháp
  <svg key="a" width="32" height="32" viewBox="0 0 48 48" fill="none">
    <rect x="8" y="6" width="32" height="36" rx="3" fill="#C8102E" stroke="#231811" strokeWidth="3" />
    <rect x="12" y="6" width="4" height="36" fill="#8E0B1F" />
    <polygon points="26,15 28,20 33,20 29,23 30.5,28 26,25 21.5,28 23,23 19,20 24,20" fill="#FFD700" />
  </svg>,
  // hai bàn tay nắm (vòng tròn đan)
  <svg key="b" width="32" height="32" viewBox="0 0 48 48" fill="none">
    <circle cx="18" cy="24" r="10" fill="#E3B23C" stroke="#231811" strokeWidth="3" />
    <circle cx="30" cy="24" r="10" fill="none" stroke="#C8102E" strokeWidth="3" />
  </svg>,
  // cán cân
  <svg key="c" width="32" height="32" viewBox="0 0 48 48" fill="none">
    <path d="M24 8V40M14 40H34M10 16H38" stroke="#231811" strokeWidth="3" strokeLinecap="round" />
    <path d="M12 16L7 28H17L12 16Z" fill="#C8102E" stroke="#231811" strokeWidth="2.2" />
    <path d="M36 16L31 28H41L36 16Z" fill="#C8102E" stroke="#231811" strokeWidth="2.2" />
  </svg>,
];

export const ConclusionPoster: React.FC<ConclusionPosterProps> = ({
  className = "",
  id,
  onReplaySeal,
  stampsEarned = 25,
  onReplay,
  footnote,
}) => {
  const [animating, setAnimating] = useState(true);
  const answer = ENDING.answer.toUpperCase();

  const handleSealClick = () => {
    setAnimating(false);
    setTimeout(() => setAnimating(true), 10);
    onReplaySeal?.();
  };

  return (
    <div className={`ui-block-conclusion-poster ${className}`} id={id}>
      <div className="poster-corner-ornament poster-corner-tl" />
      <div className="poster-corner-ornament poster-corner-tr" />
      <div className="poster-corner-ornament poster-corner-bl" />
      <div className="poster-corner-ornament poster-corner-br" />

      <svg className="dong-son-drum-bg" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="192" stroke="#C9A24A" strokeWidth="3" />
        <circle cx="200" cy="200" r="175" stroke="#C9A24A" strokeWidth="1.5" strokeDasharray="6 4" />
        <circle cx="200" cy="200" r="145" stroke="#C9A24A" strokeWidth="2.5" />
        <circle cx="200" cy="200" r="112" stroke="#C9A24A" strokeWidth="1.5" strokeDasharray="10 6" />
        <circle cx="200" cy="200" r="78" stroke="#C9A24A" strokeWidth="2.5" />
        <polygon
          fill="#E3B23C"
          points="200,162 206,188 228,170 212,193 238,192 214,203 235,218 209,211 218,236 200,216 182,236 191,211 165,218 186,203 162,192 188,193 172,170 194,188"
        />
      </svg>

      <div className="poster-content-layer">
        {/* 5 ảnh thời kỳ nối bằng sợi dây */}
        <div className="poster-era-strip">
          {[1, 2, 3, 4, 5].map((e) => (
            <figure key={e} className="poster-era-thumb" data-era={e}>
              <img src={ERAS_DATA[e].eraImg} alt={ERAS_DATA[e].shortRange} />
              <figcaption>{ERAS_DATA[e].shortRange}</figcaption>
            </figure>
          ))}
        </div>

        <div className="poster-question-box paper-texture">
          <span className="poster-question-tag">CÂU HỎI</span>
          <p className="poster-question-text">“{ENDING.question}”</p>
        </div>

        <div className="poster-affirmation-cluster">
          <div className="affirmation-main-badge">
            <div className="affirmation-main-text" aria-label={answer}>
              {[...answer].map((ch, i) => (
                <span key={i} className="poster-letter" style={{ animationDelay: `${i * 60}ms` }}>
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </div>
          </div>
          <div
            className={`constitutional-gold-seal ${animating ? "animate-stamp" : ""}`}
            onClick={handleSealClick}
            style={{ cursor: "pointer" }}
          >
            <span>⚖️</span>
            <span>PHÁP QUYỀN XHCN</span>
          </div>
        </div>

        <div className="pillars-bento-grid">
          {ENDING.points.map((pt, i) => (
            <article key={i} className="pillar-bento-card paper-texture">
              <span className="pillar-num-badge">Ý {i + 1}</span>
              <div>
                <div className="pillar-icon-box">{ICONS[i]}</div>
                <p className="pillar-card-quote">{pt}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Lưới 25 tem: 5 level × 5 phần */}
        <div className="poster-stamp-grid" aria-label={`${stampsEarned}/25 tem`}>
          {[1, 2, 3, 4, 5].map((e) =>
            ERAS_DATA[e].steps.map((s, i) => {
              const n = (e - 1) * 5 + i;
              return (
                <div key={n} className={`poster-stamp ${n < stampsEarned ? "on" : ""}`} data-era={e} title={`${s.year} · ${s.title}`}>
                  <span>{s.year}</span>
                </div>
              );
            }),
          )}
        </div>

        {(onReplay || footnote) && (
          <div className="poster-actions">
            {onReplay && (
              <button type="button" className="btn" onClick={onReplay}>
                ↻ Chơi lại từ Level 1
              </button>
            )}
            {footnote && <span className="poster-footnote">{footnote}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
````

**Sửa** `src/components/illustrations/UiIllustrationShowcase.tsx` — 1 chỗ (mỗi chỗ: tìm đúng đoạn TÌM, thay bằng đoạn THAY):

1. TÌM:

````tsx
          <TimelineRibbon
            currentEra={currentEra}
````

   THAY bằng:

````tsx
          <TimelineRibbon
            currentEra={currentEra}
            currentPart={currentStep - 1}
````

## Bước 3 — CSS

**Sửa** `src/components/illustrations/illustrations.css` — 2 việc.

1. TÌM khối reset toàn cục (gần đầu file, ngay trước dòng `/* Font helpers */`):

````css
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Be Vietnam Pro', sans-serif;
            background-color: #191512;
            background-image: 
                radial-gradient(circle at 20% 20%, rgba(201, 162, 74, 0.08) 0%, transparent 45%),
                radial-gradient(circle at 80% 80%, rgba(181, 56, 42, 0.08) 0%, transparent 45%),
                repeating-linear-gradient(45deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 2px, transparent 2px, transparent 8px);
            color: var(--ink);
            min-height: 100vh;
            overflow-x: hidden;
        }
````

   THAY bằng:

````css
        /* Reset CHỈ trong các khối minh họa (không đụng body / trang game). :where() giữ độ ưu tiên = 0. */
        :where(.ui-block-ribbon, .ui-block-polaroid-wrapper, .ui-block-splash-banner, .ui-block-conclusion-poster, .ui-block-portal-card),
        :where(.ui-block-ribbon, .ui-block-polaroid-wrapper, .ui-block-splash-banner, .ui-block-conclusion-poster, .ui-block-portal-card) * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
````

2. Dán khối sau vào **cuối file** (cách dòng cuối hiện có 1 dòng trống):

````css
/* ==========================================================================
   BẢN 5 — GẮN CÁC KHỐI VÀO MÀN CHƠI (theme sáng)
   ========================================================================== */

/* --- Tem bay vào ô khi qua cổng mốc (spec B3) --- */
@keyframes stampFly {
  0% { transform: translate(-38vw, 32vh) scale(1.4) rotate(-20deg); opacity: 0; }
  15% { opacity: 1; }
  75% { transform: translate(0, 0) scale(1.4) rotate(4deg); }
  100% { transform: translate(0, 0) scale(1) rotate(0); }
}
.postage-stamp-wrap.stamp-fly {
  animation: stampFly 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  z-index: 30;
}
.postage-stamp-wrap.stamp-fly .postage-stamp {
  box-shadow: 0 0 0 0.18em #FFD54F, 0 0 1.2em rgba(255, 213, 79, 0.9);
  transition: box-shadow 0.3s 0.7s;
}

/* --- Khung tư liệu: lật thẻ + Ken Burns + "đang rửa ảnh" (spec B4) --- */
@keyframes cardFlip {
  0% { transform: perspective(900px) rotateY(-90deg) rotate(-1.5deg); opacity: 0.2; }
  100% { transform: perspective(900px) rotateY(0) rotate(-1.5deg); opacity: 1; }
}
.polaroid-main-card.card-flip { animation: cardFlip 0.4s ease-out both; }
@keyframes kenBurns { from { transform: scale(1.04); } to { transform: scale(1); } }
.polaroid-art-viewport { position: relative; overflow: hidden; }
.polaroid-art-viewport.kenburns img { animation: kenBurns 1.2s ease-out both; }
@keyframes developing { 0%, 100% { filter: sepia(0.6) brightness(1.08); } 50% { filter: sepia(0.2) brightness(0.96); } }
.polaroid-art-viewport.developing .polaroid-art-fallback { animation: developing 1.4s ease-in-out infinite; }
.archive-year-num.is-long { font-size: 1.6em; }
.step-dot-btn:disabled { cursor: default; }

/* Biến thể "bottom": dưới canvas, ảnh 160 px, chữ cạnh ảnh */
.ui-block-polaroid-wrapper.polaroid-bottom { --w: 100%; width: 100%; max-width: 800px; font-size: 14px; }
.polaroid-bottom .polaroid-main-card { display: flex; gap: 1em; align-items: flex-start; transform: none; }
.polaroid-bottom .polaroid-main-card.card-flip { animation-name: none; }
.polaroid-bottom .polaroid-photo-frame { flex: 0 0 160px; width: 160px; }
.polaroid-bottom .polaroid-text { flex: 1; min-width: 0; }
.polaroid-bottom .paper-stack-layer-1,
.polaroid-bottom .paper-stack-layer-2 { display: none; }

/* --- Thẻ mở level phủ canvas (spec B5) --- */
.ui-block-splash-banner.splash-overlay {
  position: absolute;
  inset: 0;
  max-width: none;
  aspect-ratio: auto;
  border-radius: 0;
  border: none;
  box-shadow: none;
  z-index: 20;
  font-size: 13px;
  transition: transform 0.4s ease-in, opacity 0.4s ease-in;
}
.splash-overlay .splash-bg-art img { animation: splashZoom 2s linear both; }
@keyframes splashZoom { from { transform: scale(1); } to { transform: scale(1.08); } }
.splash-overlay.is-leaving { transform: translateX(-100%); opacity: 0.4; }

/* --- Poster kết: nền sáng (spec B6 + yêu cầu theme sáng) --- */
.ui-block-conclusion-poster {
  background: #FFF8E8 url("/art/poster.webp") center / cover no-repeat;
  color: var(--ink);
  border-color: #C9A24A;
  box-shadow: 0 0.4em 0 #9E7312, 0 1em 2em rgba(0, 0, 0, 0.18);
}
.ui-block-conclusion-poster::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(255, 248, 232, 0.82); /* làm sáng ảnh nền để chữ đọc được */
}
.poster-era-strip {
  position: relative;
  display: flex;
  justify-content: center;
  gap: 1.2em;
  margin-bottom: 1.2em;
}
.poster-era-strip::before { /* sợi dây nối 5 ảnh */
  content: "";
  position: absolute;
  left: 8%;
  right: 8%;
  top: 3em;
  border-top: 0.2em solid #8B5A2B;
}
.poster-era-thumb {
  position: relative;
  width: 6em;
  text-align: center;
  font: 600 0.75em/1.2 'Oswald', sans-serif;
}
.poster-era-thumb img {
  width: 6em;
  height: 6em;
  object-fit: cover;
  border: 0.25em solid var(--era-red);
  border-radius: 0.4em;
  background: #fff;
  display: block;
  margin-bottom: 0.3em;
}
@keyframes letterIn { from { opacity: 0; transform: translateY(0.4em) scale(1.3); } to { opacity: 1; transform: none; } }
.poster-letter { display: inline-block; animation: letterIn 0.3s ease-out both; }
.poster-stamp-grid {
  display: grid;
  grid-template-columns: repeat(25, 1fr);
  gap: 0.25em;
  margin-top: 1.2em;
}
.poster-stamp {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 0.12em dashed #B9A06E;
  border-radius: 0.2em;
  font: 700 0.5em/1 'JetBrains Mono', monospace;
  color: transparent;
  background: rgba(255, 255, 255, 0.5);
}
.poster-stamp.on {
  border: 0.12em solid var(--era-red);
  background: var(--era-surface);
  color: var(--era-red);
}
.poster-actions {
  position: relative;
  display: flex;
  gap: 1em;
  align-items: center;
  justify-content: center;
  margin-top: 1.2em;
}
.poster-footnote { font-size: 0.85em; color: #4A3220; }
@media (max-width: 700px) {
  .poster-stamp-grid { grid-template-columns: repeat(10, 1fr); }
  .poster-era-thumb { width: 4.5em; }
  .poster-era-thumb img { width: 4.5em; height: 4.5em; }
}

@media (prefers-reduced-motion: reduce) {
  .postage-stamp-wrap.stamp-fly,
  .polaroid-main-card.card-flip,
  .polaroid-art-viewport.kenburns img,
  .splash-overlay .splash-bg-art img,
  .poster-letter { animation: none; }
}
````

(Trang `/showcase` vẫn nền tối vì nó tự đặt nền trong `style` của component.)

✅ **Kiểm tra**

```bash
npx vitest run src/components/illustrations
```

Xanh 2 test. Mở `/showcase`: đổi Level 1→5, chọn P1..P5 — hàng tem dưới thanh thời gian là 5 tem của level đang chọn; khung tư liệu Level 1 phần 2 là ảnh `l1p2.jpg`; poster cuối trang nền kem sáng, chữ "KHÔNG MÂU THUẪN" hiện từng chữ, lưới 25 tem.
