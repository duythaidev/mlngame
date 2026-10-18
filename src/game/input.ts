// src/game/input.ts
import type { InputState } from "./protocol";

export interface KeyMap {
  left: string[];
  right: string[];
  jump: string[];
}

export const KEYS_ALL: KeyMap = {
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  jump: ["ArrowUp", "KeyW", "Space"],
};
export const KEYS_WASD: KeyMap = { left: ["KeyA"], right: ["KeyD"], jump: ["KeyW"] };
export const KEYS_ARROWS: KeyMap = { left: ["ArrowLeft"], right: ["ArrowRight"], jump: ["ArrowUp"] };

/** Gắn lắng nghe bàn phím. Trả về hàm gỡ. */
export function attachInput(onChange: (i: InputState) => void, keys: KeyMap = KEYS_ALL): () => void {
  const down = new Set<string>();
  const mine = new Set([...keys.left, ...keys.right, ...keys.jump]);
  let last = "";

  const pressed = (codes: string[]): 0 | 1 => (codes.some((c) => down.has(c)) ? 1 : 0);

  const emit = () => {
    const i: InputState = { l: pressed(keys.left), r: pressed(keys.right), j: pressed(keys.jump) };
    const sig = `${i.l}${i.r}${i.j}`;
    if (sig === last) return;
    last = sig;
    onChange(i);
  };

  const onDown = (e: KeyboardEvent) => {
    if (!mine.has(e.code)) return;
    e.preventDefault(); // chặn cuộn trang bằng mũi tên/space
    if (e.repeat) return;
    down.add(e.code);
    emit();
  };
  const onUp = (e: KeyboardEvent) => {
    if (!mine.has(e.code)) return;
    down.delete(e.code);
    emit();
  };
  const onBlur = () => {
    down.clear();
    emit();
  };

  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", onBlur);
  return () => {
    window.removeEventListener("keydown", onDown);
    window.removeEventListener("keyup", onUp);
    window.removeEventListener("blur", onBlur);
  };
}
