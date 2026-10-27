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
