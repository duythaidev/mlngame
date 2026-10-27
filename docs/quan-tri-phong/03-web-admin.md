# 03 · Web: bàn quản trị mới (repo `mlngame`)

- Nút **▶ Bắt Đầu Tất Cả** / **■ Dừng Tất Cả**; từng phòng có Bắt đầu, Dừng, Xem to, Tới level…, Link, Xóa.
- **Bảng xếp hạng trực tiếp** (cập nhật mỗi giây, top 3 tô màu).
- **Lưới ảnh thu nhỏ** mọi phòng: vẽ bằng đúng renderer của game, **1 lần/giây** (không có luồng vị trí liên tục).
- **Xem to** một phòng: server gửi 5 lần/giây, web nội suy trễ 250 ms nên vẫn mượt 60 hình/giây.
- Renderer: mỗi canvas có bộ hiệu ứng riêng (`createFx`) để nhiều phòng trên một trang không lẫn hạt / tư thế.

Bắt đầu = gửi lệnh `start` tới game server **trước** (lỗi thì dừng, báo lỗi), rồi mới đổi `phase` trong Firebase sang `playing` để người chơi vào màn chơi. Dừng = đổi `phase` về `lobby` (giữ kết quả để xếp hạng).

**Thay toàn bộ** `src/lib/types.ts`:

````ts
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
````

**Thay toàn bộ** `src/lib/rooms.ts`:

````ts
// src/lib/rooms.ts
import { get, onDisconnect, push, ref, remove, set, update } from "firebase/database";
import { db } from "./firebase";
import type { Profile, SlotInfo } from "./types";

export async function createRoom(name: string, max: number, level = "1"): Promise<string> {
  const id = push(ref(db, "roomList")).key;
  if (!id) throw new Error("Không sinh được id phòng");
  const allowed = Object.fromEntries(Array.from({ length: max }, (_, i) => [`s${i}`, true]));
  await update(ref(db), {
    [`rooms/${id}/allowed`]: allowed,
    [`roomList/${id}`]: { name, max, phase: "lobby", level },
  });
  return id;
}

export async function deleteRoom(id: string): Promise<void> {
  await update(ref(db), { [`rooms/${id}`]: null, [`roomList/${id}`]: null });
}

export async function joinRoom(
  roomId: string,
  uid: string,
  profile: Profile,
): Promise<{ slot: string; leave: () => Promise<void> }> {
  const allowed = (await get(ref(db, `rooms/${roomId}/allowed`))).val() as Record<string, boolean> | null;
  if (!allowed) throw new Error("Phòng không tồn tại");

  const data: SlotInfo = { uid, name: profile.name.trim().slice(0, 20) };
  if (profile.avatar) data.avatar = profile.avatar; // RTDB không nhận giá trị undefined

  for (const slot of Object.keys(allowed).sort()) {
    const slotRef = ref(db, `rooms/${roomId}/slots/${slot}`);
    try {
      await set(slotRef, data);
    } catch {
      continue; // PERMISSION_DENIED = ô đã có người khác
    }

    const playerRef = ref(db, `roomList/${roomId}/players/${uid}`);
    const dropSlot = onDisconnect(slotRef);
    const dropPlayer = onDisconnect(playerRef);

    await dropSlot.remove();
    await dropPlayer.remove();
    await set(playerRef, data.name);

    return {
      slot,
      leave: async () => {
        await Promise.all([dropSlot.cancel(), dropPlayer.cancel()]);
        await Promise.all([remove(playerRef), remove(slotRef)]);
      },
    };
  }
  throw new Error("Phòng đã đầy");
}

/** Admin đổi trạng thái nhiều phòng cùng lúc (playing = người chơi vào màn chơi, lobby = về sảnh chờ). */
export async function setRoomsPhase(ids: string[], phase: "lobby" | "playing"): Promise<void> {
  if (ids.length === 0) return;
  await update(ref(db), Object.fromEntries(ids.map((id) => [`roomList/${id}/phase`, phase])));
}
````

**Tạo mới** `src/net/adminSocket.ts`:

````ts
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
````

**Thay toàn bộ** `src/game/renderer.ts`:

````ts
// src/game/renderer.ts
// Điều phối vẽ một khung (bản 5). Hình vẽ nằm ở src/theme/*; file này chỉ đọc trạng thái và gọi theo thứ tự:
// trời + nền 2 lớp → đạo cụ → gạch → gai → trần → cổng mốc → cửa → vật thể → dây → người → vật đang mang → hạt → góc tối.
import { PHYS, PLAYER_SIZE, SLOT_COLORS, TILE, VIEW_W } from "../lib/constants";
import { drawCharacter, MotionTracker, roleOf, SPRITE_H, SPRITE_W, type Motion } from "./characters";
import { drawBackdrop, drawVignette } from "../theme/backdrop";
import { drawCheckpointFlag, drawDoor, drawMilestone, milestones } from "../theme/gates";
import {
  constitutionYear,
  drawBallotBox,
  drawBox,
  drawBridge,
  drawCarryItem,
  drawCeiling,
  drawConveyor,
  drawCrumble,
  drawGate,
  drawGoal,
  drawHazard,
  drawIce,
  drawLeaderFlag,
  drawLift,
  drawMover,
  drawPad,
  drawSeesaw,
  drawSlowZone,
  drawWordArch,
  hazardStyle,
  pillarIcon,
  px,
  type R,
} from "../theme/mechanics";
import { label as drawLabel } from "../theme/draw";
import { themeFor, type Theme } from "../theme/palette";
import { Particles, Shake } from "../theme/particles";
import { drawProps } from "../theme/props";
import { drawSolids, drawSpikes } from "../theme/tiles";
import { partAt, type Level, type ObjDef, type Rect } from "./level";
import { carryState, crowdNeed, isActive, moverPadCount, objBit, sigBit, sigNeed, sigSources, type ObjView } from "./objects";
import { label as labelText, PARTS } from "./story";

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
  /** Trạng thái vật thể từ snapshot (null = level không có vật thể). */
  view?: ObjView | null;
  /** Vị trí thang/sàn chở/khối/khối đỏ đã nội suy (góc trên-trái); không có thì lấy từ view. */
  bodies?: [number, number][];
  /** Thời gian (giây) cho hoạt ảnh. */
  time?: number;
  /** Bộ hiệu ứng riêng của canvas này (createFx); không truyền = bộ mặc định của trang. */
  fx?: Fx;
}

