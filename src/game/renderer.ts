// src/game/renderer.ts
import { PHYS, PLAYER_SIZE, SLOT_COLORS, TILE, VIEW_W } from "../lib/constants";
import type { Level } from "./level";

export interface DrawPlayer {
  slot: string;
  x: number; // tâm, đơn vị ô
  y: number;
  name: string;
  avatar?: string;
}

export interface DrawState {
  players: DrawPlayer[];
  hasKey: boolean;
  won: boolean;
  /** Đang "Thua": slot của người gây ra + số giây đã trôi qua kể từ lúc thua (cho hoạt ảnh). */
  lose?: { slot: string; t: number } | null;
  levelName?: string;
  isLastLevel?: boolean;
}

const C = {
  bg: "#ffffff",
  solid: "#ff8a50",
  solidEdge: "#d9692f",
  spike: "#6b6b6b",
  door: "#c49a6c",
  doorOpen: "#8a6a45",
  key: "#ffd400",
  rope: "#8b5a2b",
  ink: "#222222",
};

const imgCache = new Map<string, HTMLImageElement>();

function getImage(src: string): HTMLImageElement | null {
  let img = imgCache.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    imgCache.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

function slotColor(slot: string): string {
  const i = Number(slot.slice(1));
  return SLOT_COLORS[(Number.isFinite(i) ? i : 0) % SLOT_COLORS.length];
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: DrawPlayer): void {
  const size = Math.round(PLAYER_SIZE * TILE);
  const x = Math.round(p.x * TILE - size / 2);
  const y = Math.round(p.y * TILE - size / 2);

  ctx.fillStyle = slotColor(p.slot);
  ctx.fillRect(x, y - 5, 7, 7); // tai trái
  ctx.fillRect(x + size - 7, y - 5, 7, 7); // tai phải
  ctx.fillRect(x, y, size, size); // thân (làm nền sau ảnh)

  const img = p.avatar ? getImage(p.avatar) : null;
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x + 3, y + 3, size - 6, size - 6);
  } else {
    ctx.fillStyle = C.ink; // mắt mặc định
    ctx.fillRect(x + 6, y + 9, 4, 5);
    ctx.fillRect(x + size - 10, y + 9, 4, 5);
  }

  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

  ctx.fillStyle = C.ink;
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(p.name, x + size / 2, y - 9);
}

/** Người gây ra thua: rung mạnh rồi yếu dần, nháy đỏ, mắt thành dấu X. */
function drawLostPlayer(ctx: CanvasRenderingContext2D, p: DrawPlayer, t: number): void {
  const size = Math.round(PLAYER_SIZE * TILE);
  const shake = Math.sin(t * 90) * 4 * Math.max(0, 1 - t / PHYS.loseDelay);
  ctx.save();
  ctx.translate(shake, 0);
  drawPlayer(ctx, p);
  const x = Math.round(p.x * TILE - size / 2);
  const y = Math.round(p.y * TILE - size / 2);
  if (Math.floor(t / 0.1) % 2 === 0) {
    ctx.fillStyle = "rgba(255,40,40,0.6)";
    ctx.fillRect(x, y - 5, size, size + 5);
  }
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  for (const ex of [x + 8, x + size - 8]) {
    ctx.beginPath();
    ctx.moveTo(ex - 3, y + 8);
    ctx.lineTo(ex + 3, y + 16);
    ctx.moveTo(ex + 3, y + 8);
    ctx.lineTo(ex - 3, y + 16);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRope(ctx: CanvasRenderingContext2D, a: DrawPlayer, b: DrawPlayer): void {
  const ax = a.x * TILE;
  const ay = a.y * TILE;
  const bx = b.x * TILE;
  const by = b.y * TILE;
  const dist = Math.hypot(bx - ax, by - ay) / TILE;
  const sag = Math.max(0, PHYS.ropeRest - dist) * TILE * 0.6; // chùng càng nhiều càng võng

  ctx.strokeStyle = C.rope;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag, bx, by);
  ctx.stroke();
}

export function drawMessage(ctx: CanvasRenderingContext2D, w: number, h: number, text: string): void {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = C.ink;
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, w / 2, h / 2);
}

