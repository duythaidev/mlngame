# 05 — Giao diện (repo `mlngame`)

- **Canvas** vẽ đủ 17 cơ chế theo mục 5 của spec: vùng chết (dải đỏ + vạch nét đứt), cổng, cầu (tắt = nét đứt), băng, băng chuyền (mũi tên chạy), sàn sụp (vết nứt; mất = nét đứt), bục số (**biển số trên cột**), sàn chở (nút đỏ trên mặt + **lộ trình nét đứt**), khối đỏ (răng cưa), khối số (**số to**), ô đích, hòm phiếu (`k/n`), khung chữ (các ô chữ), bập bênh (cột tam giác; lệch → viền xanh băng), phiếu/chìa/mảnh chữ (vầng sáng; đang mang → **lơ lửng trên đầu**), cờ cột mốc.
- **Dòng chữ đoạn**: hiện to giữa mép trên 4 giây khi tới cột mốc mới, rồi thu nhỏ ở góc trên.
- **Màn kết** (HTML phủ lên canvas) sau level cuối.
- **Sandbox** `/sandbox?n=2..5`: 2–5 người một bàn phím (WAD · mũi tên · IJL · TFH · 8 4 6 bàn phím số); phím 1–5 chọn level, 0 luyện tập, P về cột mốc, R chơi lại.
- **Phòng**: bắt đầu được khi có **≥ 2 người** (`VITE_MIN_PLAYERS` để đổi).

## Bước 0 — Dọn file của bộ docs bản trước (bỏ qua nếu không có)

```bash
rm -f src/components/StoryPanel.tsx
```

(PowerShell: `Remove-Item src/components/StoryPanel.tsx -ErrorAction SilentlyContinue`.)
Nếu `src/index.css` có dòng `/* ---------- Khung nội dung dưới canvas (StoryPanel) ---------- */`: **xóa từ dòng đó tới hết file** (khối CSS cũ), rồi mới làm bước 7.

## Bước 1 — Dòng chữ đoạn

**Tạo mới / thay toàn bộ** `src/game/storyTracker.ts` (29 dòng):

```ts
// src/game/storyTracker.ts
// Dòng chữ đoạn: hiện to giữa mép trên canvas khi nhóm tới cột mốc mới, BANNER_SEC giây sau thu nhỏ.
import type { Level } from "./level";
import type { ObjView } from "./objects";
import { segmentLine } from "./story";

export const BANNER_SEC = 4;

export interface Banner {
  text: string;
  age: number; // giây kể từ lúc hiện
}

export class BannerTracker {
  private key = "";
  private since = 0;

  /** now: ms (performance.now). Trả về null nếu đoạn hiện tại không có chữ. */
  update(level: Level, view: ObjView | null, now: number): Banner | null {
    const seg = level.checkpoints[view?.cp ?? 0]?.seg ?? 0;
    const key = `${level.id}|${seg}`;
    if (key !== this.key) {
      this.key = key;
      this.since = now;
    }
    const text = segmentLine(level.id, seg);
    return text ? { text, age: (now - this.since) / 1000 } : null;
  }
}
```

## Bước 2 — Vẽ

**Tạo mới / thay toàn bộ** `src/game/renderer.ts` (668 dòng):

```ts
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
        ctx.fillStyle = C.crumble;
        ctx.fillRect(r.x * TILE, r.y * TILE, r.w * TILE, r.h * TILE);
        ctx.strokeStyle = "#5d4037";
        ctx.lineWidth = 2;
        ctx.beginPath(); // vết nứt
        ctx.moveTo(r.x * TILE + 8, r.y * TILE);
        ctx.lineTo(r.x * TILE + 14, r.y * TILE + 14);
        ctx.lineTo(r.x * TILE + 22, r.y * TILE + 22);
        ctx.stroke();
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
    // dòng nhỏ dưới thanh HUD, có nền trắng để không chìm vào trần / vách màu cam
    ctx.font = "12px sans-serif";
    const w = Math.min(W - 16, ctx.measureText(b.text).width + 14);
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.fillRect(8, 27, w, 18);
    ctx.fillStyle = C.ink;
    ctx.textAlign = "left";
    ctx.fillText(b.text, 15, 40, W - 30);
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
```

## Bước 3 — Màn kết