const INK = "#222222";

// ------------------------------------------------------------------ hiệu ứng theo thời gian
// Nhớ trạng thái khung trước để bắn hạt đúng lúc đổi (qua cổng, sàn vỡ, khối "Bãi bỏ" vào đích…).
// Mỗi canvas một bộ (createFx) — trang admin vẽ nhiều phòng cùng lúc; trang chơi dùng bộ mặc định.
export function createFx() {
  return {
    levelId: "",
    lastT: 0,
    cp: 0,
    passAt: new Map<number, number>(), // cp → thời điểm (giây) qua cổng mốc
    bits: new Map<number, boolean>(), // object id → bit khung trước
    counts: new Map<number, number>(), // hòm phiếu / khung chữ → số đã nộp khung trước
    won: false,
    particles: new Particles(200),
    shake: new Shake(),
    motion: new MotionTracker(), // tư thế đứng / đi của từng người
  };
}

export type Fx = ReturnType<typeof createFx>;

const defaultFx = createFx();

function resetFx(fx: Fx, levelId: string, t: number): void {
  fx.levelId = levelId;
  fx.cp = 0;
  fx.passAt.clear();
  fx.bits.clear();
  fx.counts.clear();
  fx.won = false;
  fx.particles.clear();
  fx.motion.reset();
  fx.lastT = t;
}

/** Bit đổi từ false → true kể từ khung trước? */
function rose(fx: Fx, id: number, now: boolean): boolean {
  const before = fx.bits.get(id) ?? now;
  fx.bits.set(id, now);
  return now && !before;
}

// ------------------------------------------------------------------ người chơi, dây

const SPRITE_PX = 2; // px màn hình mỗi ô pixel của sprite

function slotColor(slot: string): string {
  const i = Number(slot.slice(1));
  return SLOT_COLORS[(Number.isFinite(i) ? i : 0) % SLOT_COLORS.length];
}

/** Mặt đất dưới chân người chơi (px) = đáy hitbox. */
function feetOf(p: DrawPlayer): number {
  return Math.round((p.y + PLAYER_SIZE / 2) * TILE);
}

