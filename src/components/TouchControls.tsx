// src/components/TouchControls.tsx
// Nút cảm ứng cho điện thoại. Bấm/thả nút = phát sự kiện bàn phím giả (ArrowLeft/Right/Up, KeyR)
// nên mọi chỗ đang nghe bàn phím (attachInput, phím R của host) hoạt động y hệt, không cần sửa logic game.
import { useEffect, useState, type PointerEvent } from "react";

function sendKey(type: "keydown" | "keyup", code: string): void {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
}

function HoldButton({ code, label, wide }: { code: string; label: string; wide?: boolean }) {
  const down = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId); // ngón tay trượt ra ngoài nút vẫn giữ phím
    sendKey("keydown", code);
  };
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    sendKey("keyup", code);
  };
  return (
    <button
      type="button"
      className={`touch-btn${wide ? " wide" : ""}`}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

/** Chỉ hiện trên thiết bị cảm ứng (hoặc khi URL có ?touch=1 để thử trên máy tính). */
export default function TouchControls({ showRestart }: { showRestart?: boolean }) {
  const [enabled, setEnabled] = useState(
    () =>
      new URLSearchParams(window.location.search).has("touch") ||
      window.matchMedia("(pointer: coarse)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const onChange = () => setEnabled(mq.matches || new URLSearchParams(window.location.search).has("touch"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (!enabled) return null;
  return (
    <div className="touch-controls">
      <div className="touch-group">
        <HoldButton code="ArrowLeft" label="◀" />
        <HoldButton code="ArrowRight" label="▶" />
      </div>
      {showRestart && <HoldButton code="KeyR" label="R" />}
      <HoldButton code="ArrowUp" label="NHẢY" wide />
    </div>
  );
}
