# Trang chơi co giãn theo màn hình — tài liệu code "bê vào là chạy"

Repo `mlngame`. Áp cho **cả Sandbox lẫn phòng online** (cả hai cùng dùng `GameStage`). Chỉ đổi 2 file.

## Vấn đề

- Khung chơi (thanh thời gian + canvas 800×512 + khung tư liệu) có kích thước cố định, cộng phần đầu trang và hướng dẫn phím thì cao khoảng 930 px.
- Laptop 100 % (cửa sổ cao khoảng 900 px) bị **cắt đáy canvas**. Máy lớn để 75 % thì vừa nhưng chữ nhỏ.
- Màn nhỏ hơn thì chỉ co theo chiều rộng, không co theo chiều cao → càng bị cắt.

## Cách làm

1. **Dựng khung ở kích thước cố định, rồi thu/phóng cả khối** (`transform: scale`) cho vừa **cả chiều rộng lẫn chiều cao còn lại** của cửa sổ. Mọi màn hình nhìn giống hệt nhau, chỉ to hay nhỏ khác nhau:
   - Khung rộng 1152 px.
   - Tỉ lệ = min(rộng còn lại ÷ 1152, cao còn lại ÷ cao khung), kẹp trong 0,4–1,4.
   - Màn to (hoặc máy chiếu) được phóng tới 1,4 lần. Laptop thấp thì thu nhỏ vừa khít.
   - Tính lại khi đổi cỡ cửa sổ, zoom trình duyệt, vào/ra toàn màn hình, hoặc khi khung đổi chiều cao (ví dụ đổi phần làm khung tư liệu cao lên).
2. **Màn dọc / hẹp** (rộng dưới 720 px, hoặc cửa sổ cao hơn rộng): khung tư liệu xuống dưới canvas (khung 840 px) và chỉ co theo chiều rộng, cho cuộn dọc.
3. **Nút toàn màn hình ⛶** ở góc trên phải canvas, dành cho máy chiếu. Khi toàn màn hình, khung phóng hết cỡ và căn giữa; bấm Esc hoặc ✕ để thoát.
4. **Màn thấp** (cửa sổ cao ≤ 900 px): thu gọn tiêu đề trang và viền máy arcade để khung chơi được to hơn.

Dự kiến: laptop 1920×1080 ở 100 % có cửa sổ cao khoảng 900 px. Đầu trang sau khi thu gọn còn khoảng 120 px, nên khung chơi co về khoảng 0,95 lần và **hiện trọn**. Màn 2560×1440 thì khung phóng khoảng 1,3 lần.

## Bước 1 — Thay toàn bộ `src/components/GameStage.tsx`

````tsx
// src/components/GameStage.tsx
// Bố cục trang chơi bản 5 (spec B1): thanh thời gian ở trên · canvas + khung tư liệu bên phải · thẻ mở level · poster kết.
// Co giãn theo màn hình: dựng khung ở KÍCH THƯỚC CỐ ĐỊNH rồi thu/phóng cả khối (transform: scale) cho vừa
// chiều rộng lẫn chiều cao còn lại của cửa sổ → mọi màn hình nhìn giống hệt nhau, chỉ to/nhỏ khác nhau.
// Màn dọc / hẹp (điện thoại): khung tư liệu xuống dưới canvas, co theo chiều rộng. Có nút toàn màn hình cho máy chiếu.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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
    if (part < 4) preload(partImage(levelId, part + 1));
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
                <ConclusionPoster stampsEarned={25} onReplay={onReplay} footnote={footnote} />
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
````

## Bước 2 — Thay toàn bộ `src/components/game-stage.css`

````css
/* src/components/game-stage.css — bố cục trang chơi bản 5 (spec B1), theme sáng.
   Khung .game-stage có KÍCH THƯỚC CỐ ĐỊNH (1152 px; hẹp: 840 px) và được GameStage thu/phóng bằng transform. */

/* trang chơi: rộng tới 1600 px để màn to được phóng to khung chơi */
.page.page-wide {
  max-width: 1600px;
}

