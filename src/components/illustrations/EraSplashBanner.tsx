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
