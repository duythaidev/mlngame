// src/lib/types.ts
export interface SlotInfo {
  uid: string;
  name: string;
  avatar?: string; // id nhân vật: soldier | volunteer | builder | scholar | farmer (xem src/game/characters.ts)
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

/** Tóm tắt một phòng do game server gửi admin mỗi giây (khớp RoomSummary + rank trong mln-server/src/ranking.ts). */
export interface RankedRoom {
  id: string;
  name: string;
  players: string[];
  levelId: string;
  part: number; // 0-based
  partCount: number;
  levelSeconds: number;
  completed: { levelId: string; seconds: number }[];
  totalSeconds: number;
  deaths: number;
  won: boolean;
  finished: boolean;
  startedAt: number | null;
  snap: string; // snapshot codec để vẽ ảnh thu nhỏ
  rank: number; // 0 = chưa bắt đầu
}