/* hộp chiếm chỗ trong trang; chiều cao = chiều cao khung × tỉ lệ (GameStage đặt inline) */
.game-stage-fit {
  position: relative;
  width: 100%;
  overflow: hidden;
}
.game-stage-fit.is-fullscreen {
  width: 100vw;
  height: 100vh;
  background: var(--era-bg, #f4ebd9);
}

.game-stage {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
  border-radius: 10px;
  background: var(--era-bg, #f4ebd9);
  transition: background-color 600ms ease;
  transform-origin: top left;
}

.game-stage .ui-block-ribbon {
  --w: 1128px;
}

.game-stage-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.game-stage-row.is-narrow {
  flex-direction: column;
  align-items: stretch;
}

/* canvas luôn 800 × 512 trong khung cố định (cộng viền 8 px mỗi bên) */
.game-stage-canvas {
  position: relative;
  flex: 0 0 auto;
  width: 800px;
  overflow: hidden;
  border: 8px solid var(--stage-frame, #8a5a35);
  border-radius: 6px;
  box-shadow: 0 0 0 2px #231811, 0 6px 0 #231811;
  background: #fff;
}
.game-stage-canvas canvas {
  display: block;
  width: 800px;
  height: 512px;
  max-width: none;
  border: none;
  border-radius: 0;
}

.game-stage-side {
  flex: 0 0 296px;
  width: 296px;
}
.game-stage-side .ui-block-polaroid-wrapper {
  --w: 296px;
  margin: 0;
}
.game-stage-row.is-narrow .game-stage-side {
  flex: none;
  width: 816px;
}

/* nút toàn màn hình ở góc trên phải canvas */
.game-stage-fs {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 30;
  width: 30px;
  height: 30px;
  border: 2px solid #231811;
  border-radius: 6px;
  background: rgba(255, 250, 235, 0.85);
  color: #231811;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.55;
}
.game-stage-fs:hover {
  opacity: 1;
}

/* viền canvas theo thời kỳ (B1): gỗ · sắt · granite · navy viền vàng · vàng */
.game-stage[data-era="1"] { --stage-frame: #8a5a35; }
.game-stage[data-era="2"] { --stage-frame: #8fa3ad; }
.game-stage[data-era="3"] { --stage-frame: #b9bec2; }
.game-stage[data-era="4"] { --stage-frame: #14305c; }
.game-stage[data-era="5"] { --stage-frame: #e3b23c; }
.game-stage[data-era="1"] .game-stage-canvas { /* đinh tán */
  background-image: radial-gradient(circle, #3e2716 2px, transparent 2.5px);
}
.game-stage[data-era="4"] .game-stage-canvas { box-shadow: 0 0 0 2px #d9a92b, 0 6px 0 #231811; }

/* poster kết phủ khung canvas, cuộn được */
.game-stage-ending {
  position: absolute;
  inset: 0;
  z-index: 25;
  overflow-y: auto;
  padding: 10px;
  background: rgba(255, 248, 232, 0.96);
}
.game-stage-ending .ui-block-conclusion-poster {
  --w: 760px;
}

/* màn hình thấp (laptop 768–900 px): thu gọn phần đầu trang để khung chơi được to hơn */
@media (max-height: 900px) {
  .page.page-wide {
    padding-top: 8px;
  }
  .page.page-wide h1 {
    font-size: 22px;
  }
  .page.page-wide .arcade-shell {
    margin-top: 6px;
    padding: 6px;
  }
  .page.page-wide .arcade-bezel-header {
    padding: 4px 12px;
    font-size: 12px;
  }
}
````

## ✅ Kiểm tra

```bash
npx tsc -b
npm run build
```

Cả hai sạch. Code đã chạy `tsc`, `vite build`, `eslint` trên bản sao repo; **chưa mở trình duyệt** (theo yêu cầu không cần test kỹ).

Thử nhanh bằng tay (`npm run dev` → `/sandbox`):

- [ ] Zoom trình duyệt 100 %: thấy trọn canvas, không bị cắt đáy.
- [ ] Kéo cửa sổ hẹp lại hoặc thấp xuống: khung co lại theo, không có thanh cuộn ngang.
- [ ] Zoom 67 % trên màn lớn: khung **to lên** (tối đa 1,4 lần), không còn nhỏ xíu.
- [ ] DevTools → điện thoại dọc (390×844): khung tư liệu nằm dưới canvas, vừa chiều rộng.
- [ ] Bấm ⛶: toàn màn hình, khung căn giữa. Esc để thoát.
- [ ] Chơi vẫn đúng phím; thẻ mở level và poster kết vẫn phủ đúng canvas.

## Ghi chú

- Phóng hơn 1 lần thì canvas 800×512 bị kéo giãn, nên hơi mềm hình — giống lúc trình duyệt zoom trên 100 %. Nếu muốn nét hơn, đặt kích thước thật của canvas theo `devicePixelRatio × tỉ lệ` rồi `ctx.scale` trong `GameCanvas`/`Sandbox`. Việc này chưa làm ở đây.
- Sandbox: phím **F** đang dùng cho người chơi 4, nên toàn màn hình chỉ có nút bấm, không gán phím tắt.
