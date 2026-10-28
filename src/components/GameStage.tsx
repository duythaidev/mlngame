// src/components/GameStage.tsx
// Bố cục trang chơi bản 5 (spec B1): thanh thời gian ở trên · canvas + khung tư liệu bên phải · thẻ mở level · poster kết.
// Co giãn theo màn hình: dựng khung ở KÍCH THƯỚC CỐ ĐỊNH rồi thu/phóng cả khối (transform: scale) cho vừa
// chiều rộng lẫn chiều cao còn lại của cửa sổ → mọi màn hình nhìn giống hệt nhau, chỉ to/nhỏ khác nhau.
// Màn dọc / hẹp (điện thoại): khung tư liệu xuống dưới canvas, co theo chiều rộng. Có nút toàn màn hình cho máy chiếu.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Progress } from "../game/progress";
import { eraImage, partCountOf, partImage } from "../game/story";
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

// chiều rộng thiết kế (px): lề 12 + canvas 800 (+ viền 2×8) + khe 16 + khung tư liệu 296 + lề 12
const DESIGN_WIDE = 1152;
const DESIGN_NARROW = 840; // lề 12 + canvas 816 + lề 12
const MIN_SCALE = 0.4;
const MAX_SCALE = 1.4; // màn to / máy chiếu: phóng tối đa 1,4 lần
const BOTTOM_GAP = 12; // chừa dưới khung khi vừa chiều cao

interface Fit {
  scale: number;
  narrow: boolean;
  width: number; // chiều rộng thiết kế đang dùng
  height: number; // chiều cao tự nhiên của khung (chưa co giãn)
  left: number; // lề trái để căn giữa
  top: number; // lề trên (chỉ khi toàn màn hình: căn giữa dọc)
  fullscreen: boolean;
}

/** Đo chỗ còn lại của khung và tính tỉ lệ. outer = hộp chiếm chỗ trong trang, inner = khung kích thước cố định. */
function useFit(outer: RefObject<HTMLDivElement | null>, inner: RefObject<HTMLDivElement | null>): Fit {
  const [fit, setFit] = useState<Fit>({ scale: 1, narrow: false, width: DESIGN_WIDE, height: 0, left: 0, top: 0, fullscreen: false });

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const fullscreen = document.fullscreenElement === o;
      const availW = o.clientWidth;
      const pageTop = fullscreen ? 0 : o.getBoundingClientRect().top + window.scrollY; // vị trí khung khi trang ở đầu
      const availH = Math.max(240, window.innerHeight - pageTop - (fullscreen ? 0 : BOTTOM_GAP));
      const narrow = !fullscreen && (availW < 720 || availH > availW * 1.15); // điện thoại / cửa sổ dọc
      const width = narrow ? DESIGN_NARROW : DESIGN_WIDE;
      const height = i.offsetHeight; // transform không đổi kích thước bố cục → đây là chiều cao tự nhiên
      const byW = availW / width;
      const raw = narrow ? byW : Math.min(byW, height > 0 ? availH / height : byW); // hẹp: cuộn dọc được, chỉ vừa chiều rộng
      const scale = Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw)) * 1000) / 1000;
      const left = Math.max(0, (availW - width * scale) / 2);
      const top = fullscreen ? Math.max(0, (window.innerHeight - height * scale) / 2) : 0;
      setFit((p) =>
        p.scale === scale && p.narrow === narrow && p.height === height && p.left === left && p.top === top && p.fullscreen === fullscreen
          ? p
          : { scale, narrow, width, height, left, top, fullscreen },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    window.addEventListener("resize", measure);
    document.addEventListener("fullscreenchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      document.removeEventListener("fullscreenchange", measure);
    };
  }, [outer, inner]);

  return fit;
}

function preload(src: string): void {
  new Image().src = src;
}

export default function GameStage({ progress, children, onReplay, footnote }: Props) {
  const { era, part, won, levelId } = progress;
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const fit = useFit(outer, inner);
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
    if (part < partCountOf(levelId) - 1) preload(partImage(levelId, part + 1));
    if (era < 5) preload(eraImage(String(era + 1)));
  }, [era, part, levelId]);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void outer.current?.requestFullscreen();
  }

  const ending = won && era === 5;

  return (
    <div
      ref={outer}
      className={`game-stage-fit ${fit.fullscreen ? "is-fullscreen" : ""}`}
      data-era={era > 0 ? era : undefined}
      style={{ height: fit.fullscreen ? undefined : Math.ceil(fit.height * fit.scale) }}
    >
      <div
        ref={inner}
        className="game-stage"
        data-era={era > 0 ? era : undefined}
        style={{ width: fit.width, transform: `translate(${fit.left}px, ${fit.top}px) scale(${fit.scale})` }}
      >
        {era > 0 && <TimelineRibbon currentEra={era} currentPart={part} won={won} />}
        <div className={`game-stage-row ${fit.narrow ? "is-narrow" : ""}`}>
          <div className="game-stage-canvas">
            {children}
            {splashEra > 0 && <EraSplashBanner key={splashEra} currentEra={splashEra} overlay onDone={() => setSplashEra(0)} />}
            {ending && (
              <div className="game-stage-ending">
                <ConclusionPoster onReplay={onReplay} footnote={footnote} />
              </div>
            )}
            <button
              type="button"
              className="game-stage-fs"
              onClick={toggleFullscreen}
              title={fit.fullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình (chiếu máy chiếu)"}
            >
              {fit.fullscreen ? "✕" : "⛶"}
            </button>
          </div>
          {era > 0 && (
            <aside className="game-stage-side">
              <StoryPolaroidCard currentEra={era} currentStep={part + 1} variant={fit.narrow ? "bottom" : "side"} />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
