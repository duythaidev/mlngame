// src/game/engine.ts
import * as planck from "planck";
import { PHYS, PLAYER_SIZE } from "../lib/constants";
import type { Level } from "./level";
import { EMPTY_INPUT, type InputState, type Snapshot } from "./protocol";

const { Vec2, Box, World } = planck;

export interface GameEngineOptions {
  localSlots?: string[];
  onDied?: (slot: string) => void;
  onGotKey?: () => void;
}

interface Actor {
  slot: string;
  isLocal: boolean;
  body: planck.Body;
  supports: Map<planck.Body, number>; // vật đang đỡ dưới chân -> số điểm chạm
  load: number; // số người đang đứng trên đầu
  ropeX: number; // lực dây theo phương ngang ở bước trước (+ = sang phải)
  ropeLift: number; // lực dây kéo LÊN ở bước trước (làm giảm lực ép chân → giảm bám)
  prevJ: number; // để bắt cạnh nhấn nhảy
  jumped: boolean; // đang bay do TỰ nhảy (được lái trên không); rơi/bị kéo thì chỉ đu nhẹ
}

interface Aabb {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlap(a: Aabb, b: Aabb): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export class GameEngine {
  tick = 0;
  hasKey = false;
  won = false;
  /** Đang trong khoảng "Thua": t = số giây đã qua, culprit = ô của người chạm gai / rơi hố. */
  lose: { t: number; culprit: string } | null = null;
  readonly jumps: Record<string, number> = {};

  private level: Level;
  private slots: string[];
  private localSlotsSet: Set<string>;
  private onDiedCallback?: (slot: string) => void;
  private onGotKeyCallback?: () => void;

  private world!: planck.World;
  private actors: Actor[] = [];
  private inputs = new Map<string, InputState>();
  private inputSeqs = new Map<string, number>();
  private acc = 0;
  private resetCount = 0;

  constructor(level: Level, slots: string[], options?: GameEngineOptions) {
    this.level = level;
    this.slots = [...slots].sort(); // thứ tự dây = thứ tự ô
    this.localSlotsSet = new Set(options?.localSlots ?? this.slots);
    this.onDiedCallback = options?.onDied;
    this.onGotKeyCallback = options?.onGotKey;
    for (const s of this.slots) this.jumps[s] = 0;
    this.build();
  }

  isLocal(slot: string): boolean {
    return this.localSlotsSet.has(slot);
  }

  get levelId(): string {
    return this.level.id;
  }

  /** Sang level khác (host tự động qua màn): dựng lại thế giới từ đầu. */
  setLevel(level: Level): void {
    this.level = level;
    this.restart();
  }

  setInput(slot: string, input: InputState, seq?: number): void {
    this.inputs.set(slot, input);
    if (seq !== undefined) this.inputSeqs.set(slot, seq);
  }

  /** Cập nhật vị trí/vận tốc cho actor remote từ gói nội suy. */
  setRemote(slot: string, x: number, y: number, vx: number, vy: number): void {
    const a = this.actors.find((act) => act.slot === slot);
    if (!a || a.isLocal) return;
    a.body.setPosition(new Vec2(x, y));
    a.body.setLinearVelocity(new Vec2(vx, vy));
  }

  setKey(hasKey: boolean): void {
    this.hasKey = hasKey;
  }

  freeze(): void {
    for (const a of this.actors) {
      if (a.isLocal) a.body.setLinearVelocity(new Vec2(0, 0));
    }
  }

  respawn(slots?: string[]): void {
    if (slots) this.slots = [...slots].sort();
    this.restart();
  }

  getLocalPos(slot: string): { x: number; y: number; vx: number; vy: number; grounded: boolean; inDoor: boolean } | null {
    const a = this.actors.find((act) => act.slot === slot);
    if (!a) return null;
    const p = a.body.getPosition();
    const v = a.body.getLinearVelocity();
    const grounded = a.supports.size > 0;
    const d = this.level.door;
    const inDoor = !!(d && p.x > d.x && p.x < d.x + d.w && p.y > d.y && p.y < d.y + d.h);
    return {
      x: Math.round(p.x * 100),
      y: Math.round(p.y * 100),
      vx: Math.round(v.x * 100),
      vy: Math.round(v.y * 100),
      grounded,
      inDoor,
    };
  }