**Tạo mới / thay toàn bộ** `src/components/EndingPanel.tsx` (18 dòng):

```tsx
// src/components/EndingPanel.tsx
// Màn kết sau level cuối: câu hỏi của bài → "Không mâu thuẫn" + 3 ý. Phủ lên canvas.
import { ENDING } from "../game/story";

export default function EndingPanel({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="ending-panel">
      <p className="ending-question">{ENDING.question}</p>
      <h2>{ENDING.answer}</h2>
      <ol>
        {ENDING.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
    </div>
  );
}
```

## Bước 4 — Màn chơi online

**Tạo mới / thay toàn bộ** `src/components/GameCanvas.tsx` (207 dòng):

```tsx
// src/components/GameCanvas.tsx
import { useEffect, useRef, useState } from "react";
import { auth } from "../lib/firebase";
import { GAME_AUTH_OFF, GAME_SERVER_URL } from "../lib/gameServer";
import { TILE, VIEW_W } from "../lib/constants";
import type { SlotInfo } from "../lib/types";
import { attachInput } from "../game/input";
import { getLevel, nextLevelId } from "../game/level";
import { decodeObjView } from "../game/objects";
import type { Snapshot } from "../game/protocol";
import { drawFrame, drawMessage, type DrawPlayer } from "../game/renderer";
import { BannerTracker } from "../game/storyTracker";
import EndingPanel from "./EndingPanel";
import { playSound, preloadSounds } from "../lib/sound";
import { connectGame, type GameStatus } from "../net/gameSocket";
import { SnapshotBuffer } from "../net/interpolate";
import { NetStats } from "../net/netStats";

interface Props {
  roomId: string;
  levelId: string;
  slots: Record<string, SlotInfo>;
  mySlot: string | null;
}

const INTERP_DELAY_MS = 50;

function statusText(status: GameStatus, detail: string): string {
  if (status === "connecting") return "Đang kết nối máy chủ…";
  if (status === "reconnecting") return "Mất kết nối — đang kết nối lại…";
  if (status === "error") {
    if (detail === "replaced") return "Bạn đã mở phòng này ở tab khác";
    if (detail === "not-in-room") return "Bạn chưa có chỗ trong phòng này — quay lại sảnh";
    if (detail === "auth") return "Phiên đăng nhập lỗi — tải lại trang";
    return "Không vào được phòng chơi — tải lại trang";
  }
  return "";
}

export default function GameCanvas({ roomId, levelId, slots, mySlot }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  });
  const level = getLevel(levelId);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const W = VIEW_W;
    const H = getLevel(levelId).h * TILE;

    if (!mySlot) {
      drawMessage(ctx, W, H, "Chưa có chỗ trong phòng");
      return;
    }

    const buffer = new SnapshotBuffer(INTERP_DELAY_MS);
    const stats = new NetStats();
    const showNet = new URLSearchParams(window.location.search).has("net");
    let snap: Snapshot | null = null;
    let status: GameStatus = "connecting";
    let detail = "";
    let pingMs = 0;
    let lastD = 0;
    let loseStart = 0;
    let lastJump: number | null = null;
    const banner = new BannerTracker();
    let lastEnding = false;

    preloadSounds();

    const conn = connectGame({
      url: GAME_SERVER_URL,
      roomId,
      getIdToken: async () => {
        if (GAME_AUTH_OFF) return "";
        const u = auth.currentUser;
        if (!u) throw new Error("chưa đăng nhập");
        return u.getIdToken();
      },
      extraJoin: GAME_AUTH_OFF
        ? { slot: mySlot, name: slotsRef.current[mySlot]?.name ?? mySlot, levelId }
        : undefined,
      onSnap: (s) => {
        stats.countRecv();
        snap = s;
        buffer.push(s, performance.now());
      },
      onStatus: (s, d) => {
        status = s;
        detail = d ?? "";
      },
    });

    const offInput = attachInput((i) => conn.sendInput(i));
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyR") conn.restart(); // server tự kiểm tra: chỉ ô nhỏ nhất, chỉ khi đã thắng
    };
    window.addEventListener("keydown", onKey);

    const pinger = showNet
      ? window.setInterval(() => {
          conn.ping().then(
            (ms) => (pingMs = ms),
            () => (pingMs = -1),
          );
        }, 2000)
      : null;

    let raf = 0;
    const frame = (now: number) => {
      const cur = snap;
      if (!cur) {
        drawMessage(ctx, W, H, statusText(status, detail) || "Đang chờ dữ liệu…");
      } else {
        const frameLevel = getLevel(cur.lv);
        const sorted = Object.keys(cur.p).sort();
        const interp = buffer.positions(now);

        const players: DrawPlayer[] = sorted.map((slot) => {
          const [x, y] = interp[slot] ?? [cur.p[slot][0] / 100, cur.p[slot][1] / 100];
          const info = slotsRef.current[slot];
          return { slot, x, y, name: info?.name ?? slot, avatar: info?.avatar };
        });

        // "Thua": phát tiếng đúng lúc chuyển sang trạng thái thua
        const d = cur.d;
        if (d === 1 && lastD === 0) {
          playSound("restart");
          loseStart = now;
        }
        lastD = d;
        const loseSlot = d === 1 ? sorted[cur.c] : undefined;

        // tiếng nhảy: chỉ của chính mình, khi số lần nhảy thật sự (server đếm) tăng
        const n = cur.j[mySlot];
        if (n !== undefined) {
          if (lastJump !== null && n > lastJump) playSound("jump");
          lastJump = n;
        }

        const view = decodeObjView(cur.o);
        const isLast = nextLevelId(frameLevel.id) === null;
        drawFrame(ctx, frameLevel, {
          players,
          hasKey: cur.k === 1,
          won: cur.w === 1,
          lose: loseSlot ? { slot: loseSlot, t: Math.max(0, (now - loseStart) / 1000) } : null,
          levelName: frameLevel.name,
          isLastLevel: isLast,
          view,
          bodies: buffer.bodies(now),
          banner: banner.update(frameLevel, view, now),
          time: now / 1000,
        });

        // màn kết: chỉ cập nhật React khi đổi
        const showEnding = cur.w === 1 && isLast;
        if (showEnding !== lastEnding) {
          lastEnding = showEnding;
          setEnding(showEnding);
        }

        if (status !== "playing") {
          ctx.fillStyle = "rgba(255, 214, 0, 0.95)";
          ctx.fillRect(0, 0, W, 22);
          ctx.fillStyle = "#212121";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(statusText(status, detail), W / 2, 16);
        }

        if (showNet) {
          const sm = stats.summary(now);
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.fillRect(8, H - 28, 330, 22);
          ctx.fillStyle = "#FFEB3B";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "left";
          ctx.fillText(`ping ${pingMs < 0 ? "?" : Math.round(pingMs)}ms · nhận ${sm.recvPerSec}/s · ${status}`, 14, H - 13);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      offInput();
      window.removeEventListener("keydown", onKey);
      if (pinger !== null) clearInterval(pinger);
      conn.close();
    };
  }, [roomId, levelId, mySlot]);

  return (
    <>
      <div className="canvas-wrap">
        <canvas ref={canvasRef} width={VIEW_W} height={level.h * TILE} />
        <EndingPanel show={ending} />
      </div>
    </>
  );
}
```

