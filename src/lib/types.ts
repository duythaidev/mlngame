// src/lib/types.ts
export interface SlotInfo {
  uid: string;
  name: string;
  avatar?: string; // data-URL 32x32
}

export interface RoomMeta {
  name: string;
  max: number;
  phase: "lobby" | "playing";
  level: string;
  players?: Record<string, string>; // uid -> tên (để lobby/admin đếm người)
  results?: Record<string, number>; // levelId -> số giây cả nhóm hoàn thành (lần gần nhất, tính cả lần chết)
}

export interface Profile {
  name: string;
  avatar: string | null;
}
