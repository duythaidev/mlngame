// src/net/gameSocket.ts
import { io, type Socket } from "socket.io-client";
import type { InputState, Snapshot } from "../game/protocol";
import { decodeSnapshot } from "./codec";

export type GameStatus = "connecting" | "playing" | "reconnecting" | "error";

export interface ConnectOptions {
  url: string;
  roomId: string;
  getIdToken: () => Promise<string>;
  /** Chỉ dev (server AUTH_DISABLED=1): gửi kèm { slot, name, levelId }. */
  extraJoin?: Record<string, unknown>;
  onSnap: (s: Snapshot) => void;
  onStatus: (s: GameStatus, detail?: string) => void;
}

export interface GameConnection {
  sendInput(i: InputState): void;
  restart(): void;
  /** Độ trễ vòng đi-về tới server (ms). Reject nếu quá 2 giây. */
  ping(): Promise<number>;
  close(): void;
}

export function connectGame(opts: ConnectOptions): GameConnection {
  const socket: Socket = io(opts.url, {
    transports: ["websocket"], // không long-polling: ổn định hơn qua Cloudflare Tunnel
    reconnection: true,
    reconnectionDelay: 300,
    reconnectionDelayMax: 3000,
  });
  let seq = 0;
  let closed = false;

  async function join(): Promise<void> {
    let idToken: string;
    try {
      idToken = await opts.getIdToken();
    } catch {
      if (!closed) opts.onStatus("error", "auth");
      return;
    }
    socket.emit("join", { roomId: opts.roomId, idToken, ...opts.extraJoin }, (res: { ok: boolean; error?: string }) => {
      if (closed) return;
      if (res.ok) opts.onStatus("playing");
      else opts.onStatus("error", res.error);
    });
  }

  socket.on("connect", () => void join());
  socket.on("connect_error", () => {
    if (!closed) opts.onStatus("reconnecting");
  });
  socket.on("disconnect", (reason) => {
    if (closed) return;
    // "io server disconnect" = server chủ động ngắt (bạn mở phòng này ở tab khác) → không tự nối lại
    if (reason === "io server disconnect") opts.onStatus("error", "replaced");
    else opts.onStatus("reconnecting");
  });
  socket.on("snap", (raw: string) => {
    const s = decodeSnapshot(raw);
    if (s) opts.onSnap(s);
  });

  return {
    sendInput(i) {
      socket.emit("in", { ...i, q: ++seq });
    },
    restart() {
      socket.emit("restart");
    },
    ping() {
      return new Promise<number>((resolve, reject) => {
        const t0 = performance.now();
        socket.timeout(2000).emit("echo", (err: Error | null) => {
          if (err) reject(err);
          else resolve(performance.now() - t0);
        });
      });
    },
    close() {
      closed = true;
      socket.disconnect();
    },
  };
}