  /** Chơi lại từ đầu (chết hoặc bấm R sau khi thắng). */
  restart(): void {
    this.resetCount++;
    this.hasKey = false;
    this.won = false;
    this.lose = null;
    this.acc = 0;
    this.build();
  }

  /** Gọi mỗi frame với dt (giây). Tự chia thành các bước 1/60. */
  update(dt: number): void {
    this.acc += Math.min(dt, 0.1); // chặn "spiral of death" khi tab bị treo
    while (this.acc >= PHYS.step) {
      this.acc -= PHYS.step;
      this.fixedStep();
    }
  }

  snapshot(): Snapshot {
    const p: Snapshot["p"] = {};
    const v: NonNullable<Snapshot["v"]> = {};
    for (const a of this.actors) {
      const pos = a.body.getPosition();
      const vel = a.body.getLinearVelocity();
      p[a.slot] = [Math.round(pos.x * 100), Math.round(pos.y * 100)];
      v[a.slot] = [Math.round(vel.x * 100), Math.round(vel.y * 100)];
    }
    const c = this.lose ? this.slots.indexOf(this.lose.culprit) : -1;
    return {
      t: this.tick,
      r: this.resetCount,
      k: this.hasKey ? 1 : 0,
      w: this.won ? 1 : 0,
      d: this.lose ? 1 : 0,
      c,
      lv: this.level.id,
      j: { ...this.jumps },
      p,
      v,
      a: Object.fromEntries(this.inputSeqs),
    };
  }

  // ---------------------------------------------------------------- nội bộ

  private build(): void {
    const world = new World({ gravity: new Vec2(0, PHYS.gravity) });

    const ground = world.createBody({ type: "static" });
    for (const r of this.level.solids) {
      ground.createFixture({
        shape: new Box(r.w / 2, r.h / 2, new Vec2(r.x + r.w / 2, r.y + r.h / 2), 0),
        friction: 0.2,
      });
    }

    const byBody = new Map<planck.Body, Actor>();
    this.actors = this.slots.map((slot, i) => {
      const isLocal = this.localSlotsSet.has(slot);
      const body = world.createBody({
        type: isLocal ? "dynamic" : "kinematic",
        position: new Vec2(this.level.spawn.x + i, this.level.spawn.y),
        fixedRotation: true,
        allowSleep: false,
      });
      const half = PLAYER_SIZE / 2;
      // friction 0: bám/phanh do lực chân tự tính (giới hạn theo lực ép), không dính tường
      body.createFixture({ shape: new Box(half, half), density: 1, friction: 0 }); // thân vuông chuẩn
      // cảm biến chân: mỏng, nằm sát đáy, gần bằng bề ngang thân
      body.createFixture({
        shape: new Box(half - 0.03, 0.08, new Vec2(0, half), 0),
        isSensor: true,
        userData: "foot",
      });
      const actor: Actor = {
        slot,
        isLocal,
        body,
        supports: new Map(),
        load: 0,
        ropeX: 0,
        ropeLift: 0,
        prevJ: 0,
        jumped: false,
      };
      byBody.set(body, actor);
      return actor;
    });

    const track = (c: planck.Contact, delta: number) => {
      const fa = c.getFixtureA();
      const fb = c.getFixtureB();
      for (const [foot, other] of [[fa, fb], [fb, fa]] as const) {
        if (foot.getUserData() !== "foot" || other.isSensor()) continue;
        const me = byBody.get(foot.getBody());
        if (!me) continue;
        const under = other.getBody();
        const n = (me.supports.get(under) ?? 0) + delta;
        if (n > 0) me.supports.set(under, n);
        else me.supports.delete(under);
        const below = byBody.get(under);
        if (below) below.load += delta; // mình đang đứng trên đầu người khác
      }
    };
    world.on("begin-contact", (c) => track(c, 1));
    world.on("end-contact", (c) => track(c, -1));

    this.world = world;
  }

  private fixedStep(): void {
    if (this.lose) {
      this.lose.t += PHYS.step;
      this.tick++;
      if (!this.onDiedCallback && this.lose.t >= PHYS.loseDelay) {
        this.restart(); // Chế độ Sandbox tự restart sau loseDelay
      }
      return;
    }
    this.applyRope(); // dây trước: lực chân (phanh) bù ngay vận tốc dây vừa truyền, không bị trôi dần
    this.drive();
    this.world.step(PHYS.step, 8, 3);
    this.tick++;
    this.checkRules();
  }

