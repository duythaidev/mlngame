// src/components/illustrations/ConclusionPoster.tsx
// Màn kết (spec B6): 5 ảnh thời kỳ nối dây · câu hỏi · "KHÔNG MÂU THUẪN" hiện từng chữ · 3 ý · lưới tem.
// Chữ lấy từ ENDING trong src/game/story.ts.
import React, { useState } from "react";
import { ENDING, stampsBefore } from "../../game/story";
import { maxStamps } from "./stamps";
import { ERAS_DATA } from "./erasData";

export interface ConclusionPosterProps {
  className?: string;
  id?: string;
  onReplaySeal?: () => void;
  /** Số tem đã thu; mặc định = tổng số phần của mọi level. */
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
  stampsEarned = maxStamps(),
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

        {/* Lưới tem: mỗi phần của mỗi level một tem */}
        <div className="poster-stamp-grid" aria-label={`${stampsEarned}/${maxStamps()} tem`}>
          {[1, 2, 3, 4, 5].map((e) =>
            ERAS_DATA[e].steps.map((s, i) => {
              const n = stampsBefore(e) + i;
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
