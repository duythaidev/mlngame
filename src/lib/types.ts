// src/lib/types.ts
export interface SlotInfo {
  uid: string;
  name: string;
  avatar?: string; // id nhân vật: soldier | volunteer | builder | scholar (xem src/game/characters.ts)
}

export interface RoomMeta {
  name: string;
  max: number;
  phase: "lobby" | "playing";
  level: string;
  players?: Record<string, string>; // uid -> tên (để lobby/admin đếm người)
}

export interface Profile {
  name: string;
  avatar: string | null;
}

export interface ResultRow {
  roomId: string;
  roomName: string;
  levelId: string;
  seconds: number;
  players: string[];
  createdAt: number;
}