  /**
   * Chân chạy = LỰC ngang theo khung thế giới (không chở người đứng trên đầu),
   * trên đất giới hạn theo lực ép; trên không chỉ là lực nhỏ (lái khi tự nhảy, đu khi bị treo).
   */
  private drive(): void {
    for (const a of this.actors) {
      if (!a.isLocal) continue; // Chỉ điều khiển actor local

      const inp = this.inputs.get(a.slot) ?? EMPTY_INPUT;
      const body = a.body;
      const m = body.getMass();
      const v = body.getLinearVelocity();
      const grounded = a.supports.size > 0;
      if (grounded && v.y >= -0.01) a.jumped = false; // chỉ coi là đã đáp đất khi không còn đang bay lên

      let target = (inp.r - inp.l) * PHYS.speed;
      // người chơi chặn nhau như tường: chỉ hãm vận tốc CỦA MÌNH đang hướng vào người kia
      // (tối đa bằng tốc độ họ đang đi ra xa), không bao giờ bị kéo theo người đang lao vào mình
      const blk = this.blocker(a);
      if (blk) {
        const allowed = Math.max(0, blk.vx * blk.dir); // tốc độ được phép tiến về phía họ
        if (v.x * blk.dir > allowed) {
          v.x = blk.dir * allowed;
          body.setLinearVelocity(new Vec2(v.x, v.y));
        }
        if (target * blk.dir > allowed) target = blk.dir * allowed;
      }
      const pressing = inp.l !== inp.r;
      // bấm chạy: như ma sát tĩnh, đủ lực đạt vận tốc mục tiêu ngay trong 1 bước (không vượt lực bám).
      // đứng yên: phanh TỈ LỆ vận tốc → đang trượt thì dừng gần như ngay (không lướt),
      //           nhưng bị dây kéo liên tục (người treo dưới hố) thì vẫn bị lôi đi từ từ.
      const want = pressing || !grounded ? (m * (target - v.x)) / PHYS.step : -m * v.x * PHYS.idleBrake;
      let maxF: number;
      if (grounded) {
        // lực ép = trọng lượng (+ người đứng trên đầu) − lực dây kéo lên
        const normal = Math.max(0, m * PHYS.gravity * (1 + a.load) - a.ropeLift);
        maxF = this.slippingOffEdge(a) ? 0 : PHYS.grip * normal;
      } else if (!pressing) {
        maxF = 0; // không bấm gì: trên không không có lực cản ngang, giữ quán tính
      } else {
        maxF = (a.jumped ? PHYS.airControl : PHYS.swingControl) * m * PHYS.gravity;
      }
      if (maxF > 0) body.applyForceToCenter(new Vec2(clamp(want, -maxF, maxF), 0), true);

      if (!grounded) this.stepOverLedge(a);

      // nhảy: phải đứng trên mặt phẳng và KHÔNG có ai đè trên đầu
      if (inp.j === 1 && a.prevJ === 0 && grounded && a.load === 0) {
        body.setLinearVelocity(new Vec2(v.x, -PHYS.jump));
        a.jumped = true;
        this.jumps[a.slot] = (this.jumps[a.slot] ?? 0) + 1;
      }
      a.prevJ = inp.j;
    }
  }