/** Nhân vật pixel theo vai + tư thế; vòng màu chỗ ngồi dưới chân và tên trên đầu để phân biệt người chơi. */
function drawPlayer(ctx: CanvasRenderingContext2D, p: DrawPlayer, m: Motion): void {
  const cx = p.x * TILE;
  const feet = feetOf(p);
  const color = slotColor(p.slot);

  ctx.fillStyle = "rgba(0,0,0,0.2)"; // bóng đổ
  ctx.beginPath();
  ctx.ellipse(cx, feet + 1, 11, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color; // vòng màu chỗ ngồi
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, feet + 1, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  drawCharacter(ctx, roleOf(p.avatar, p.slot), m.pose, m.frame, m.face, cx, feet, SPRITE_PX);
}

/** Người gây ra thua: rung mạnh rồi yếu dần, nháy đỏ, mắt thành dấu X. */
function drawLostPlayer(ctx: CanvasRenderingContext2D, p: DrawPlayer, m: Motion, t: number): void {
  const shake = Math.sin(t * 90) * 4 * Math.max(0, 1 - t / PHYS.loseDelay);
  const still: Motion = { pose: "idle", frame: 0, face: m.face };
  ctx.save();
  ctx.translate(shake, 0);
  drawPlayer(ctx, p, still);
  const w = SPRITE_W * SPRITE_PX;
  const h = SPRITE_H * SPRITE_PX;
  const x0 = p.x * TILE - w / 2;
  const y0 = feetOf(p) - h;
  if (Math.floor(t / 0.1) % 2 === 0) {
    ctx.fillStyle = "rgba(255,40,40,0.55)";
    ctx.fillRect(x0, y0, w, h);
  }
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  for (const col of [8.5, 11.5]) {
    const ex = p.x * TILE + (col - SPRITE_W / 2) * SPRITE_PX * m.face; // vị trí mắt trong sprite (lật theo hướng)
    const ey = y0 + 6.5 * SPRITE_PX;
    ctx.beginPath();
    ctx.moveTo(ex - 3, ey - 3);
    ctx.lineTo(ex + 3, ey + 3);
    ctx.moveTo(ex + 3, ey - 3);
    ctx.lineTo(ex - 3, ey + 3);
    ctx.stroke();
  }
  ctx.restore();
}

/** Dây gai nâu 3 px, nút thắt hai đầu; căng (> 3,8 ô) thì rung và đỏ nhạt. */
function drawRope(ctx: CanvasRenderingContext2D, a: DrawPlayer, b: DrawPlayer, t: number): void {
  const ax = a.x * TILE;
  const ay = a.y * TILE;
  const bx = b.x * TILE;
  const by = b.y * TILE;
  const dist = Math.hypot(bx - ax, by - ay) / TILE;
  const sag = Math.max(0, PHYS.ropeRest - dist) * TILE * 0.6;
  const taut = dist > 3.8;
  const wob = taut ? Math.sin(t * 60) * 1.5 : 0;
  ctx.strokeStyle = taut ? "#C0614A" : "#8B5A2B";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag + wob, bx, by);
  ctx.stroke();
  ctx.fillStyle = "#5D3A1A";
  for (const [x, y] of [[ax, ay], [bx, by]]) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ------------------------------------------------------------------ vật thể

type CarrySpec = Extract<ObjDef["spec"], { t: "carry" }>;

/** Vẽ vật thể (trước dây và người). Trả về các vật đang được mang để vẽ sau người chơi. */
function drawObjects(ctx: CanvasRenderingContext2D, level: Level, th: Theme, s: DrawState, n: number, now: number, fx: Fx): ObjDef[] {
  const v = s.view ?? null;
  const t = s.time ?? 0;
  const bodyAt = (o: ObjDef): Rect => {
    const i = level.bodyOf[o.id];
    const p = s.bodies?.[i] ?? v?.bodies[i];
    return p ? { x: p[0], y: p[1], w: o.rect.w, h: o.rect.h } : o.rect;
  };
  const carried: ObjDef[] = [];
  const year = constitutionYear(level.id);

  for (const o of level.objects) {
    if (!isActive(o, n)) continue;
    const sp = o.spec;
    const r = px(o.rect);
    const on = "sig" in sp && sp.sig ? sigBit(level, v, sp.sig) : false;
    switch (sp.t) {
      case "gate":
        if (rose(fx, o.id, on)) fx.particles.emit("dust", r.x + r.w / 2, r.y + r.h - 8, 10);
        drawGate(ctx, r, th, on);
        if (sp.label && !on) drawLabel(ctx, labelText(sp.label), r.x + r.w / 2, r.y + r.h - 40);
        break;
      case "bridge":
        drawBridge(ctx, r, th, on || !!sp.any?.some((g) => sigBit(level, v, g)), t);
        break;
      case "ice":
        drawIce(ctx, r, t);
        break;
      case "conveyor":
        drawConveyor(ctx, r, th, sp.speed, t);
        break;
      case "crumble": {
        const broken = objBit(level, v, o);
        if (rose(fx, o.id, broken)) {
          fx.particles.emit("dust", r.x + r.w / 2, r.y + 8, 12);
          fx.shake.kick(now);
        }
        const ci = level.crumbleOf?.[o.id] ?? -1;
        const remain = ci >= 0 && v?.crumbles?.[ci] !== undefined ? v.crumbles[ci] : -1;
        drawCrumble(ctx, r, th, remain, broken, t);
        break;
      }
      case "slow":
        if (rose(fx, o.id, on)) fx.particles.emit("bird", r.x + r.w / 2, r.y + r.h / 2, 14); // giấy tờ hóa chim giấy bay đi
        if (!on) drawSlowZone(ctx, r, t, sp.label ? labelText(sp.label) : undefined);
        break;
      case "goal":
        drawGoal(ctx, r, sp.label ? labelText(sp.label) : undefined);
        break;
      case "receiver": {
        const sources = sigSources(level, sp.sig, n);
        const done = sources.filter((x) => carryState(level, v, x) === "done").length;
        if (done > (fx.counts.get(o.id) ?? done)) fx.particles.emit("gold", r.x + r.w / 2, r.y, 10);
        fx.counts.set(o.id, done);
        if (sp.kind === "ballot") drawBallotBox(ctx, r, done, sources.length, t);
        else
          drawWordArch(
            ctx,
            r,
            sources.map((x) => ({ text: labelText((x.spec as CarrySpec).text ?? ""), got: carryState(level, v, x) === "done" })),
            t,
          );
        if (sp.label) drawLabel(ctx, labelText(sp.label), r.x + r.w / 2, r.y - 16);
        break;
      }
      case "lift":
        drawLift(ctx, px(bodyAt(o)), th, crowdNeed(sp.need, n), !!sp.drop);
        break;
      case "mover": {
        const b = px(bodyAt(o));
        const path: R[] = sp.path.map(([dx, dy]) => ({
          x: (o.rect.x + dx - sp.path[0][0] + o.rect.w / 2) * TILE,
          y: (o.rect.y + dy - sp.path[0][1] + o.rect.h / 2) * TILE,
          w: 0,
          h: 0,
        }));
        drawMover(ctx, b, th, sp.pads ? moverPadCount(n) : 0, path, t);
        break;
      }
      case "box": {
        const inGoal = objBit(level, v, o);
        if (rose(fx, o.id, inGoal)) {
          const b = px(bodyAt(o));
          fx.particles.emit(sp.label === "baibo" ? "bird" : "dust", b.x + b.w / 2, b.y + b.h / 2, 16); // "Bãi bỏ": hồ sơ hóa chim giấy
          fx.shake.kick(now);
        }
        if (inGoal) break;
        drawBox(ctx, px(bodyAt(o)), crowdNeed(sp.weight, n), sp.label, sp.label ? labelText(sp.label) : undefined);
        break;
      }
      case "hazard": {
        const b = bodyAt(o);
        const rects = [px(b)];
        if (sp.extra) rects.push(px({ x: b.x + sp.extra[0], y: b.y + sp.extra[1], w: sp.extra[2], h: sp.extra[3] }));
        drawHazard(ctx, rects, hazardStyle(level.id));
        break;
      }
      case "seesaw":
        drawSeesaw(ctx, r, v?.angles[level.angleOf[o.id]] ?? 0);
        break;
      case "pad":
        drawPad(ctx, r, objBit(level, v, o), pillarIcon(sp.label), t);
        if (sp.label && !pillarIcon(sp.label)) drawLabel(ctx, labelText(sp.label), r.x + r.w / 2, r.y + r.h - 14);
        if (sp.label && pillarIcon(sp.label)) drawLabel(ctx, labelText(sp.label), r.x + r.w / 2, r.y + r.h - 70);
        break;
      case "carry": {
        const st = carryState(level, v, o);
        if (st === "done") break;
        if (st !== "home") {
          carried.push(o);
          break;
        }
        const bob = Math.sin(t * 3 + o.id) * 2;
        drawCarryItem(ctx, sp.kind, r.x + r.w / 2, r.y + r.h / 2 + bob, labelText(sp.text ?? ""), year, t, true);
        break;
      }
      case "sign":
        drawLabel(ctx, labelText(sp.label), r.x + r.w / 2, r.y + r.h);
        break;
    }
  }

  // "k/cần" (hoặc ✓) dưới nút đầu tiên của mỗi nhóm nút (≥ 2 nút)
  for (const sig of level.sigNames) {
    const pads = sigSources(level, sig, n).filter((o) => o.spec.t === "pad");
    if (pads.length < 2) continue;
    const pressed = pads.filter((o) => objBit(level, v, o)).length;
    const first = pads.reduce((a, b) => (b.rect.x < a.rect.x ? b : a));
    const done = sigBit(level, v, sig);
    ctx.fillStyle = done ? "#2E7D32" : INK;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(done ? "✓" : `${pressed}/${sigNeed(level, sig, n)}`, first.rect.x * TILE, (first.rect.y + 1) * TILE + 14);
  }

  return carried;
}

/** Người đang đứng trên nút của dãy dẫn đường (tín hiệu "G0", "H1"…) được gắn cờ đỏ sau lưng. */
function leaders(level: Level, v: ObjView | null, players: DrawPlayer[]): DrawPlayer[] {
  const out: DrawPlayer[] = [];
  for (const o of level.objects) {
    if (o.spec.t !== "pad" || !/\.(G|H)\d+$/.test(o.spec.sig) || !objBit(level, v, o)) continue;
    const p = players.find((q) => Math.abs(q.x - (o.rect.x + 0.5)) < 0.7 && Math.abs(q.y - (o.rect.y + 0.5)) < 1);
    if (p && !out.includes(p)) out.push(p);
  }
  return out;
}

// ------------------------------------------------------------------ khung hình

export function drawMessage(ctx: CanvasRenderingContext2D, w: number, h: number, text: string): void {
  ctx.fillStyle = "#FBF5E6";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = INK;
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, w / 2, h / 2);
}

