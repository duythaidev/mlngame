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
}

const INK = "#222222";

// ------------------------------------------------------------------ hiệu ứng theo thời gian (1 canvas / trang)
// Nhớ trạng thái khung trước để bắn hạt đúng lúc đổi (qua cổng, sàn vỡ, khối "Bãi bỏ" vào đích…).
const fx = {
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

function resetFx(levelId: string, t: number): void {
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
function rose(id: number, now: boolean): boolean {
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
function drawObjects(ctx: CanvasRenderingContext2D, level: Level, th: Theme, s: DrawState, n: number, now: number): ObjDef[] {
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
        if (rose(o.id, on)) fx.particles.emit("dust", r.x + r.w / 2, r.y + r.h - 8, 10);
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
        if (rose(o.id, broken)) {
          fx.particles.emit("dust", r.x + r.w / 2, r.y + 8, 12);
          fx.shake.kick(now);
        }
        const ci = level.crumbleOf?.[o.id] ?? -1;
        const remain = ci >= 0 && v?.crumbles?.[ci] !== undefined ? v.crumbles[ci] : -1;
        drawCrumble(ctx, r, th, remain, broken, t);
        break;
      }
      case "slow":
        if (rose(o.id, on)) fx.particles.emit("bird", r.x + r.w / 2, r.y + r.h / 2, 14); // giấy tờ hóa chim giấy bay đi
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
        if (rose(o.id, inGoal)) {
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

  if (fx.levelId !== level.id) resetFx(level.id, t);
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

  const carried = drawObjects(ctx, level, th, s, players.length, now);

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
