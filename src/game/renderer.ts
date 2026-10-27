// src/game/renderer.ts
import { PHYS, PLAYER_SIZE, SLOT_COLORS, TILE, VIEW_W } from "../lib/constants";
import type { Level, ObjDef, Rect } from "./level";
import { carryState, crowdNeed, isActive, moverPadCount, objBit, sigBit, sigNeed, sigSources, type ObjView } from "./objects";
import { label as labelText } from "./story";
import { BANNER_SEC, type Banner } from "./storyTracker";

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
  /** Dòng chữ của đoạn hiện tại. */
  banner?: Banner | null;
  /** Thời gian (giây) cho hoạt ảnh băng chuyền, sàn sụp rung, vật lơ lửng. */
  time?: number;
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
  gate: "#546e7a",
  bridge: "#8d6e63",
  ice: "#b3e5fc",
  iceEdge: "#4fc3f7",
  slow: "rgba(121, 85, 72, 0.22)",
  hazard: "rgba(211, 47, 47, 0.45)",
  danger: "#e53935",
  lift: "#7e57c2",
  mover: "#26a69a",
  box: "#ffffff",
  boxEdge: "#ff8a50",
  goal: "#43a047",
  pad: "#e53935",
  padDown: "#8e0000",
  conveyor: "#78909c",
  crumble: "#a1887f",
  seesaw: "#a1887f",
  flagOn: "#43a047",
  flagOff: "#9e9e9e",
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

function dashed(ctx: CanvasRenderingContext2D, r: Rect, color: string): void {
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x * TILE + 2, r.y * TILE + 2, r.w * TILE - 4, r.h * TILE - 4);
  ctx.restore();
}

/** Chữ nhỏ trên nền trắng; y = mép dưới khối chữ. */
function tag(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, color = C.ink): void {
  ctx.font = "bold 11px sans-serif";
  const w = ctx.measureText(text).width;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(cx - w / 2 - 4, y - 14, w + 8, 16);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, cx, y - 2);
}

/** Số to trên bục số / khối số (như ảnh tham khảo). */
function bigNumber(ctx: CanvasRenderingContext2D, n: number, cx: number, cy: number, ok: boolean): void {
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = ok ? C.goal : C.boxEdge;
  ctx.fillText(String(n), cx, cy + 7);
}

/** Phiếu / chìa / mảnh chữ (tâm cx, cy theo px). */
function drawItem(ctx: CanvasRenderingContext2D, spec: Extract<ObjDef["spec"], { t: "carry" }>, cx: number, cy: number): void {
  if (spec.kind === "ballot") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(cx - 9, cy - 11, 18, 22);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 9, cy - 11, 18, 22);
    ctx.strokeStyle = C.danger;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy);
    ctx.lineTo(cx - 1, cy + 5);
    ctx.lineTo(cx + 6, cy - 6);
    ctx.stroke();
  } else if (spec.kind === "key") {
    ctx.fillStyle = C.key;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - 5, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(cx, cy - 2, 11, 4);
    ctx.fillRect(cx + 7, cy, 3, 6);
  } else {
    const text = labelText(spec.text ?? "");
    ctx.font = "bold 11px sans-serif";
    const w = ctx.measureText(text).width + 10;
    ctx.fillStyle = "#fff";
    ctx.fillRect(cx - w / 2, cy - 9, w, 18);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - w / 2, cy - 9, w, 18);
    ctx.fillStyle = C.ink;
    ctx.textAlign = "center";
    ctx.fillText(text, cx, cy + 4);
  }
}

