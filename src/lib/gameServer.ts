// src/lib/gameServer.ts
const raw = import.meta.env.VITE_GAME_SERVER_URL as string | undefined;

/** Địa chỉ game server (không có dấu / cuối). */
export const GAME_SERVER_URL = (raw ?? "http://localhost:3500").replace(/\/$/, "");

/** Chỉ dev: server chạy AUTH_DISABLED=1 nên gửi thẳng slot/name thay vì token. */
export const GAME_AUTH_OFF = (import.meta.env.VITE_GAME_AUTH_OFF as string | undefined) === "1";