## Bước 5 — Sandbox

**Tạo mới / thay toàn bộ** `src/pages/Sandbox.tsx` (160 dòng):

```tsx
// src/pages/Sandbox.tsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import badgeStar from "../assets/badge-star.svg";
import { GameEngine } from "../game/engine";
import EndingPanel from "../components/EndingPanel";
import { attachInput, KEYS_ARROWS, KEYS_WASD, type KeyMap } from "../game/input";
import { getLevel, LEVEL_IDS, nextLevelId, TRAINING_IDS } from "../game/level";
import { decodeObjView } from "../game/objects";
import { BannerTracker } from "../game/storyTracker";
import { drawFrame } from "../game/renderer";
import { PHYS, TILE, VIEW_W } from "../lib/constants";
import { playSound, preloadSounds } from "../lib/sound";

// người 3–5 trên cùng bàn phím: I J L · T F H · 8 4 6 (bàn phím số)
const EXTRA_KEYS: KeyMap[] = [
  { left: ["KeyJ"], right: ["KeyL"], jump: ["KeyI"] },
  { left: ["KeyF"], right: ["KeyH"], jump: ["KeyT"] },
  { left: ["Numpad4"], right: ["Numpad6"], jump: ["Numpad8"] },
];

export default function Sandbox() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const level = getLevel("1");
  const [ending, setEnding] = useState(false);
  // ?n=3 → 3 người (2–5)
  const n = Math.max(2, Math.min(5, Number(new URLSearchParams(window.location.search).get("n")) || 2));

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const slots = Array.from({ length: n }, (_, i) => `s${i}`);
    const engine = new GameEngine(level, slots);
    const maps = [KEYS_WASD, KEYS_ARROWS, ...EXTRA_KEYS];
    const offs = slots.map((s, i) => attachInput((inp) => engine.setInput(s, inp), maps[i]));
    const banner = new BannerTracker();
    let lastEnding = false;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyR") engine.restart();
      if (e.code === "KeyP") engine.respawnAtCheckpoint(); // về cột mốc gần nhất (thử lại một đoạn)
      const d = /^Digit([1-9])$/.exec(e.code)?.[1]; // phím 1..5: chọn chương để thử
      if (d && LEVEL_IDS.includes(d)) engine.setLevel(getLevel(d));
      if (e.code === "Digit0") engine.setLevel(getLevel(TRAINING_IDS[0])); // 0: level luyện tập
    };
    preloadSounds();
    let lastD = 0;
    let loseStart = 0;
    let winSince: number | null = null;
    const lastJump: Record<string, number> = {};
    window.addEventListener("keydown", onKey);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      engine.update((now - last) / 1000);
      last = now;
      if (engine.won) {
        winSince ??= now;
        const next = nextLevelId(engine.levelId);
        if (next && now - winSince >= PHYS.winDelay * 1000) {
          engine.setLevel(getLevel(next));
          winSince = null;
        }
      } else {
        winSince = null;
      }
      const snap = engine.snapshot();
      const lv = getLevel(snap.lv);
      const sorted = Object.keys(snap.p).sort();
      if (snap.d === 1 && lastD === 0) {
        playSound("restart");
        loseStart = now;
      }
      lastD = snap.d;
      for (const [slot, n] of Object.entries(snap.j)) {
        if (slot in lastJump && n > lastJump[slot]) playSound("jump"); // sandbox: nghe cả hai người chơi local
        lastJump[slot] = n;
      }
      const players = Object.entries(snap.p).map(([slot, [x, y]]) => ({ slot, x: x / 100, y: y / 100, name: slot }));
      const view = decodeObjView(snap.o);
      const isLast = nextLevelId(lv.id) === null;
      drawFrame(ctx, lv, {
        players,
        hasKey: snap.k === 1,
        won: snap.w === 1,
        lose: snap.d === 1 ? { slot: sorted[snap.c], t: engine.lose?.t ?? (now - loseStart) / 1000 } : null,
        levelName: lv.name,
        isLastLevel: isLast,
        view,
        banner: banner.update(lv, view, now),
        time: now / 1000,
      });
      const showEnding = snap.w === 1 && isLast;
      if (showEnding !== lastEnding) {
        lastEnding = showEnding;
        setEnding(showEnding);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      offs.forEach((off) => off());
      window.removeEventListener("keydown", onKey);
    };
  }, [level, n]);

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>
          <img src={badgeStar} alt="Star" style={{ width: 28, height: 28 }} />
          Chế Độ Luyện Tập (Offline Sandbox)
        </h1>
        <Link to="/" className="btn ghost sm">← Về Trang Chủ</Link>
      </div>

      <div className="arcade-shell">
        <div className="arcade-bezel-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={badgeStar} alt="Star" style={{ width: 16, height: 16 }} />
            <span>MÁY MÔ PHỎNG VẬT LÝ DÂY THỪNG · {n} NGƯỜI CHƠI LOCAL (?n=2..5)</span>
          </div>
          <div className="arcade-bezel-lights">
            <span className="red" />
            <span className="yellow" />
            <span className="green" />
          </div>
        </div>

        <div className="canvas-wrap">
          <canvas ref={canvasRef} width={VIEW_W} height={level.h * TILE} />
          <EndingPanel show={ending} />
        </div>

        <div className="arcade-controls-guide">
          <div>
            <strong>Người chơi 1 (s0):</strong> <span className="key-pill">W</span> <span className="key-pill">A</span> <span className="key-pill">D</span>
          </div>
          <div>
            <strong>Người chơi 2 (s1):</strong> <span className="key-pill">↑</span> <span className="key-pill">←</span> <span className="key-pill">→</span>
          </div>
          <div>
            <strong>Chơi lại:</strong> Bấm phím <span className="key-pill">R</span>
          </div>
          {n >= 3 && (
            <div>
              <strong>Người 3–5:</strong> <span className="key-pill">I J L</span> <span className="key-pill">T F H</span> <span className="key-pill">8 4 6</span>
            </div>
          )}
          <div>
            <strong>Chọn chương:</strong> Bấm <span className="key-pill">1</span>…<span className="key-pill">5</span> · <span className="key-pill">0</span> luyện tập · <span className="key-pill">P</span> về cột mốc
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Bước 6 — Phòng: cần ít nhất 2 người

Khác bản gốc 2 chỗ (hằng `MIN_PLAYERS` và `disabled`/`title` của nút "Bắt đầu"); dán nguyên file:

**Tạo mới / thay toàn bộ** `src/pages/Room.tsx` (371 dòng):

```tsx
// src/pages/Room.tsx
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ref, set } from "firebase/database";
import GameCanvas from "../components/GameCanvas";
import TouchControls from "../components/TouchControls";
import badgeStar from "../assets/badge-star.svg";
import { db } from "../lib/firebase";
import { PRESET_AVATARS } from "../lib/avatars";
import { SLOT_COLORS } from "../lib/constants";
import { useDbValue, useUser } from "../lib/hooks";
import { loadProfile, saveProfile } from "../lib/profile";
import { joinRoom } from "../lib/rooms";
import { fileToAvatar } from "../lib/avatar";
import type { Profile, RoomMeta, SlotInfo } from "../lib/types";

