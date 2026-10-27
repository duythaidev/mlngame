// src/net/adminSocket.ts
// Kết nối admin tới game server: nhận tóm tắt mọi phòng 1 lần/giây ("rooms"), snapshot phòng đang xem to
// 5 lần/giây ("focus"), gửi lệnh bắt đầu / nhảy level / xóa. Không gửi phím, không chiếm chỗ trong phòng.
import { io, type Socket } from "socket.io-client";
import type { Snapshot } from "../game/protocol";
import type { RankedRoom } from "../lib/types";
import { decodeSnapshot } from "./codec";

export type AdminStatus = "connecting" | "ready" | "reconnecting" | "error";
export type AdminAck = { ok: true } | { ok: false; error: string };
export type AdminAction = "start" | "goto" | "remove";

export interface AdminConnectOptions {
  url: string;
  getIdToken: () => Promise<string>;
  onRooms: (rooms: RankedRoom[]) => void;
  onFocus: (roomId: string, snap: Snapshot) => void;
  onStatus: (s: AdminStatus, detail?: string) => void;
}

export interface AdminConnection {
  /** Phòng muốn xem to (null = thôi xem). Tự gửi lại sau khi nối lại. */
  focus(roomId: string | null): void;
  command(action: AdminAction, rooms: { id: string; name: string }[], levelId?: string): Promise<AdminAck>;
  close(): void;
}

export function connectAdmin(opts: AdminConnectOptions): AdminConnection {
  const socket: Socket = io(opts.url, { transports: ["websocket"], reconnection: true, reconnectionDelayMax: 3000 });
  let closed = false;
  let focused: string | null = null;

  async function hello(): Promise<void> {
    let idToken: string;
    try {
      idToken = await opts.getIdToken();
    } catch {
      if (!closed) opts.onStatus("error", "auth");
      return;
    }
    socket.emit("admin:hello", { idToken }, (res: AdminAck) => {
      if (closed) return;
      if (!res.ok) return opts.onStatus("error", res.error);
      opts.onStatus("ready");
      if (focused) socket.emit("admin:focus", focused);
    });
  }

  socket.on("connect", () => void hello());
  socket.on("connect_error", () => !closed && opts.onStatus("reconnecting"));
  socket.on("disconnect", () => !closed && opts.onStatus("reconnecting"));
  socket.on("rooms", (rows: RankedRoom[]) => opts.onRooms(rows));
  socket.on("focus", (m: { id: string; snap: string }) => {
    const s = decodeSnapshot(m.snap);
    if (s && m.id === focused) opts.onFocus(m.id, s);
  });

  return {
    focus(roomId) {
      focused = roomId;
      socket.emit("admin:focus", roomId);
    },
    command(action, rooms, levelId) {
      return new Promise((resolve) => {
        socket.timeout(5000).emit("admin:cmd", { action, rooms, levelId }, (err: Error | null, res: AdminAck) =>
          resolve(err ? { ok: false, error: "timeout" } : res),
        );
      });
    },
    close() {
      closed = true;
      socket.disconnect();
    },
  };
}