/** Vẽ vật thể của level (trước dây và người chơi). Trả về các vật đang được mang để vẽ sau người chơi. */
function drawObjects(ctx: CanvasRenderingContext2D, level: Level, s: DrawState, n: number): ObjDef[] {
  const v = s.view ?? null;
  const time = s.time ?? 0;
  const bodyAt = (o: ObjDef): Rect => {
    const i = level.bodyOf[o.id];
    const p = s.bodies?.[i] ?? v?.bodies[i];
    return p ? { x: p[0], y: p[1], w: o.rect.w, h: o.rect.h } : o.rect;
  };
  const carried: ObjDef[] = [];

  // vùng chết (trần): dải đỏ mờ + vạch nét đứt ở mép dưới
  for (const r of level.hazards) {
    ctx.fillStyle = C.hazard;
    ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
    ctx.save();
    ctx.setLineDash([10, 6]);
    ctx.strokeStyle = C.danger;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r.x * TILE, (r.y + r.h) * TILE - 1);
    ctx.lineTo((r.x + r.w) * TILE, (r.y + r.h) * TILE - 1);
    ctx.stroke();
    ctx.restore();
  }

  for (const o of level.objects) {
    if (!isActive(o, n)) continue;
    const sp = o.spec;
    const r = o.rect;
    const on = "sig" in sp && sp.sig ? sigBit(level, v, sp.sig) : false;
    switch (sp.t) {
      case "gate":
        if (on) dashed(ctx, r, C.gate);
        else {
          ctx.fillStyle = C.gate;
          ctx.fillRect(r.x * TILE + 4, r.y * TILE, r.w * TILE - 8, r.h * TILE);
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          for (let y = r.y * TILE + 8; y < (r.y + r.h) * TILE; y += 16) ctx.fillRect(r.x * TILE + 4, y, r.w * TILE - 8, 3);
        }
        if (sp.label) tag(ctx, labelText(sp.label), (r.x + 0.5) * TILE, (r.y + r.h) * TILE - 40);
        break;
      case "bridge": {
        const lit = on || !!sp.any?.some((g) => sigBit(level, v, g));
        if (lit) {
          ctx.fillStyle = C.bridge;
          ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
        } else dashed(ctx, r, C.bridge);
        break;
      }
      case "ice":
        ctx.fillStyle = C.ice;
        ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
        ctx.fillStyle = C.iceEdge;
        ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, 3);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        for (let x = r.x * TILE + 6; x < (r.x + r.w) * TILE - 10; x += 22) ctx.fillRect(x, r.y * TILE + 8, 10, 2);
        break;
      case "conveyor": {
        ctx.fillStyle = C.conveyor;
        ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
        ctx.fillStyle = "#eceff1";
        const dir = Math.sign(sp.speed);
        const shift = ((time * sp.speed * TILE) % 16 + 16) % 16;
        for (let x = r.x * TILE + shift - 16; x < (r.x + r.w) * TILE; x += 16) {
          if (x < r.x * TILE) continue;
          ctx.beginPath(); // mũi tên chỉ chiều trôi
          ctx.moveTo(x, r.y * TILE + 6);
          ctx.lineTo(x + dir * 6, r.y * TILE + 12);
          ctx.lineTo(x, r.y * TILE + 18);
          ctx.fill();
        }
        break;
      }
      case "crumble": {
        if (objBit(level, v, o)) {
          dashed(ctx, r, C.crumble);
          break;
        }
        const ci = level.crumbleOf?.[o.id] ?? -1;
        const rem = ci >= 0 && v?.crumbles?.[ci] !== undefined
          ? v.crumbles[ci]
          : -1;
        const isShaking = rem >= 0 && rem <= PHYS.crumbleShake;
        const shakeX = isShaking ? Math.sin(time * 80) * 2 : 0;

        ctx.save();
        if (shakeX !== 0) ctx.translate(shakeX, 0);

        ctx.fillStyle = C.crumble;
        ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
        ctx.strokeStyle = "#5d4037";
        ctx.lineWidth = 2;
        ctx.beginPath(); // vết nứt
        ctx.moveTo(r.x * TILE + 8, r.y * TILE);
        ctx.lineTo(r.x * TILE + 14, r.y * TILE + 14);
        ctx.lineTo(r.x * TILE + 22, r.y * TILE + 22);
        ctx.stroke();

        // Số đếm ngược chính giữa sàn (chỉ hiện khi đã kích hoạt timer)
        if (rem >= 0) {
          const cx = (r.x + r.w / 2) * TILE;
          const cy = (r.y + r.h / 2) * TILE;
          const text = `${Math.max(0, rem).toFixed(1)}s`;
          const fontSize = r.w >= 2 ? 14 : 11;
          ctx.font = `bold ${fontSize}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.strokeStyle = "rgba(45, 25, 15, 0.7)";
          ctx.lineWidth = 3;
          ctx.strokeText(text, cx, cy);
          ctx.fillStyle = isShaking ? "#ff5252" : "#ffffff";
          ctx.fillText(text, cx, cy);
        }

        ctx.restore();
        break;
      }
      case "slow":
        if (!on) {
          ctx.fillStyle = C.slow;
          ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
          if (sp.label) tag(ctx, labelText(sp.label), (r.x + r.w / 2) * TILE, r.y * TILE - 2);
        }
        break;
      case "goal":
        dashed(ctx, r, C.goal);
        if (sp.label) tag(ctx, labelText(sp.label), (r.x + r.w / 2) * TILE, r.y * TILE - 4, C.goal);
        break;
      case "receiver": {
        const sources = sigSources(level, sp.sig, n);
        const done = sources.filter((x) => carryState(level, v, x) === "done");
        ctx.fillStyle = "#fff8e1";
        ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x * TILE + 1, r.y * TILE + 1, r.w * TILE - 2, r.h * TILE - 2);
        if (sp.kind === "ballot") {
          ctx.fillStyle = C.ink; // khe bỏ phiếu
          ctx.fillRect((r.x + r.w / 2) * TILE - 10, r.y * TILE + 6, 20, 4);
          bigNumber(ctx, done.length, (r.x + r.w / 2) * TILE - 10, (r.y + r.h / 2) * TILE + 4, done.length === sources.length);
          ctx.font = "bold 13px monospace";
          ctx.fillText(`/${sources.length}`, (r.x + r.w / 2) * TILE + 12, (r.y + r.h / 2) * TILE + 11);
        } else {
          // khung chữ: các ô theo thứ tự mảnh; mảnh đã nộp hiện chữ
          sources.forEach((x, i) => {
            const spec = x.spec as Extract<ObjDef["spec"], { t: "carry" }>;
            const got = carryState(level, v, x) === "done";
            ctx.fillStyle = got ? C.ink : "#bdbdbd";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(got ? labelText(spec.text ?? "") : "· · ·", (r.x + r.w / 2) * TILE, r.y * TILE + 14 + i * 13);
          });
        }
        if (sp.label) tag(ctx, labelText(sp.label), (r.x + r.w / 2) * TILE, r.y * TILE - 4);
        break;
      }
      case "lift":
      case "mover":
      case "box": {
        if (sp.t === "box" && objBit(level, v, o)) break; // khối đã vào đích
        const b = bodyAt(o);
        if (sp.t === "box") {
          ctx.fillStyle = C.box;
          ctx.fillRect(b.x * TILE + 2, b.y * TILE + 2, b.w * TILE - 4, b.h * TILE - 4);
          ctx.strokeStyle = C.boxEdge;
          ctx.lineWidth = 3;
          ctx.strokeRect(b.x * TILE + 2, b.y * TILE + 2, b.w * TILE - 4, b.h * TILE - 4);
          bigNumber(ctx, crowdNeed(sp.weight, n), (b.x + b.w / 2) * TILE, (b.y + b.h / 2) * TILE, false);
          if (sp.label) tag(ctx, labelText(sp.label), (b.x + b.w / 2) * TILE, b.y * TILE - 4);
          break;
        }
        ctx.fillStyle = sp.t === "lift" ? C.lift : C.mover;
        ctx.fillRect(b.x * TILE, b.y * TILE, b.w * TILE, b.h * TILE);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x * TILE + 1, b.y * TILE + 1, b.w * TILE - 2, b.h * TILE - 2);
        if (sp.t === "lift" && sp.drop) {
          // bục số: biển số trên cột (như ảnh tham khảo)
          const cx = (b.x + b.w / 2) * TILE;
          const top = b.y * TILE - 34;
          ctx.fillStyle = C.lift;
          ctx.fillRect(cx - 2, top + 22, 4, 12);
          ctx.fillStyle = "#fff";
          ctx.fillRect(cx - 14, top, 28, 24);
          ctx.strokeStyle = C.lift;
          ctx.strokeRect(cx - 14, top, 28, 24);
          bigNumber(ctx, crowdNeed(sp.need, n), cx, top + 12, false);
        }
        if (sp.t === "mover") {
          if (sp.pads) {
            for (let k = 0; k < moverPadCount(n); k++) {
              ctx.fillStyle = C.pad;
              ctx.fillRect((b.x + k) * TILE + 4, b.y * TILE - 5, TILE - 8, 5);
            }
          }
          // lộ trình nét đứt mờ (từ vị trí ban đầu)
          ctx.save();
          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = "rgba(38,166,154,0.5)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          sp.path.forEach(([dx, dy], i) => {
            const px = (r.x + dx - sp.path[0][0] + r.w / 2) * TILE;
            const py = (r.y + dy - sp.path[0][1] + r.h / 2) * TILE;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          ctx.restore();
        }
        break;
      }
      case "hazard": {
        const b = bodyAt(o);
        const rects = [b];
        if (sp.extra) rects.push({ x: b.x + sp.extra[0], y: b.y + sp.extra[1], w: sp.extra[2], h: sp.extra[3] });
        ctx.fillStyle = C.danger;
        for (const q of rects) ctx.fillRect(q.x * TILE, q.y * TILE, q.w * TILE, q.h * TILE);
        ctx.fillStyle = "#b71c1c"; // răng cưa ở mặt dưới
        for (let x = b.x * TILE; x < (b.x + b.w) * TILE; x += 8) {
          ctx.beginPath();
          ctx.moveTo(x, (b.y + b.h) * TILE);
          ctx.lineTo(x + 4, (b.y + b.h) * TILE + 6);
          ctx.lineTo(x + 8, (b.y + b.h) * TILE);
          ctx.fill();
        }
        break;
      }
      case "seesaw": {
        const ai = level.angleOf[o.id];
        const ang = v?.angles[ai] ?? 0;
        const cx = (r.x + r.w / 2) * TILE;
        const cy = (r.y + PHYS.seesawThick / 2) * TILE;
        ctx.fillStyle = "#795548"; // cột trục hình tam giác
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 10, (r.y + 1) * TILE);
        ctx.lineTo(cx + 10, (r.y + 1) * TILE);
        ctx.fill();
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        ctx.fillStyle = C.seesaw;
        ctx.fillRect((-r.w / 2) * TILE, (-PHYS.seesawThick / 2) * TILE, r.w * TILE, PHYS.seesawThick * TILE);
        ctx.strokeStyle = Math.abs(ang) > PHYS.seesawSlip ? C.iceEdge : "#5d4037"; // lệch → viền xanh băng (trơn)
        ctx.lineWidth = 3;
        ctx.strokeRect((-r.w / 2) * TILE, (-PHYS.seesawThick / 2) * TILE, r.w * TILE, PHYS.seesawThick * TILE);
        ctx.restore();
        break;
      }
      case "pad": {
        const down = objBit(level, v, o);
        ctx.fillStyle = down ? C.padDown : C.pad;
        const h = down ? 4 : 8;
        ctx.fillRect(r.x * TILE + 3, (r.y + 1) * TILE - h, TILE - 6, h);
        if (sp.label) tag(ctx, labelText(sp.label), (r.x + 0.5) * TILE, (r.y + 1) * TILE - 14);
        break;
      }
      case "carry": {
        const st = carryState(level, v, o);
        if (st === "done") break;
        if (st !== "home") {
          carried.push(o); // vẽ trên đầu người mang, sau khi vẽ người chơi
          break;
        }
        const bob = Math.sin(time * 3 + o.id) * 2;
        ctx.fillStyle = "rgba(255, 235, 59, 0.35)"; // vầng sáng
        ctx.beginPath();
        ctx.arc((r.x + 0.5) * TILE, (r.y + 0.5) * TILE, 15, 0, Math.PI * 2);
        ctx.fill();
        drawItem(ctx, sp, (r.x + 0.5) * TILE, (r.y + 0.5) * TILE + bob);
        break;
      }
      case "sign":
        tag(ctx, labelText(sp.label), (r.x + 0.5) * TILE, (r.y + 1) * TILE);
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
    ctx.fillStyle = done ? C.goal : C.ink;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(done ? "✓" : `${pressed}/${sigNeed(level, sig, n)}`, first.rect.x * TILE, (first.rect.y + 1) * TILE + 14);
  }

  // cột mốc hồi sinh: cờ xanh = đã tới
  level.checkpoints.forEach((c, i) => {
    if (i === 0) return;
    const x = (c.x + 0.5) * TILE;
    const y = (c.y + 1) * TILE;
    ctx.fillStyle = "#616161";
    ctx.fillRect(x - 1, y - TILE, 2, TILE);
    ctx.fillStyle = v && v.cp >= i ? C.flagOn : C.flagOff;
    ctx.beginPath();
    ctx.moveTo(x + 1, y - TILE);
    ctx.lineTo(x + 14, y - TILE + 6);
    ctx.lineTo(x + 1, y - TILE + 12);
    ctx.closePath();
    ctx.fill();
  });

  return carried;
}

/** Dòng chữ đoạn: to ở giữa mép trên trong BANNER_SEC giây, sau đó nhỏ ở góc dưới thanh HUD. */
function drawBanner(ctx: CanvasRenderingContext2D, W: number, b: Banner): void {
  if (b.age < BANNER_SEC) {
    const a = Math.min(1, b.age * 3, (BANNER_SEC - b.age) * 2 + 0.35);
    ctx.font = "bold 17px sans-serif";
    const w = Math.min(W - 40, ctx.measureText(b.text).width + 28);
    ctx.fillStyle = `rgba(33, 33, 33, ${0.82 * a})`;
    ctx.fillRect(W / 2 - w / 2, 34, w, 34);
    ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
    ctx.textAlign = "center";
    ctx.fillText(b.text, W / 2, 57, W - 56);
  } else {
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "rgba(34, 34, 34, 0.7)";
    ctx.textAlign = "left";
    ctx.fillText(b.text, 10, 38, W - 20);
  }
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

  // chìa khóa kiểu cũ (level luyện tập)
  if (!s.hasKey && level.key) {
    ctx.fillStyle = C.key;
    ctx.beginPath();
    ctx.arc((level.key.x + 0.5) * TILE, (level.key.y + 0.5) * TILE, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const carried = drawObjects(ctx, level, s, players.length);

  // dây (vẽ trước người chơi để người chơi đè lên)
  for (let i = 0; i < players.length - 1; i++) drawRope(ctx, players[i], players[i + 1]);
  for (const p of players) {
    if (s.lose && p.slot === s.lose.slot) drawLostPlayer(ctx, p, s.lose.t);
    else drawPlayer(ctx, p);
  }

  // vật đang mang: lơ lửng trên đầu người mang
  for (const o of carried) {
    const st = carryState(level, s.view ?? null, o);
    const p = typeof st === "number" ? players[st] : undefined;
    if (!p) continue;
    const bob = Math.sin((s.time ?? 0) * 4) * 2;
    drawItem(ctx, o.spec as Extract<ObjDef["spec"], { t: "carry" }>, p.x * TILE, (p.y - PLAYER_SIZE / 2 - 0.7) * TILE + bob);
  }

  ctx.restore();

  // HUD
  ctx.fillStyle = C.ink;
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "left";
  const seg = level.checkpoints[s.view?.cp ?? 0]?.seg ?? 0;
  let hud = s.hasKey ? "Đã có chìa khóa — cả nhóm vào cửa!" : "Tìm chìa khóa";
  if (level.doorSig) hud = s.hasKey ? "Cửa đã mở" : `Đoạn ${seg + 1}/${level.segCount}`;
  ctx.fillText(hud, 10, 20);
  if (s.levelName) {
    ctx.textAlign = "right";
    ctx.fillText(s.levelName, W - 10, 20);
  }
  if (s.banner) drawBanner(ctx, W, s.banner);

  if (s.won && !s.isLastLevel) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.solid;
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HOÀN THÀNH!", W / 2, H / 2 - 6);
    ctx.fillStyle = C.ink;
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
