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