export function drawFrame(ctx: CanvasRenderingContext2D, level: Level, s: DrawState): void {
  const W = VIEW_W;
  const H = level.h * TILE;
  const t = s.time ?? 0;
  const now = t * 1000;
  const th = themeFor(level.id);
  const v = s.view ?? null;
  const cp = v?.cp ?? 0;
  const players = [...s.players].sort((a, b) => (a.slot < b.slot ? -1 : 1));

  const fx = s.fx ?? defaultFx;
  if (fx.levelId !== level.id) resetFx(fx, level.id, t);
  const dt = Math.min(0.1, Math.max(0, t - fx.lastT));
  fx.lastT = t;

  const avgX = players.length ? players.reduce((sum, p) => sum + p.x, 0) / players.length : level.w / 2;
  const camX = Math.max(0, Math.min(level.w * TILE - W, avgX * TILE - W / 2));
  const part = level.doorSig ? partAt(level, cp) : 0;

  drawBackdrop(ctx, level, th, part, camX, W, H, t);

  const [sx, sy] = fx.shake.offset(now);
  ctx.save();
  ctx.translate(-Math.round(camX) + sx, sy);

  drawProps(ctx, level, th, camX, W, t);
  drawSolids(ctx, level, th, camX, W);
  drawSpikes(ctx, level, camX, W);

  // trần nguy hiểm: sáng hơn khi có người ở gần (< 3 ô)
  for (const r of level.hazards) {
    const near = players.some((p) => p.x > r.x - 3 && p.x < r.x + r.w + 3 && p.y - (r.y + r.h) < 3);
    drawCeiling(ctx, px(r), t, near);
  }

  // cổng mốc mở phần + cờ nhỏ ở cột mốc nối tiếp
  const ms = PARTS[level.id] ? milestones(level) : [];
  if (cp > fx.cp) {
    for (const m of ms)
      if (m.cp > fx.cp && m.cp <= cp && !fx.passAt.has(m.cp)) {
        fx.passAt.set(m.cp, t);
        const c = level.checkpoints[m.cp];
        fx.particles.emit("gold", (c.x + 2) * TILE, (c.y - 3) * TILE, 24);
      }
  }
  fx.cp = cp;
  level.checkpoints.forEach((c, i) => {
    const m = ms.find((q) => q.cp === i);
    const ground = (c.y + 1) * TILE;
    if (m) {
      const since = fx.passAt.get(i);
      const raise = i === 0 || since === undefined ? 1 : Math.min(1, (t - since) / 0.6);
      drawMilestone(ctx, c.x * TILE, ground, th, PARTS[level.id][m.part], cp >= i, raise, t);
    } else if (i > 0) drawCheckpointFlag(ctx, (c.x + 0.5) * TILE, ground, cp >= i);
  });

  if (level.door) drawDoor(ctx, level.door, th, s.hasKey, t);

  // chìa khóa kiểu cũ (level luyện tập)
  if (!s.hasKey && level.key) {
    ctx.fillStyle = "#FFD400";
    ctx.beginPath();
    ctx.arc((level.key.x + 0.5) * TILE, (level.key.y + 0.5) * TILE, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const carried = drawObjects(ctx, level, th, s, players.length, now, fx);

  for (let i = 0; i < players.length - 1; i++) drawRope(ctx, players[i], players[i + 1], t);
  const flagged = leaders(level, v, players);
  for (const p of players) {
    const m = fx.motion.update(p.slot, p.x, dt);
    if (flagged.includes(p)) drawLeaderFlag(ctx, p.x * TILE, feetOf(p) - SPRITE_H * SPRITE_PX + 6, t);
    if (s.lose && p.slot === s.lose.slot) drawLostPlayer(ctx, p, m, s.lose.t);
    else drawPlayer(ctx, p, m);
  }

  // vật đang mang: lơ lửng 0,7 ô trên đầu, lắc ±8°
  for (const o of carried) {
    const st = carryState(level, v, o);
    const p = typeof st === "number" ? players[st] : undefined;
    if (!p) continue;
    const sp = o.spec as CarrySpec;
    ctx.save();
    ctx.translate(p.x * TILE, feetOf(p) - SPRITE_H * SPRITE_PX - 30 + Math.sin(t * 4) * 2); // trên tên người mang
    ctx.rotate(Math.sin(t * 3) * 0.14);
    drawCarryItem(ctx, sp.kind, 0, 0, labelText(sp.text ?? ""), constitutionYear(level.id), t, false);
    ctx.restore();
  }

  // thắng level 5: pháo hoa nhẹ
  if (s.won && !fx.won && th.era === 5) for (let k = 0; k < 4; k++) fx.particles.emit("firework", camX + 150 + k * 170, 120 + (k % 2) * 60, 24);
  fx.won = s.won;
  fx.particles.step(dt);
  fx.particles.draw(ctx);

  ctx.restore();
  drawVignette(ctx, th, W, H);

  // HUD chữ chỉ còn ở level luyện tập (level chính đã có thanh thời gian + khung tư liệu)
  if (!level.doorSig) {
    ctx.fillStyle = INK;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(s.hasKey ? "Đã có chìa khóa — cả nhóm vào cửa!" : "Tìm chìa khóa", 10, 20);
    if (s.levelName) {
      ctx.textAlign = "right";
      ctx.fillText(s.levelName, W - 10, 20);
    }
  }

  if (s.won && !s.isLastLevel) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = th.accent;
    ctx.font = "700 34px Oswald, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HOÀN THÀNH!", W / 2, H / 2 - 6);
    ctx.fillStyle = INK;
    ctx.font = "16px sans-serif";
    ctx.fillText("Sang giai đoạn tiếp theo…", W / 2, H / 2 + 24);
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
  ctx.fillText("Cả nhóm quay lại cột mốc gần nhất…", W / 2, H / 2 + 56);
}
````

**Tạo mới** `src/components/AdminRoomView.tsx`:

````tsx
// src/components/AdminRoomView.tsx
// Hình của một phòng cho trang admin, vẽ bằng đúng renderer của game:
//  - RoomThumb: ảnh thu nhỏ, vẽ lại mỗi khi có tóm tắt mới (1 lần/giây) → không tốn máy, không tốn mạng.
//  - FocusView: xem to một phòng, nhận 5 snapshot/giây rồi nội suy cho mượt (vẽ 60 hình/giây).
import { useEffect, useRef } from "react";
import { getLevel, nextLevelId } from "../game/level";
import { decodeObjView } from "../game/objects";
import type { Snapshot } from "../game/protocol";
import { createFx, drawFrame, drawMessage, type DrawPlayer } from "../game/renderer";
import { TILE, VIEW_W } from "../lib/constants";
import type { SlotInfo } from "../lib/types";
import { decodeSnapshot } from "../net/codec";
import { SnapshotBuffer } from "../net/interpolate";

const H = 16 * TILE;

function playersOf(snap: Snapshot, slots: Record<string, SlotInfo>, pos?: Record<string, [number, number]>): DrawPlayer[] {
  return Object.keys(snap.p)
    .sort()
    .map((slot) => {
      const [x, y] = pos?.[slot] ?? [snap.p[slot][0] / 100, snap.p[slot][1] / 100];
      return { slot, x, y, name: slots[slot]?.name ?? slot, avatar: slots[slot]?.avatar };
    });
}

function paint(ctx: CanvasRenderingContext2D, snap: Snapshot, slots: Record<string, SlotInfo>, fx: ReturnType<typeof createFx>, now: number, buf?: SnapshotBuffer): void {
  const level = getLevel(snap.lv);
  const sorted = Object.keys(snap.p).sort();
  drawFrame(ctx, level, {
    players: playersOf(snap, slots, buf?.positions(now)),
    hasKey: snap.k === 1,
    won: snap.w === 1,
    lose: snap.d === 1 && sorted[snap.c] ? { slot: sorted[snap.c], t: 0.5 } : null,
    levelName: level.name,
    isLastLevel: nextLevelId(level.id) === null,
    view: decodeObjView(snap.o),
    bodies: buf?.bodies(now),
    time: now / 1000,
    fx,
  });
}

/** Ảnh thu nhỏ (một nửa kích thước) — chỉ vẽ lại khi chuỗi snapshot đổi. */
export function RoomThumb({ snap, slots }: { snap: string | null; slots: Record<string, SlotInfo> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fx = useRef(createFx());
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    const s = snap ? decodeSnapshot(snap) : null;
    if (!s) drawMessage(ctx, VIEW_W, H, "Chưa có ai trong phòng");
    else paint(ctx, s, slots, fx.current, performance.now());
  }, [snap, slots]);
  return <canvas ref={ref} width={VIEW_W / 2} height={H / 2} className="admin-thumb" />;
}