export function drawFrame(ctx: CanvasRenderingContext2D, level: Level, s: DrawState): void {
  const W = VIEW_W;
  const H = level.h * TILE;
  const players = [...s.players].sort((a, b) => (a.slot < b.slot ? -1 : 1));

  const avgX = players.length ? players.reduce((t, p) => t + p.x, 0) / players.length : level.w / 2;
  const camX = Math.max(0, Math.min(level.w * TILE - W, avgX * TILE - W / 2));

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(-Math.round(camX), 0);

  // nền đặc
  for (const r of level.solids) {
    ctx.fillStyle = C.solid;
    ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
    ctx.fillStyle = C.solidEdge;
    ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, 3);
  }

  // gai
  ctx.fillStyle = C.spike;
  for (const sp of level.spikes) {
    const x = sp.x * TILE;
    const y = sp.y * TILE;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + TILE);
    ctx.lineTo(x + TILE / 2, y + TILE / 2);
    ctx.lineTo(x + TILE - 2, y + TILE);
    ctx.closePath();
    ctx.fill();
  }

  // cửa
  const d = level.door;
  if (d) {
    ctx.fillStyle = C.door;
    ctx.fillRect(d.x * TILE, d.y * TILE, d.w * TILE, d.h * TILE);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(d.x * TILE + 1, d.y * TILE + 1, d.w * TILE - 2, d.h * TILE - 2);
    if (s.hasKey) {
      ctx.fillStyle = C.doorOpen; // cửa "mở": phần ruột tối
      ctx.fillRect(d.x * TILE + 6, d.y * TILE + 6, d.w * TILE - 12, d.h * TILE - 12);
    }
  }

  // chìa khóa
  if (!s.hasKey && level.key) {
    ctx.fillStyle = C.key;
    ctx.beginPath();
    ctx.arc((level.key.x + 0.5) * TILE, (level.key.y + 0.5) * TILE, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // dây (vẽ trước người chơi để người chơi đè lên)
  for (let i = 0; i < players.length - 1; i++) drawRope(ctx, players[i], players[i + 1]);
  for (const p of players) {
    if (s.lose && p.slot === s.lose.slot) drawLostPlayer(ctx, p, s.lose.t);
    else drawPlayer(ctx, p);
  }

  ctx.restore();

  // HUD
  ctx.fillStyle = C.ink;
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(s.hasKey ? "Đã có chìa khóa — cả nhóm vào cửa!" : "Tìm chìa khóa", 10, 20);
  if (s.levelName) {
    ctx.textAlign = "right";
    ctx.fillText(s.levelName, W - 10, 20);
  }

  if (s.won) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.solid;
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(s.isLastLevel ? "ĐÃ HOÀN THÀNH TẤT CẢ LEVEL!" : "HOÀN THÀNH LEVEL!", W / 2, H / 2 - 6);
    ctx.fillStyle = C.ink;
    ctx.font = "16px sans-serif";
    ctx.fillText(s.isLastLevel ? "Host bấm R để chơi lại từ Level 1" : "Tự động sang level tiếp theo…", W / 2, H / 2 + 24);
  }

  if (s.lose) drawLoseOverlay(ctx, W, H, s.lose.t);
}

/** "THUA!": nền đỏ mờ dần hiện, chữ bật to rồi thu về đúng cỡ trong 0.25 giây. */
function drawLoseOverlay(ctx: CanvasRenderingContext2D, W: number, H: number, t: number): void {
  ctx.fillStyle = `rgba(211,47,47,${Math.min(0.35, t * 1.4)})`;
  ctx.fillRect(0, 0, W, H);

  const pop = 1 + Math.max(0, 1 - t / 0.25) * 1.2;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(pop, pop);
  ctx.textAlign = "center";
  ctx.font = "bold 72px sans-serif";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#fff";
  ctx.strokeText("THUA!", 0, 12);
  ctx.fillStyle = "#c62828";
  ctx.fillText("THUA!", 0, 12);
  ctx.restore();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Cả nhóm sẽ quay lại điểm xuất phát…", W / 2, H / 2 + 56);
}
