// src/game/engine.ts
import * as planck from "planck";
import { PHYS, PLAYER_SIZE } from "../lib/constants";
import type { Level } from "./level";
import { EMPTY_INPUT, type InputState, type Snapshot } from "./protocol";

const { Vec2, Box, World } = planck;

interface Actor {
  slot: string;
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

  private level: Level;
  private slots: string[];
  private world!: planck.World;
  private actors: Actor[] = [];
  private inputs = new Map<string, InputState>();
  private acc = 0;
  private resetCount = 0;

  constructor(level: Level, slots: string[]) {
    this.level = level;
    this.slots = [...slots].sort(); // thứ tự dây = thứ tự ô
    this.build();
  }

  setInput(slot: string, input: InputState): void {
    this.inputs.set(slot, input);
  }

  /** Chơi lại từ đầu (chết hoặc bấm R sau khi thắng). */
  restart(): void {
    this.resetCount++;
    this.hasKey = false;
    this.won = false;
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
    for (const a of this.actors) {
      const pos = a.body.getPosition();
      p[a.slot] = [Math.round(pos.x * 100), Math.round(pos.y * 100)];
    }
    return { t: this.tick, r: this.resetCount, k: this.hasKey ? 1 : 0, w: this.won ? 1 : 0, p };
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
      const body = world.createBody({
        type: "dynamic",
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
      const actor: Actor = { slot, body, supports: new Map(), load: 0, ropeX: 0, ropeLift: 0, prevJ: 0, jumped: false };
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
      const inp = this.inputs.get(a.slot) ?? EMPTY_INPUT;
      const body = a.body;
      const m = body.getMass();
      const v = body.getLinearVelocity();
      const grounded = a.supports.size > 0;
      if (grounded && v.y >= -0.01) a.jumped = false; // chỉ coi là đã đáp đất khi không còn đang bay lên

      let target = (inp.r - inp.l) * PHYS.speed;
      // người chơi chặn nhau như tường: lao vào người khác thì dừng ngay, không đẩy được
      const blk = this.blocker(a);
      if (blk && (v.x - blk.vx) * blk.dir > 0) {
        v.x = blk.vx;
        body.setLinearVelocity(new Vec2(v.x, v.y));
      }
      if (blk && Math.sign(target) === blk.dir) target = blk.vx;
      // như ma sát tĩnh: đủ lực để đạt vận tốc mục tiêu ngay trong 1 bước, nhưng không vượt lực bám
      const want = (m * (target - v.x)) / PHYS.step;
      let maxF: number;
      if (grounded) {
        // lực ép = trọng lượng (+ người đứng trên đầu) − lực dây kéo lên
        const normal = Math.max(0, m * PHYS.gravity * (1 + a.load) - a.ropeLift);
        maxF = this.slippingOffEdge(a) ? 0 : PHYS.grip * normal;
      } else if (inp.l === inp.r) {
        maxF = 0; // không bấm gì: trên không không có lực cản ngang, giữ quán tính
      } else {
        maxF = (a.jumped ? PHYS.airControl : PHYS.swingControl) * m * PHYS.gravity;
      }
      if (maxF > 0) body.applyForceToCenter(new Vec2(clamp(want, -maxF, maxF), 0), true);

      // nhảy: phải đứng trên mặt phẳng và KHÔNG có ai đè trên đầu
      if (inp.j === 1 && a.prevJ === 0 && grounded && a.load === 0) {
        body.setLinearVelocity(new Vec2(v.x, -PHYS.jump));
        a.jumped = true;
      }
      a.prevJ = inp.j;
    }
  }

  /**
   * Dây = ràng buộc "không dài quá ropeRest" (chùng thì không có lực), giải bằng xung lượng.
   * Dây là đoạn thẳng nối tâm, bỏ qua địa hình (như Pico Park).
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
      const pa = A.body.getPosition();
      const pb = B.body.getPosition();
      const len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const stretch = len - PHYS.ropeRest;
      if (stretch <= 0 || len < 1e-4) continue; // dây chùng
      const ua = new Vec2((pb.x - pa.x) / len, (pb.y - pa.y) / len);
      const ub = new Vec2(-ua.x, -ua.y);
      segs.push({ A, B, ua, ub, stretch, ima: 1 / A.body.getMass(), imb: 1 / B.body.getMass(), total: 0 });
    }

    for (let it = 0; it < PHYS.ropeIters; it++) {
      for (const s of segs) {
        const va = s.A.body.getLinearVelocity();
        const vb = s.B.body.getLinearVelocity();
        // tốc độ dây dài ra (dương = hai người đang rời xa nhau)
        const grow = -Vec2.dot(va, s.ua) - Vec2.dot(vb, s.ub);
        const bias = (PHYS.ropeBias * Math.min(s.stretch, 0.5)) / PHYS.step;
        const old = s.total;
        s.total = Math.max(0, old + (grow + bias) / (s.ima + s.imb)); // dây chỉ kéo, không đẩy
        const d = s.total - old;
        s.A.body.setLinearVelocity(new Vec2(va.x + s.ua.x * d * s.ima, va.y + s.ua.y * d * s.ima));
        s.B.body.setLinearVelocity(new Vec2(vb.x + s.ub.x * d * s.imb, vb.y + s.ub.y * d * s.imb));
      }
    }

    // lưu lực căng theo phương đứng (y hướng xuống → kéo lên là -u.y) cho bước sau
    for (const s of segs) {
      const tension = s.total / PHYS.step;
      s.A.ropeX += tension * s.ua.x;
      s.B.ropeX += tension * s.ub.x;
      s.A.ropeLift += tension * -s.ua.y;
      s.B.ropeLift += tension * -s.ub.y;
    }
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
    return !this.level.solids.some((r) => outer > r.x && outer < r.x + r.w && below > r.y && below < r.y + r.h);
  }

  private checkRules(): void {
    const { level } = this;
    let dead = false;
    let inDoor = 0;

    for (const a of this.actors) {
      const p = a.body.getPosition();
      if (p.y - PLAYER_SIZE / 2 > level.h) dead = true; // tụt hẳn khỏi đáy map

      const box: Aabb = { x: p.x - 0.35, y: p.y - 0.35, w: 0.7, h: 0.7 };
      for (const s of level.spikes) {
        // mũi gai chỉ ở nửa dưới của ô
        if (overlap(box, { x: s.x + 0.1, y: s.y + 0.5, w: 0.8, h: 0.5 })) dead = true;
      }
      if (!this.hasKey && level.key && overlap(box, level.key)) this.hasKey = true;

      const d = level.door;
      if (d && p.x > d.x && p.x < d.x + d.w && p.y > d.y && p.y < d.y + d.h) inDoor++;
    }

    if (dead) {
      this.restart();
      return;
    }
    if (this.hasKey && this.actors.length > 0 && inDoor === this.actors.length) this.won = true;
  }
}
