// src/components/illustrations/UiIllustrationShowcase.tsx
import React, { useState, useEffect } from "react";
import "./illustrations.css";
import { ERAS_DATA } from "./erasData";
import { TimelineRibbon } from "./TimelineRibbon";
import { StoryPolaroidCard } from "./StoryPolaroidCard";
import { EraSplashBanner } from "./EraSplashBanner";
import { MilestonePortalCard } from "./MilestonePortalCard";
import { ConclusionPoster } from "./ConclusionPoster";

export const UiIllustrationShowcase: React.FC = () => {
  const [currentEra, setCurrentEra] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState<number>(3);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(scale));
  }, [scale]);

  const handleSelectEra = (id: number) => {
    setCurrentEra(id);
    replayStampAnimations();
  };

  const replayStampAnimations = () => {
    const stamps = document.querySelectorAll(".animate-stamp");
    stamps.forEach((el) => {
      el.classList.remove("animate-stamp");
      void (el as HTMLElement).offsetWidth;
      el.classList.add("animate-stamp");
    });
  };

  return (
    <div
      data-era={String(currentEra)}
      style={{
        minHeight: "100vh",
        backgroundColor: "#191512",
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(201, 162, 74, 0.08) 0%, transparent 45%),
          radial-gradient(circle at 80% 80%, rgba(181, 56, 42, 0.08) 0%, transparent 45%),
          repeating-linear-gradient(45deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 2px, transparent 2px, transparent 8px)
        `,
        color: "var(--ink)",
      }}
    >
      {/* THANH ĐIỀU KHIỂN THỜI KỲ (ERA SWITCHER LEVEL 1 -> 5) */}
      <header className="showcase-header">
        <div className="header-inner">
          <div className="brand-badge">
            <div className="brand-star">★</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h1
                  className="font-oswald"
                  style={{
                    fontSize: "18px",
                    color: "#FFFDF7",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    margin: 0,
                  }}
                >
                  BỘ KHỐI UI MINH HỌA LỊCH SỬ & PHÁP QUYỀN (MLN131)
                </h1>
                <span
                  className="font-mono-code"
                  style={{
                    fontSize: "10px",
                    background: "rgba(227,178,60,0.2)",
                    color: "#FFD54F",
                    border: "1px solid rgba(227,178,60,0.45)",
                    padding: "2px 8px",
                    borderRadius: "99px",
                  }}
                >
                  5 VISUAL ARTIFACT BLOCKS
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#B0A292", marginTop: "2px", marginBottom: 0 }}>
                Bấm chọn Level 1 → 5 để đổi Bảng màu Thời kỳ (Color Tokens), Nội dung Tư liệu, Tranh khắc gỗ & Cổng kiến trúc
              </p>
            </div>
          </div>

          {/* 5 Nút chuyển đổi Level 1 -> 5 */}
          <div className="era-switcher" id="eraSwitcher">
            {[1, 2, 3, 4, 5].map((id) => {
              const e = ERAS_DATA[id];
              const swatches: Record<number, string> = {
                1: "#B5382A",
                2: "#8FA3AD",
                3: "#2E8B7A",
                4: "#14305C",
                5: "#E3B23C",
              };
              return (
                <button
                  key={id}
                  type="button"
                  className={`era-btn ${currentEra === id ? "active" : ""}`}
                  onClick={() => handleSelectEra(id)}
                >
                  <span className="era-swatch" style={{ background: swatches[id] }} />
                  Level {id}: {e.shortRange}
                </button>
              );
            })}
          </div>

          {/* Điều chỉnh tỷ lệ co giãn & Đóng dấu lại */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label
              className="font-mono-code"
              style={{
                fontSize: "11px",
                color: "#D6C7B2",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Co giãn:
              <input
                type="range"
                min="0.8"
                max="1.15"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                style={{ width: "75px", accentColor: "#E3B23C", cursor: "pointer" }}
              />
            </label>
            <button
              type="button"
              onClick={replayStampAnimations}
              className="font-mono-code"
              style={{
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 700,
                padding: "7px 11px",
                borderRadius: "8px",
                background: "#2B211B",
                color: "#FFD54F",
                border: "1px solid #C9A24A",
              }}
            >
              💮 Đóng dấu lại
            </button>
          </div>
        </div>
      </header>

      {/* KHÔNG GIAN TRÌNH DIỄN 5 KHỐI UI ĐỒ HỌA MINH HỌA */}
      <main className="showcase-container" id="showcaseContainer">
        {/* 📦 KHỐI 2: DẢI TEM HUY HIỆU & TIẾN TRÌNH LỊCH SỬ (72px Top Bar) */}
        <section className="block-stage">
          <div className="stage-label-bar">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="stage-tag">📦 KHỐI 2 · TOP BAR 72PX</span>
              <h2 className="stage-title">Dải Tem Huy Hiệu & Tiến Trình Lịch Sử (Timeline & Postage Stamp Ribbon)</h2>
            </div>
            <span className="stage-desc">
              Viền tem răng cưa CSS radial-gradient • Con dấu bưu chính đóng nghiêng 14° • Hào quang nhịp thở
            </span>
          </div>

          <TimelineRibbon
            currentEra={currentEra}
            currentPart={currentStep - 1}
            onSelectEra={handleSelectEra}
          />
        </section>

        {/* HÀNG GIỮA: KHỐI 1 (THẺ TƯ LIỆU DÁN GHIM) + KHỐI 3 (THẺ NIÊM PHONG MỞ MÀN) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "28px",
            alignItems: "start",
          }}
        >
          {/* 📦 KHỐI 1: THẺ TƯ LIỆU DÁN GHIM (Story Archive Polaroid Card - 296px Sidebar) */}
          <section
            className="block-stage"
            style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <div className="stage-label-bar" style={{ width: "100%" }}>
              <div>
                <span className="stage-tag">📦 KHỐI 1 · SIDEBAR 296PX</span>
                <h2 className="stage-title" style={{ marginTop: "4px" }}>
                  Thẻ Tư Liệu Dán Ghim (Story Archive Polaroid Card)
                </h2>
              </div>
              {/* Bộ chọn nhanh 5 chặng trong Level */}
              <div style={{ display: "flex", gap: "4px" }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCurrentStep(s)}
                    className="font-mono-code"
                    style={{
                      cursor: "pointer",
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "3px 7px",
                      borderRadius: "5px",
                      border: `1px solid ${s === currentStep ? "#FFD54F" : "rgba(255,255,255,0.2)"}`,
                      background: s === currentStep ? "var(--era-red)" : "#16120F",
                      color: "#FFF",
                    }}
                  >
                    P{s}
                  </button>
                ))}
              </div>
            </div>

            <StoryPolaroidCard
              currentEra={currentEra}
              currentStep={currentStep}
              onSelectStep={setCurrentStep}
            />
          </section>

          {/* 📦 KHỐI 3: THẺ NIÊM PHONG MỞ MÀN THỜI KỲ (Era Splash Seal Banner) */}
          <section className="block-stage">
            <div className="stage-label-bar">
              <div>
                <span className="stage-tag">📦 KHỐI 3 · ERA SPLASH BANNER</span>
                <h2 className="stage-title" style={{ marginTop: "4px" }}>
                  Thẻ Niêm Phong Mở Màn Thời Kỳ (Era Splash Seal Banner)
                </h2>
              </div>
              <span className="stage-desc">
                Con dấu niêm phong răng cưa kép xoay -12° • Nền tranh thời kỳ `/art/era{'{L}'}.webp`
              </span>
            </div>

            <EraSplashBanner
              currentEra={currentEra}
              onReplaySeal={replayStampAnimations}
            />
          </section>
        </div>

        {/* 📦 KHỐI 5: CỔNG CHÀO MỐC LỊCH SỬ (Milestone Portal Arch Block) */}
        <section className="block-stage">
          <div className="stage-label-bar">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="stage-tag">📦 KHỐI 5 · MILESTONE PORTAL ARCH</span>
              <h2 className="stage-title">
                Cổng Chào Mốc Lịch Sử Đặc Trưng Theo 5 Thời Kỳ (Kiến Trúc Việt Nam)
              </h2>
            </div>
            <span className="stage-desc">
              Cổng làng gạch đỏ (Lv1) • Cổng nhà máy dầm chữ H (Lv2) • Vòm đá cẩm thạch (Lv3) • Khung thép Navy (Lv4) • Cổng Hoàng kim (Lv5)
            </span>
          </div>

          <MilestonePortalCard
            currentEra={currentEra}
            onSelectEra={handleSelectEra}
          />
        </section>

        {/* 📦 KHỐI 4: KHỐI POSTER LUẬN ĐIỂM KẾT LUẬN (3-Pillar Conclusion Poster) */}
        <section className="block-stage">
          <div className="stage-label-bar">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="stage-tag">📦 KHỐI 4 · 3-PILLAR CONCLUSION POSTER</span>
              <h2 className="stage-title">
                Khối Poster Luận Điểm Kết Luận — Trả Lời Trực Diện Câu Hỏi Lớn
              </h2>
            </div>
            <span className="stage-desc">
              Họa tiết Trống đồng Đông Sơn mạ vàng (`/art/poster.webp`) • Huy hiệu dập nổi • 3 Thẻ Bento Luận điểm
            </span>
          </div>

          <ConclusionPoster onReplaySeal={replayStampAnimations} />
        </section>
      </main>
    </div>
  );
};

export default UiIllustrationShowcase;