  /**
   * Dây = ràng buộc "không dài quá ropeRest" (chùng thì không có lực), giải bằng xung lượng.
   * Dây là đoạn thẳng nối tâm, bỏ qua địa hình (như Pico Park).
   * Chế độ phân tán: chỉ tính đoạn dây có ít nhất một đầu là local.
   */
  private applyRope(): void {
    for (const a of this.actors) {
      a.ropeX = 0;
      a.ropeLift = 0;
    }
    if (this.actors.length < 2) return;

    const segs = [];
    for (let i = 0; i < this.actors.length - 1; i++) {
      const A = this.actors[i];
      const B = this.actors[i + 1];
      if (!A.isLocal && !B.isLocal) continue; // Cả hai đều remote: bỏ qua

      const pa = A.body.getPosition();
      const pb = B.body.getPosition();
      const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const stretch = len - PHYS.ropeRest;
      if (stretch <= 0 || len < 1e-4) continue; // dây chùng
      const ua = new Vec2((pb.x - pa.x) / len, (pb.y - pa.y) / len);
      const ub = new Vec2(-ua.x, -ua.y);
      const mMin = Math.min(A.body.getMass() || 1, B.body.getMass() || 1);
      const maxImpulse = PHYS.ropeMaxTension * mMin * PHYS.gravity * PHYS.step;
      const bothLocal = A.isLocal && B.isLocal;
      const ima = 1;
      const imb = 1;
      segs.push({ A, B, ua, ub, stretch, bothLocal, ima, imb, total: 0, maxImpulse });
    }

    for (let it = 0; it < PHYS.ropeIters; it++) {
      for (const s of segs) {
        const va = s.A.body.getLinearVelocity();
        const vb = s.B.body.getLinearVelocity();
        // tốc độ dây dài ra (dương = hai người đang rời xa nhau)
        const grow = -Vec2.dot(va, s.ua) - Vec2.dot(vb, s.ub);
        const bias = (PHYS.ropeBias * Math.max(0, Math.min(s.stretch, 0.5) - PHYS.ropeSlop)) / PHYS.step;
        const old = s.total;
        // dây chỉ kéo, không đẩy. Trong đoạn giãn nhỏ, lực căng có trần (dây co giãn hấp thụ cú giật);
        // giãn quá ropeMaxStretch thì dây cứng hẳn (không bao giờ dài vô hạn)
        const cap = s.stretch < PHYS.ropeMaxStretch ? s.maxImpulse : Infinity;
        s.total = Math.min(cap, Math.max(0, old + (grow + bias) / (s.ima + s.imb)));
        const d = s.total - old;

        if (s.bothLocal) {
          s.A.body.setLinearVelocity(new Vec2(va.x + s.ua.x * d * s.ima, va.y + s.ua.y * d * s.ima));
          s.B.body.setLinearVelocity(new Vec2(vb.x + s.ub.x * d * s.imb, vb.y + s.ub.y * d * s.imb));
        } else {
          // Một bên local, một bên remote:
          // stretch < ropeMaxStretch: local nhận 1 nửa xung lượng (d * 1)
          // stretch >= ropeMaxStretch: local nhận toàn bộ xung lượng (d * 2) để không dài vô hạn
          const factor = s.stretch < PHYS.ropeMaxStretch ? 1 : 2;
          if (s.A.isLocal) {
            s.A.body.setLinearVelocity(new Vec2(va.x + s.ua.x * d * factor, va.y + s.ua.y * d * factor));
          } else if (s.B.isLocal) {
            s.B.body.setLinearVelocity(new Vec2(vb.x + s.ub.x * d * factor, vb.y + s.ub.y * d * factor));
          }
        }
      }
    }

    // người đang lơ lửng bị dây kéo LÊN: giới hạn tốc độ đi lên (thay cho ma sát người–vách hãm đà),
    // tránh bị "bắn" vọt lên khi vừa thoát miệng hố
    for (const sg of segs) {
      if (sg.total <= 0) continue;
      for (const [act, u] of [[sg.A, sg.ua], [sg.B, sg.ub]] as const) {
        if (!act.isLocal) continue;
        if (act.supports.size > 0 || u.y >= 0) continue; // đang đứng, hoặc dây không kéo lên
        const v = act.body.getLinearVelocity();
        if (v.y < -PHYS.ropeLiftSpeed) act.body.setLinearVelocity(new Vec2(v.x, -PHYS.ropeLiftSpeed));
      }
    }

    // lưu lực căng theo phương đứng (y hướng xuống → kéo lên là -u.y) cho bước sau
    for (const s of segs) {
      const tension = s.total / PHYS.step;
      if (s.A.isLocal) {
        s.A.ropeX += tension * s.ua.x;
        s.A.ropeLift += tension * -s.ua.y;
      }
      if (s.B.isLocal) {
        s.B.ropeX += tension * s.ub.x;
        s.B.ropeLift += tension * -s.ub.y;
      }
    }
  }