/** Xem to: buffer nhận snapshot từ ngoài (pushFocus), vòng vẽ 60 hình/giây nội suy trễ 250 ms. */
export function FocusView({ buffer, slots }: { buffer: SnapshotBuffer; slots: Record<string, SlotInfo> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  });
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const fx = createFx();
    let raf = 0;
    const frame = (now: number) => {
      const s = buffer.latest();
      if (!s) drawMessage(ctx, VIEW_W, H, "Đang chờ dữ liệu phòng…");
      else paint(ctx, s, slotsRef.current, fx, now, buffer);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [buffer]);
  return <canvas ref={ref} width={VIEW_W} height={H} className="admin-focus-canvas" />;
}
````

**Thay toàn bộ** `src/pages/Admin.tsx`:

````tsx
// src/pages/Admin.tsx
// Bàn quản trị: tạo / xóa phòng, bắt đầu – dừng lượt thi (từng phòng hoặc tất cả), bảng xếp hạng trực tiếp,
// lưới ảnh thu nhỏ mọi phòng (1 lần/giây) và xem to một phòng (5 snapshot/giây, nội suy mượt).
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { signInAnonymously, signInWithEmailAndPassword, signOut } from "firebase/auth";
import badgeStar from "../assets/badge-star.svg";
import { FocusView, RoomThumb } from "../components/AdminRoomView";
import { getLevel, LEVEL_IDS } from "../game/level";
import { auth } from "../lib/firebase";
import { GAME_SERVER_URL } from "../lib/gameServer";
import { useDbValue, useRoomList, useUser } from "../lib/hooks";
import { createRoom, deleteRoom, setRoomsPhase } from "../lib/rooms";
import type { RankedRoom, RoomMeta, SlotInfo } from "../lib/types";
import { connectAdmin, type AdminAction, type AdminConnection, type AdminStatus } from "../net/adminSocket";
import { SnapshotBuffer } from "../net/interpolate";
import "./admin.css";

