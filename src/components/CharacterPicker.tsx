// src/components/CharacterPicker.tsx
// Chọn 1 trong 4 nhân vật pixel (lưu id vai vào profile.avatar) + ảnh xem trước vẽ đúng sprite trong game.
import { useEffect, useRef } from "react";
import { drawCharacter, ROLES, roleOf, SPRITE_H, SPRITE_W, type RoleId } from "../game/characters";

/** Sprite xem trước; walk = đi tại chỗ (đổi hướng mỗi 1,6 giây), không thì đứng yên. */
export function CharacterPreview({ role, scale = 3, walk = false }: { role: RoleId; scale?: number; walk?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const W = SPRITE_W * scale;
    const H = SPRITE_H * scale + scale;
    const paint = (frame: number, face: 1 | -1) => {
      ctx.clearRect(0, 0, W, H);
      drawCharacter(ctx, role, walk ? "walk" : "idle", frame, face, W / 2, H, scale);
    };
    if (!walk) {
      paint(0, 1);
      return;
    }
    let n = 0;
    paint(0, 1);
    const id = window.setInterval(() => {
      n++;
      paint(n, Math.floor(n / 9) % 2 === 0 ? 1 : -1);
    }, 180);
    return () => window.clearInterval(id);
  }, [role, scale, walk]);
  return <canvas ref={ref} width={SPRITE_W * scale} height={SPRITE_H * scale + scale} style={{ imageRendering: "pixelated", display: "block" }} />;
}

interface Props {
  value: string | null | undefined;
  onChange: (role: RoleId) => void;
}

export default function CharacterPicker({ value, onChange }: Props) {
  const current = roleOf(value);
  return (
    <div className="preset-avatars-grid">
      {ROLES.map((r) => (
        <button
          type="button"
          key={r.id}
          className={`preset-avatar-btn ${current === r.id ? "selected" : ""}`}
          onClick={() => onChange(r.id)}
        >
          <CharacterPreview role={r.id} scale={3} walk={current === r.id} />
          <span>{r.name}</span>
        </button>
      ))}
    </div>
  );
}