  /**
   * Bước qua mép: người đang lơ lửng bị dây kéo NGANG vào vách, mà mép vách chỉ cao hơn chân
   * tối đa PHYS.stepUp → nhún vừa đủ để lên mép (như trèo), thay vì kẹt ngay dưới miệng hố.
   */
  private stepOverLedge(a: Actor): void {
    const m = a.body.getMass();
    if (Math.abs(a.ropeX) < 0.3 * m * PHYS.gravity) return; // dây không kéo ngang đủ mạnh
    const p = a.body.getPosition();
    const half = PLAYER_SIZE / 2;
    const dir = Math.sign(a.ropeX);
    const px = p.x + dir * (half + 0.05); // ngay sát cạnh thân, phía bị kéo
    const feet = p.y + half;
    if (!this.solidAt(px, feet - 0.02)) return; // không có vách cạnh chân
    let top = Math.floor(feet - 0.02); // hàng ô chứa điểm đó → mép trên của nó
    while (this.solidAt(px, top - 0.5)) top -= 1; // leo lên tới đỉnh vách
    const h = feet - top;
    if (h <= 0 || h > PHYS.stepUp) return;
    const v = a.body.getLinearVelocity();
    const vy = -Math.sqrt(2 * PHYS.gravity * (h + 0.05));
    if (v.y > vy) a.body.setLinearVelocity(new Vec2(v.x, vy));
  }

  private solidAt(x: number, y: number): boolean {
    return this.level.solids.some((r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h);
  }

  /**
   * Người chơi khác đang chắn ngang sát bên (hoặc sắp chạm trong bước này)?
   * Trả về hướng bị chắn (-1 / +1) và vận tốc ngang của người chắn.
   */
  private blocker(a: Actor): { dir: number; vx: number } | null {
    const p = a.body.getPosition();
    const vx = a.body.getLinearVelocity().x;
    for (const o of this.actors) {
      if (o === a) continue;
      const q = o.body.getPosition();
      const ovx = o.body.getLinearVelocity().x;
      const dx = q.x - p.x;
      if (Math.abs(q.y - p.y) > PLAYER_SIZE - 0.05) continue; // đang chồng lên nhau, không phải chắn ngang
      if (Math.abs(dx) < PLAYER_SIZE + 0.02 + Math.abs(vx - ovx) * PHYS.step) return { dir: Math.sign(dx), vx: ovx };
    }
    return null;
  }

  /**
   * Đứng sát mép (nửa thân phía ngoài lơ lửng trên khoảng trống) mà dây kéo XUỐNG + CHÉO ra phía đó
   * → mất chỗ bám, trượt khỏi mép (thay cho việc thân bị lật, vì nhân vật khóa xoay).
   */
  private slippingOffEdge(a: Actor): boolean {
    if (a.ropeLift >= 0 || Math.abs(a.ropeX) < 1e-3) return false; // dây không kéo xuống / không kéo ngang
    const p = a.body.getPosition();
    const dir = Math.sign(a.ropeX);
    const outer = p.x + dir * (PLAYER_SIZE / 2 - 0.02); // mép ngoài của thân theo hướng bị kéo
    const below = p.y + PLAYER_SIZE / 2 + 0.05; // ngay dưới chân
    return !this.solidAt(outer, below);
  }

  private checkRules(): void {
    const { level } = this;
    let culprit: string | null = null;
    let inDoor = 0;
    let localCount = 0;

    for (const a of this.actors) {
      if (!a.isLocal) continue;
      localCount++;

      const p = a.body.getPosition();
      if (p.y - PLAYER_SIZE / 2 > level.h) culprit ??= a.slot; // tụt hẳn khỏi đáy map

      const box: Aabb = { x: p.x - 0.35, y: p.y - 0.35, w: 0.7, h: 0.7 };
      for (const s of level.spikes) {
        // mũi gai chỉ ở nửa dưới của ô
        if (overlap(box, { x: s.x + 0.1, y: s.y + 0.5, w: 0.8, h: 0.5 })) culprit ??= a.slot;
      }
      if (!this.hasKey && level.key && overlap(box, level.key)) {
        this.hasKey = true;
        this.onGotKeyCallback?.();
      }

      const d = level.door;
      if (d && p.x > d.x && p.x < d.x + d.w && p.y > d.y && p.y < d.y + d.h) inDoor++;
    }

    if (culprit && !this.won) {
      this.lose = { t: 0, culprit }; // bắt đầu "Thua"
      const deadActor = this.actors.find((a) => a.slot === culprit);
      if (deadActor) deadActor.body.setLinearVelocity(new Vec2(0, 0));
      if (this.onDiedCallback) {
        this.onDiedCallback(culprit);
      }
      return;
    }

    // Ở chế độ Sandbox (toàn bộ actor local, không có onDiedCallback): tự win khi tất cả vào cửa
    if (!this.onDiedCallback && this.hasKey && localCount > 0 && inDoor === localCount) {
      this.won = true;
    }
  }
}