type Room = RoomMeta & { id: string };

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const sec = (secs % 60).toFixed(1).padStart(4, "0");
  return m > 0 ? `${m}:${sec}` : `${sec}s`;
}

function levelShort(id: string): string {
  return getLevel(id).name.split(" · ")[0];
}

const STATUS_TEXT: Record<AdminStatus, string> = {
  connecting: "Đang nối game server…",
  ready: "● Đã nối game server",
  reconnecting: "Mất kết nối game server — đang nối lại…",
  error: "Game server từ chối",
};

/** Kết nối admin tới game server khi đã có quyền admin. */
function useAdminLive(enabled: boolean, onFocusSnap: (id: string, s: import("../game/protocol").Snapshot) => void) {
  const [rooms, setRooms] = useState<RankedRoom[]>([]);
  const [status, setStatus] = useState<{ s: AdminStatus; detail?: string }>({ s: "connecting" });
  const [conn, setConn] = useState<AdminConnection | null>(null);
  const focusRef = useRef(onFocusSnap);
  useEffect(() => {
    focusRef.current = onFocusSnap;
  });
  useEffect(() => {
    if (!enabled) return;
    const c = connectAdmin({
      url: GAME_SERVER_URL,
      getIdToken: async () => {
        const u = auth.currentUser;
        if (!u) throw new Error("chưa đăng nhập");
        return u.getIdToken();
      },
      onRooms: setRooms,
      onFocus: (id, s) => focusRef.current(id, s),
      onStatus: (s, detail) => setStatus({ s, detail }),
    });
    setConn(c);
    return () => {
      c.close();
      setConn(null);
    };
  }, [enabled]);
  return { rooms, status, conn };
}

