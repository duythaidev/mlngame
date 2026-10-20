// src/lib/profile.ts
import type { Profile } from "./types";

const KEY = "pico-profile";

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Profile>;
      return { name: p.name ?? "", avatar: p.avatar ?? null };
    }
  } catch {
    /* localStorage bị chặn → dùng mặc định */
  }
  return { name: "", avatar: null };
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* bỏ qua */
  }
}