// Level được thiết kế cho nhóm 2–5 người. Thử một mình: tạo .env.local với VITE_MIN_PLAYERS=1
const MIN_PLAYERS = Number(import.meta.env.VITE_MIN_PLAYERS ?? 2);

export default function Room() {
  const { id = "" } = useParams();
  const uid = useUser()?.uid ?? null;
  const meta = useDbValue<RoomMeta>(`roomList/${id}`);
  const slotsQ = useDbValue<Record<string, SlotInfo>>(`rooms/${id}/slots`);
  const [mySlot, setMySlot] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Hỗ trợ người vào thẳng qua link mà chưa có tên trong localStorage
  const [profile, setProfile] = useState<Profile>(() => {
    const p = loadProfile();
    if (!p.avatar && PRESET_AVATARS[0]) {
      p.avatar = PRESET_AVATARS[0].src;
    }
    return p;
  });
  const [needsName, setNeedsName] = useState(() => !loadProfile().name.trim());
  const [joinTrigger, setJoinTrigger] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const currentProfile = loadProfile();
    if (!currentProfile.name.trim()) {
      setNeedsName(true);
      return;
    }
    setNeedsName(false);
    let cancelled = false;
    let leave: (() => Promise<void>) | null = null;
    joinRoom(id, uid, currentProfile).then(
      (r) => {
        if (cancelled) {
          void r.leave();
          return;
        }
        leave = r.leave;
        setMySlot(r.slot);
      },
      (e: Error) => {
        if (!cancelled) setError(e.message);
      },
    );
    return () => {
      cancelled = true;
      void leave?.();
    };
  }, [id, uid, joinTrigger]);

  function submitName(e: FormEvent) {
    e.preventDefault();
    if (!profile.name.trim()) return;
    saveProfile(profile);
    setNeedsName(false);
    setJoinTrigger((t) => t + 1);
  }

  async function onPickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const avatar = await fileToAvatar(file);
      const updated = { ...profile, avatar };
      setProfile(updated);
      saveProfile(updated);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleSelectPreset(src: string) {
    const updated = { ...profile, avatar: src };
    setProfile(updated);
    saveProfile(updated);
  }

  function copyLink() {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const setPhase = async (phase: "lobby" | "playing") => {
    await set(ref(db, `roomList/${id}/phase`), phase).catch(console.error);
  };

  const slots = slotsQ.value ?? {};
  const keys = Object.keys(slots).sort();
  const isCoordinator = mySlot !== null && keys[0] === mySlot;
  const isHost = isCoordinator;

  if (error) {
    return (
      <div className="page">
        <h1>
          <img src={badgeStar} alt="Star" style={{ width: 26, height: 26 }} />
          PICO ROPE: ĐẠI ĐOÀN KẾT
        </h1>
        <p className="err">{error}</p>
        <Link to="/" className="btn ghost sm">← Về trang chủ</Link>
      </div>
    );
  }

  if (!meta.ready || !slotsQ.ready) {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: 40 }}>
        <h2>Đang tải thông tin phòng…</h2>
      </div>
    );
  }

  if (!meta.value) {
    return (
      <div className="page">
        <h1>PICO ROPE: ĐẠI ĐOÀN KẾT</h1>
        <div className="card">
          <p className="err">Phòng không tồn tại hoặc đã bị đóng.</p>
          <Link to="/" className="btn ghost">← Về danh sách phòng</Link>
        </div>
      </div>
    );
  }

  const m = meta.value;

  if (needsName) {
    return (
      <div className="page">
        <h1>
          <img src={badgeStar} alt="Star" style={{ width: 28, height: 28 }} />
          {m.name}
        </h1>
        <div className="card highlight">
          <h3 style={{ margin: "0 0 8px", color: "var(--red-dark)" }}>
            Tham Gia Phòng Chơi
          </h3>
          <p className="muted" style={{ margin: "0 0 16px" }}>
            Bạn đang truy cập qua liên kết mời trực tiếp. Vui lòng nhập tên của bạn để gia nhập đội:
          </p>

          <form onSubmit={submitName} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input
              type="text"
              placeholder="Nhập tên của bạn..."
              maxLength={20}
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              style={{ maxWidth: 320 }}
              autoFocus
            />

            <div>
              <div className="muted" style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Chọn hình đại diện:
              </div>
              <div className="preset-avatars-grid">
                {PRESET_AVATARS.map((pa) => {
                  const isSelected = profile.avatar === pa.src;
                  return (
                    <button
                      type="button"
                      key={pa.id}
                      className={`preset-avatar-btn ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectPreset(pa.src)}
                    >
                      <img className="avatar" src={pa.src} alt={pa.name} />
                      <span>{pa.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="muted" style={{ fontSize: 12 }}>Tự tải ảnh riêng:</span>
              <input type="file" accept="image/*" onChange={onPickAvatar} style={{ fontSize: 12 }} />
            </div>

            <button
              className="btn gold"
              type="submit"
              disabled={!profile.name.trim()}
              style={{ alignSelf: "flex-start", marginTop: 8 }}
            >
              Gia Nhập Phòng Ngay
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>
          <img src={badgeStar} alt="Star" style={{ width: 28, height: 28 }} />
          {m.name}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="tag host">{keys.length}/{m.max} người</span>
          <span className={`tag ${m.phase === "playing" ? "playing" : "waiting"}`}>
            {m.phase === "playing" ? "● Đang chơi" : "○ Sảnh chờ"}
          </span>
        </div>
      </div>

      {/* Control bar */}
      <div className="row" style={{ marginBottom: 16, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/" className="btn ghost sm">
            ← Rời Phòng
          </Link>
          <button className="btn sm" onClick={copyLink}>
            {copied ? "✓ Đã Chép Link!" : "🔗 Sao Chép Link Mời"}
          </button>
        </div>

        {isHost && (
          <span className="tag host" style={{ fontSize: 13 }}>
            ★ Bạn là Chủ Phòng (Host)
          </span>
        )}
      </div>

      {/* Lobby Phase */}
      {m.phase === "lobby" && (
        <div className="card highlight">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: "var(--red-dark)" }}>
              ★ Danh Sách Người Chơi Trong Phòng
            </h3>
            <span className="muted" style={{ fontSize: 13 }}>
              Cần ít nhất 1 người chơi để bắt đầu
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {Array.from({ length: m.max }, (_, i) => `s${i}`).map((s, idx) => {
              const p = slots[s];
              const isSlotHost = p && s === keys[0];
              const isMe = p && s === mySlot;
              const slotColor = SLOT_COLORS[idx % SLOT_COLORS.length];

              return (
                <div
                  className={`slot ${isMe ? "current-user" : ""}`}
                  key={s}
                  style={{ borderLeftWidth: 6, borderLeftColor: slotColor }}
                >
                  {p?.avatar ? (
                    <img className="avatar" src={p.avatar} alt="" />
                  ) : (
                    <div className="avatar" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#888" }}>
                      Trống
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
                    <span style={{ fontWeight: 700, fontSize: 14, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {p ? p.name : <span className="muted" style={{ fontStyle: "italic" }}>(Đang đợi...)</span>}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {isSlotHost && <span className="tag host" style={{ fontSize: 10, padding: "1px 6px" }}>Chủ phòng</span>}
                      {isMe && <span className="tag" style={{ fontSize: 10, padding: "1px 6px" }}>Bạn</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24, textAlign: "center" }}>
            {isHost ? (
              <button
                className="btn gold"
                style={{ fontSize: 18, padding: "12px 28px" }}
                disabled={keys.length < MIN_PLAYERS}
                title={keys.length < MIN_PLAYERS ? `Cần ít nhất ${MIN_PLAYERS} người` : undefined}
                onClick={() => setPhase("playing")}
              >
                ★ BẮT ĐẦU CHƠI NGAY ★
              </button>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "var(--bg-subtle)", borderRadius: 8, border: "2px dashed var(--border)" }}>
                <span style={{ fontSize: 16 }}>⏳</span>
                <span className="muted" style={{ fontWeight: 600 }}>
                  Đang chờ chủ phòng nhấn bắt đầu...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Playing Phase - Arcade Shell Frame */}
      {m.phase === "playing" && (
        <div className="arcade-shell">
          <div className="arcade-bezel-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src={badgeStar} alt="Star" style={{ width: 18, height: 18 }} />
              <span>PICO ROPE · {m.name.toUpperCase()}</span>
            </div>
            <div className="arcade-bezel-lights">
              <span className="red" />
              <span className="yellow" />
              <span className="green" />
            </div>
          </div>

          {mySlot === null ? (
            <div style={{ padding: 40, textAlign: "center", background: "#FFF", borderRadius: "0 0 6px 6px" }}>
              <p className="muted">Đang kết nối tín hiệu vào phòng…</p>
            </div>
          ) : (
            <GameCanvas roomId={id} levelId={m.level} slots={slots} mySlot={mySlot} />
          )}
          {mySlot !== null && <TouchControls showRestart={isHost} />}

          <div className="arcade-controls-guide">
            <div>
              <span className="key-pill">A</span>
              <span className="key-pill">D</span> hoặc <span className="key-pill">←</span>
              <span className="key-pill">→</span> Di chuyển
            </div>
            <div>
              <span className="key-pill">W</span> hoặc <span className="key-pill">Space</span>
              <span className="key-pill">↑</span> Bật nhảy
            </div>
            {isHost && (
              <div>
                <span className="key-pill">R</span> Chơi lại khi thắng
              </div>
            )}
          </div>

          {isHost && (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn ghost sm" onClick={() => setPhase("lobby")}>
                ⤺ Kết Thúc & Về Sảnh Chờ
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

Thử một mình trên máy dev: tạo `mlngame/.env.local`:

```ini
VITE_MIN_PLAYERS=1
```

## Bước 7 — CSS

```css
/* src/index.css — DÁN THÊM VÀO CUỐI FILE (không xóa gì) */
/* ---------- Khung canvas + màn kết (EndingPanel) ---------- */
.canvas-wrap {
  position: relative;
}
.ending-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 40px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--ink);
  text-align: center;
  font-family: var(--font-body);
}
.ending-question {
  margin: 0 0 6px;
  font-size: 16px;
  font-style: italic;
  color: var(--ink-light);
}
.ending-panel h2 {
  margin: 0 0 14px;
  font-family: var(--font-title);
  font-size: 40px;
  color: var(--red-dark);
}
.ending-panel ol {
  max-width: 620px;
  margin: 0;
  padding-left: 22px;
  text-align: left;
  font-size: 15px;
  line-height: 1.6;
}
```

### ✅ Kiểm tra

```bash
npx tsc -b
npm run build
```

Cả hai thành công. Mở `npm run dev` → `http://localhost:5173/sandbox?n=2`: thấy "Đoạn 1/8" góc trái, "1945–1946 · Nền móng" góc phải, dòng chữ "1919 — …" hiện to rồi thu nhỏ.
