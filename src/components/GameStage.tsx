// src/components/GameStage.tsx
// Bố cục trang chơi bản 5 (spec B1): thanh thời gian ở trên · canvas + khung tư liệu bên phải
// (dưới 960 px: khung tư liệu xuống dưới canvas) · thẻ mở level phủ canvas · poster kết.
import { useEffect, useState, type ReactNode } from "react";
import type { Progress } from "../game/progress";
import { eraImage, partImage } from "../game/story";
import { ConclusionPoster } from "./illustrations/ConclusionPoster";
import { EraSplashBanner } from "./illustrations/EraSplashBanner";
import { StoryPolaroidCard } from "./illustrations/StoryPolaroidCard";
import { TimelineRibbon } from "./illustrations/TimelineRibbon";
import "./illustrations/illustrations.css";
import "./game-stage.css";

interface Props {
  progress: Progress;
  children: ReactNode; // khung canvas
  onReplay?: () => void;
  footnote?: string;
}

const NARROW = "(max-width: 959px)";

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

function preload(src: string): void {
  new Image().src = src;
}

export default function GameStage({ progress, children, onReplay, footnote }: Props) {
  const { era, part, won, levelId } = progress;
  const narrow = useNarrow();
  const [splashEra, setSplashEra] = useState(0);
  const [lastEra, setLastEra] = useState(0);

  // vào level mới (kể cả lần đầu) → hiện thẻ mở level; level luyện tập (era 0) thì không
  if (era !== lastEra) {
    setLastEra(era);
    setSplashEra(era);
  }

  // tải trước ảnh phần kế và bìa level kế để khung tư liệu không bị trắng
  useEffect(() => {
    if (era <= 0) return;
    if (part < 4) preload(partImage(levelId, part + 1));
    if (era < 5) preload(eraImage(String(era + 1)));
  }, [era, part, levelId]);

  const ending = won && era === 5;

  return (
    <div className="game-stage" data-era={era > 0 ? era : undefined}>
      {era > 0 && <TimelineRibbon currentEra={era} currentPart={part} won={won} />}
      <div className={`game-stage-row ${narrow ? "is-narrow" : ""}`}>
        <div className="game-stage-canvas">
          {children}
          {splashEra > 0 && <EraSplashBanner key={splashEra} currentEra={splashEra} overlay onDone={() => setSplashEra(0)} />}
          {ending && (
            <div className="game-stage-ending">
              <ConclusionPoster stampsEarned={25} onReplay={onReplay} footnote={footnote} />
            </div>
          )}
        </div>
        {era > 0 && (
          <aside className="game-stage-side">
            <StoryPolaroidCard currentEra={era} currentStep={part + 1} variant={narrow ? "bottom" : "side"} />
          </aside>
        )}
      </div>
    </div>
  );
}