export default function Admin() {
  const user = useUser();
  const isAdmin = useDbValue<boolean>(user ? `admins/${user.uid}` : null);
  const allowed = !!user && !user.isAnonymous && isAdmin.value === true;
  const roomList = useRoomList();
  const roomsData = useDbValue<Record<string, { slots?: Record<string, SlotInfo> }>>(allowed ? "rooms" : null);

  const [focusId, setFocusId] = useState<string | null>(null);
  const [buffer, setBuffer] = useState(() => new SnapshotBuffer(250));
  const live = useAdminLive(allowed, (id, s) => {
    if (id === focusId) buffer.push(s, performance.now());
  });

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [max, setMax] = useState(4);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [gotoLevel, setGotoLevel] = useState<Record<string, string>>({});

  const byId = useMemo(() => new Map(live.rooms.map((r) => [r.id, r])), [live.rooms]);
  const ranked = useMemo(
    () => live.rooms.filter((r) => r.rank > 0 && roomList.some((x) => x.id === r.id)),
    [live.rooms, roomList],
  );

  function focus(id: string | null) {
    setBuffer(new SnapshotBuffer(250));
    setFocusId(id);
    live.conn?.focus(id);
  }

  /** Gửi lệnh tới game server; false = lỗi (đã hiện thông báo). */
  async function command(action: AdminAction, rooms: Room[], levelId?: string): Promise<boolean> {
    if (!live.conn) {
      setError("Chưa nối được game server");
      return false;
    }
    const res = await live.conn.command(action, rooms.map((r) => ({ id: r.id, name: r.name })), levelId);
    setError(res.ok ? "" : `Game server báo lỗi: ${res.error}`);
    return res.ok;
  }

  /** Bắt đầu lượt: server reset thời gian / số lần thua rồi mới mở màn chơi cho người chơi. */
  async function start(rooms: Room[]) {
    if (!(await command("start", rooms))) return;
    await setRoomsPhase(rooms.map((r) => r.id), "playing").catch((e: Error) => setError(e.message));
  }

  async function stop(rooms: Room[]) {
    await setRoomsPhase(rooms.map((r) => r.id), "lobby").catch((e: Error) => setError(e.message));
  }

  async function remove(room: Room) {
    if (!window.confirm(`Xóa phòng "${room.name}"? Người trong phòng sẽ bị đưa ra ngoài.`)) return;
    if (focusId === room.id) focus(null);
    await command("remove", [room]);
    await deleteRoom(room.id).catch((e: Error) => setError(e.message));
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function logout() {
    await signOut(auth);
    await signInAnonymously(auth); // quay lại user ẩn danh
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await createRoom(name.trim() || `Tổ thi đua ${roomList.length + 1}`, max);
      setName("");
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function copyRoomLink(roomId: string) {
    void navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`).then(() => {
      setCopiedId(roomId);
      setTimeout(() => setCopiedId(null), 2500);
    });
  }

  if (!user) return <div className="page">Đang kiểm tra tài khoản…</div>;

  if (user.isAnonymous) {
    return (
      <div className="page">
        <h1>
          <img src={badgeStar} alt="Star" style={{ width: 26, height: 26 }} />
          Bàn Quản Trị (Admin)
        </h1>
        <div className="card highlight" style={{ maxWidth: 440 }}>
          <h3 style={{ margin: "0 0 8px", color: "var(--red-dark)" }}>Đăng Nhập Quản Trị Viên</h3>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: 13 }}>
            Vui lòng đăng nhập bằng tài khoản quản trị để tạo và giám sát các phòng thi đua.
          </p>
          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="email" placeholder="Email quản trị" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Mật khẩu" value={pw} onChange={(e) => setPw(e.target.value)} required />
            <button className="btn gold" type="submit" style={{ marginTop: 4 }}>
              Đăng Nhập Admin
            </button>
          </form>
          {error && <p className="err">{error}</p>}
          <div style={{ marginTop: 16 }}>
            <Link to="/" className="btn ghost sm">← Về trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin.ready) return <div className="page">Đang kiểm tra quyền hạn…</div>;

  if (isAdmin.value !== true) {
    return (
      <div className="page">
        <h1>Bàn Quản Trị</h1>
        <div className="card">
          <p className="err">Tài khoản này chưa được cấp quyền quản trị (UID: {user.uid}).</p>
          <p className="muted">
            Vui lòng vào Firebase Realtime Database, thêm bản ghi <code>admins/{user.uid}</code> = <code>true</code>.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn ghost sm" onClick={logout}>Đăng xuất</button>
            <Link to="/" className="btn ghost sm">← Về trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  const slotsOf = (id: string) => roomsData.value?.[id]?.slots ?? {};
  const focusRoom = focusId ? roomList.find((r) => r.id === focusId) : undefined;
  const focusLive = focusId ? byId.get(focusId) : undefined;

  return (
    <div className="page page-admin">
      <div className="admin-head">
        <h1 style={{ margin: 0 }}>
          <img src={badgeStar} alt="Star" style={{ width: 28, height: 28 }} />
          Bàn Quản Trị Thi Đua
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`tag ${live.status.s === "ready" ? "playing" : "waiting"}`}>
            {STATUS_TEXT[live.status.s]}
            {live.status.detail ? ` (${live.status.detail})` : ""}
          </span>
          <Link to="/" className="btn ghost sm">← Trang Chủ</Link>
          <button className="btn ghost sm" onClick={logout}>Đăng Xuất</button>
        </div>
      </div>

      {/* Tạo phòng + điều khiển chung */}
      <div className="card highlight">
        <h3 style={{ margin: "0 0 12px", color: "var(--red-dark)" }}>★ Mở Phòng Thi Đua Mới</h3>
        <form className="row" onSubmit={create}>
          <input
            type="text"
            placeholder="Tên phòng (ví dụ: Đội 1 - Sao Vàng)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 14 }}>
            Tối đa:
            <input
              type="number"
              min={2}
              max={8}
              value={max}
              onChange={(e) => setMax(Math.min(8, Math.max(2, Number(e.target.value) || 2)))}
              style={{ width: 64 }}
            />
            người
          </label>
          <button className="btn gold" type="submit">+ Tạo Phòng</button>
        </form>
        <div className="admin-actions">
          <button className="btn gold" disabled={roomList.length === 0} onClick={() => void start(roomList)}>
            ▶ Bắt Đầu Tất Cả ({roomList.length} phòng)
          </button>
          <button className="btn ghost" disabled={roomList.length === 0} onClick={() => void stop(roomList)}>
            ■ Dừng Tất Cả (về sảnh chờ)
          </button>
          <span className="muted" style={{ fontSize: 12 }}>
            Bắt đầu = mọi phòng về Level 1, xóa thời gian và số lần thua của lượt trước, cùng tính giờ.
          </span>
        </div>
        {error && <p className="err">{error}</p>}
      </div>

      {/* Bảng xếp hạng */}
      <h2 style={{ marginTop: 24 }}>★ Bảng Xếp Hạng Trực Tiếp</h2>
      <div className="card admin-rank">
        {ranked.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>Chưa phòng nào bắt đầu lượt thi.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Phòng</th>
                <th>Level xong</th>
                <th>Đang ở</th>
                <th>Tổng thời gian</th>
                <th>Thua</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => (
                <tr key={r.id} className={r.rank <= 3 ? `top${r.rank}` : ""}>
                  <td className="admin-rank-no">{r.rank}</td>
                  <td>
                    <strong>{r.name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{r.players.join(", ") || "(trống)"}</div>
                  </td>
                  <td>{r.completed.length}/{LEVEL_IDS.length}</td>
                  <td>{r.finished ? "🏁 Về đích" : `${levelShort(r.levelId)} · phần ${r.part + 1}/${r.partCount}`}</td>
                  <td>{fmtTime(r.totalSeconds)}</td>
                  <td>{r.deaths}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Lưới phòng */}
      <h2 style={{ marginTop: 24 }}>★ Các Phòng ({roomList.length})</h2>
      {roomList.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 24 }}>
          <p className="muted">Chưa có phòng nào. Hãy tạo phòng thi đua đầu tiên ở trên.</p>
        </div>
      ) : (
        <div className="admin-grid">
          {roomList.map((r) => {
            const s = byId.get(r.id);
            const names = Object.values(r.players ?? {});
            return (
              <div className="card admin-room" key={r.id}>
                <div className="admin-room-head">
                  <strong>{r.name}</strong>
                  {s && s.rank > 0 && <span className="tag host">#{s.rank}</span>}
                  <span className="tag">{names.length}/{r.max} người</span>
                  <span className={`tag ${r.phase === "playing" ? "playing" : "waiting"}`}>
                    {r.phase === "playing" ? "● Đang chơi" : "○ Sảnh chờ"}
                  </span>
                </div>

                <button type="button" className="admin-thumb-btn" onClick={() => focus(r.id)} title="Xem to">
                  <RoomThumb snap={s?.snap ?? null} slots={slotsOf(r.id)} />
                </button>

                <div className="admin-room-stats">
                  {s?.startedAt ? (
                    <>
                      <span>{s.finished ? "🏁 Về đích" : `${levelShort(s.levelId)} · phần ${s.part + 1}/${s.partCount}`}</span>
                      <span>⏱ {fmtTime(s.totalSeconds)}</span>
                      <span>💥 {s.deaths} lần thua</span>
                    </>
                  ) : (
                    <span className="muted">Chưa bắt đầu lượt</span>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{names.length ? names.join(", ") : "(chưa có người vào)"}</div>

                <div className="admin-room-btns">
                  <button className="btn gold sm" onClick={() => void start([r])}>▶ Bắt đầu</button>
                  <button className="btn ghost sm" onClick={() => void stop([r])}>■ Dừng</button>
                  <button className="btn ghost sm" onClick={() => focus(r.id)}>🔍 Xem to</button>
                  <select
                    value={gotoLevel[r.id] ?? ""}
                    onChange={(e) => {
                      setGotoLevel({ ...gotoLevel, [r.id]: "" });
                      if (e.target.value) void command("goto", [r], e.target.value);
                    }}
                    title="Cho phòng nhảy tới level (giữ kết quả đã có)"
                  >
                    <option value="">Tới level…</option>
                    {LEVEL_IDS.map((lv) => (
                      <option key={lv} value={lv}>{levelShort(lv)}</option>
                    ))}
                  </select>
                  <button className="btn ghost sm" onClick={() => copyRoomLink(r.id)}>
                    {copiedId === r.id ? "✓ Đã chép" : "🔗 Link"}
                  </button>
                  <button className="btn ghost sm" style={{ color: "var(--red-dark)" }} onClick={() => void remove(r)}>
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Xem to một phòng */}
      {focusId && (
        <div className="admin-focus" onClick={() => focus(null)}>
          <div className="admin-focus-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-room-head">
              <strong>{focusRoom?.name ?? focusId}</strong>
              {focusLive?.startedAt ? (
                <span className="muted">
                  {focusLive.finished ? "🏁 Về đích" : `${levelShort(focusLive.levelId)} · phần ${focusLive.part + 1}/${focusLive.partCount}`} · ⏱{" "}
                  {fmtTime(focusLive.totalSeconds)} · 💥 {focusLive.deaths}
                </span>
              ) : null}
              <button className="btn ghost sm" style={{ marginLeft: "auto" }} onClick={() => focus(null)}>✕ Đóng</button>
            </div>
            <FocusView buffer={buffer} slots={slotsOf(focusId)} />
          </div>
        </div>
      )}
    </div>
  );
}
````

**Tạo mới** `src/pages/admin.css`:

````css
/* src/pages/admin.css — bàn quản trị: xếp hạng, lưới phòng, xem to */
.page.page-admin {
  max-width: 1280px;
}
.admin-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}
.admin-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 14px;
}

.admin-rank table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.admin-rank th,
.admin-rank td {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border, #ddd);
  vertical-align: top;
}
.admin-rank-no {
  font-family: Oswald, sans-serif;
  font-size: 20px;
  font-weight: 700;
}
.admin-rank tr.top1 { background: #fff4c2; }
.admin-rank tr.top2 { background: #f1f3f5; }
.admin-rank tr.top3 { background: #fbe6d4; }

.admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}
.admin-room {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}
.admin-room-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.admin-thumb-btn {
  padding: 0;
  border: 2px solid var(--border, #222);
  border-radius: 6px;
  background: #fff;
  cursor: zoom-in;
  overflow: hidden;
}
.admin-thumb {
  display: block;
  width: 100%;
  height: auto;
  border: none;
  border-radius: 0;
}
.admin-room-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
  font-weight: 600;
}
.admin-room-btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.admin-room-btns select {
  font-size: 12px;
  padding: 4px 6px;
}

.admin-focus {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(20, 14, 10, 0.72);
  display: grid;
  place-items: center;
  padding: 16px;
}
.admin-focus-box {
  width: min(960px, 100%);
  background: var(--paper, #fbf5e6);
  border: 3px solid #231811;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.admin-focus-canvas {
  width: 100%;
  height: auto;
}
````


✅ **Kiểm tra**

```bash
npx tsc -b
npx vitest run
npm run build
npx eslint .
```

`tsc` sạch; **94/94 test xanh**; build xong; `eslint` chỉ còn 3 lỗi có sẵn từ trước (`engine.ts:263`, `Room.tsx` setState trong effect, `EraSplashBanner.tsx` effect cũ).
