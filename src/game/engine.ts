// src/game/engine.ts
import * as planck from "planck";
import { PHYS, PLAYER_SIZE } from "../lib/constants";
import type { Level, ObjDef, Rect } from "./level";
import { crowdNeed, encodeObjView, isActive, moverPadCount, sigNeed, sourceSig, type ObjView } from "./objects";
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

/** Trạng thái chạy của một vật thể trong level. */
interface Obj {
  def: ObjDef;
  active: boolean; // vật perPlayer thứ k chỉ tồn tại khi k < số người
  body: planck.Body | null; // gate/bridge/ice/conveyor/crumble: tĩnh · lift/mover/box: kinematic · seesaw: động
  pressed: boolean; // pad: đang bị đè · mover có nút: mọi nút trên sàn đang bị đè
  latched: boolean; // pad: đã nhớ · box: đã vào đích · lift: đã lên đỉnh · carry: đã nộp
  home: { x: number; y: number }; // tâm ban đầu của thân (hazard: góc trên-trái ban đầu)
  wp: number; // mover / hazard: điểm đến hiện tại trong path
  wait: number; // mover: giây còn dừng ở trạm / đếm khởi động · hazard: giây còn dừng ở đầu mút
  started: boolean; // mover: đã chạy
  dir: 1 | -1; // hazard: đang đi xuôi (+1) hay ngược (−1) lộ trình
  pos: { x: number; y: number }; // hazard: góc trên-trái hiện tại
  phase: 0 | 1 | 2; // crumble: 0 đứng được · 1 đang rung · 2 đã sụp
  timer: number; // crumble: giây trong pha hiện tại · box: giây đã rơi quá sâu
  vx: number; // box: vận tốc ngang (đà trên băng)
  vy: number; // box: vận tốc rơi
  carriedBy: string | null; // carry: ô của người đang mang
}

/** Thứ được giữ lại khi hồi sinh ở cột mốc. */
interface Saved {
  sigs: string[];
  objs: number[]; // nút đã nhớ, khối đã vào đích, vật đã nộp
  carried: [number, string][]; // vật đang mang khi qua cột mốc → vẫn trên đầu người đó
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

const EMPTY_SAVED: Saved = { sigs: [], objs: [], carried: [] };

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
  private objs: Obj[] = [];
  private objByBody = new Map<planck.Body, Obj>();
  private inputs = new Map<string, InputState>();
  private inputSeqs = new Map<string, number>();
  private acc = 0;
  private resetCount = 0;

  private sigOn = new Map<string, boolean>();
  private sigHeld = new Map<string, number>();
  private sigLatched = new Set<string>();
  private cp = 0; // cột mốc hồi sinh hiện tại (level.checkpoints)
  private saved: Saved = EMPTY_SAVED;

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

  /** Cột mốc hồi sinh đã tới (0 = điểm xuất phát). */
  get checkpoint(): number {
    return this.cp;
  }

  isSignalOn(sig: string): boolean {
    return this.sigOn.get(sig) ?? false;
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

  /** Chơi lại level từ đầu (bấm R sau khi thắng, hoặc sang level mới): xóa cột mốc. */
  restart(): void {
    this.cp = 0;
    this.saved = EMPTY_SAVED;
    this.respawnAtCheckpoint();
  }

  /** Sau "Thua": cả nhóm về cột mốc gần nhất, giữ lại những gì đã đạt trước cột mốc đó. */
  respawnAtCheckpoint(): void {
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
    const snap: Snapshot = {
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
    if (this.level.objects.length > 0 || this.level.checkpoints.length > 1) snap.o = encodeObjView(this.objView());
    return snap;
  }

  // ---------------------------------------------------------------- nội bộ

  private get n(): number {
    return this.slots.length;
  }

  private objView(): ObjView {
    let bits = "";
    let carry = "";
    const bodies: [number, number][] = [];
    const angles: number[] = [];
    const crumbles: number[] = [];
    for (const o of this.objs) {
      const t = o.def.spec.t;
      if (this.level.bitOf[o.def.id] >= 0) {
        const on = t === "pad" ? o.pressed || o.latched : t === "crumble" ? o.phase === 2 : o.latched;
        bits += on ? "1" : "0";
      }
      if (this.level.bodyOf[o.def.id] >= 0) {
        if (t === "hazard") bodies.push([o.pos.x, o.pos.y]);
        else {
          const r = this.bodyRect(o);
          bodies.push([r.x, r.y]);
        }
      }
      if (this.level.angleOf[o.def.id] >= 0) angles.push(o.body ? o.body.getAngle() : 0);
      if (this.level.carryOf[o.def.id] >= 0) {
        carry += o.latched ? "d" : o.carriedBy ? String(this.slots.indexOf(o.carriedBy)) : ".";
      }
      if (this.level.crumbleOf[o.def.id] >= 0) {
        let rem = -1;
        if (o.phase === 0) {
          rem = o.timer > 0 ? PHYS.crumbleStand - o.timer + PHYS.crumbleShake : -1;
        } else if (o.phase === 1) {
          rem = Math.max(0, PHYS.crumbleShake - o.timer);
        } else {
          rem = -1;
        }
        crumbles.push(rem < 0 ? -1 : rem);
      }
    }
    for (const s of this.level.sigNames) bits += this.sigOn.get(s) ? "1" : "0";
    return { cp: this.cp, bits, bodies, carry, angles, crumbles };
  }

  private build(): void {
    const world = new World({ gravity: new Vec2(0, PHYS.gravity) });

    const ground = world.createBody({ type: "static" });
    for (const r of this.level.solids) {
      ground.createFixture({
        shape: new Box(r.w / 2, r.h / 2, new Vec2(r.x + r.w / 2, r.y + r.h / 2), 0),
        friction: 0.2,
      });
    }

    // vật thể: mỗi vùng là một thân riêng (để bật/tắt, di chuyển, nhận biết loại nền dưới chân)
    this.objByBody = new Map();
    const keep = new Set(this.saved.objs);
    const carried = new Map(this.saved.carried);
    this.objs = this.level.objects.map((def) => {
      const { rect, spec } = def;
      const home = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
      let body: planck.Body | null = null;
      const t = spec.t;
      if (t === "gate" || t === "bridge" || t === "ice" || t === "conveyor" || t === "crumble") {
        body = world.createBody({ type: "static", position: new Vec2(home.x, home.y) });
        body.createFixture({ shape: new Box(rect.w / 2, rect.h / 2), friction: 0.2 });
      } else if (t === "lift" || t === "mover" || t === "box") {
        body = world.createBody({ type: "kinematic", position: new Vec2(home.x, home.y), fixedRotation: true, allowSleep: false });
        body.createFixture({ shape: new Box(rect.w / 2, rect.h / 2), friction: 0.2 });
      } else if (t === "seesaw") {
        // tấm dày 0,4 ô, mặt trên trùng mép trên hàng; trục ở tâm tấm
        const cy = rect.y + PHYS.seesawThick / 2;
        body = world.createBody({ type: "dynamic", position: new Vec2(home.x, cy), allowSleep: false, angularDamping: PHYS.seesawDamping });
        body.createFixture({ shape: new Box(rect.w / 2, PHYS.seesawThick / 2), density: PHYS.seesawDensity, friction: 0 });
        world.createJoint(
          new planck.RevoluteJoint(
            { enableLimit: true, lowerAngle: -PHYS.seesawLimit, upperAngle: PHYS.seesawLimit },
            ground,
            body,
            new Vec2(home.x, cy),
          ),
        );
      }
      const o: Obj = {
        def,
        active: isActive(def, this.n),
        body,
        pressed: false,
        latched: keep.has(def.id),
        home,
        wp: 1,
        wait: 0,
        started: false,
        dir: 1,
        pos: { x: rect.x, y: rect.y },
        phase: 0,
        timer: 0,
        vx: 0,
        vy: 0,
        carriedBy: carried.get(def.id) ?? null,
      };
      if (body) this.objByBody.set(body, o);
      if (t === "bridge" && body) body.setActive(false);
      if (t === "box" && o.latched && body) body.setActive(false); // đã vào đích trước cột mốc
      return o;
    });

    const at = this.level.checkpoints[this.cp] ?? { x: this.level.spawn.x - 0.5, y: this.level.spawn.y - 0.5 };
    const byBody = new Map<planck.Body, Actor>();
    this.actors = this.slots.map((slot, i) => {
      const isLocal = this.localSlotsSet.has(slot);
      const body = world.createBody({
        type: isLocal ? "dynamic" : "kinematic",
        position: new Vec2(at.x + 0.5 + i, at.y + 0.5),
        fixedRotation: true,
        allowSleep: false,
      });
      const half = PLAYER_SIZE / 2;
      // thân vuông; 2 góc ĐÁY vát 0.03 ô (≈1 px) để không mắc ở mép nối nền ↔ thang/sàn chở cùng độ cao
      const c = 0.03;
      const shape = new planck.Polygon([
        new Vec2(-half, -half),
        new Vec2(half, -half),
        new Vec2(half, half - c),
        new Vec2(half - c, half),
        new Vec2(-half + c, half),
        new Vec2(-half, half - c),
      ]);
      body.createFixture({ shape, density: 1, friction: 0 });
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
    this.sigOn = new Map();
    this.sigHeld = new Map();
    this.sigLatched = new Set(this.saved.sigs);
    this.computeSignals(0);
    this.applyGates();
  }

  private fixedStep(): void {
    if (this.lose) {
      this.lose.t += PHYS.step;
      this.tick++;
      if (!this.onDiedCallback && this.lose.t >= PHYS.loseDelay) {
        this.respawnAtCheckpoint(); // server / Sandbox tự hồi sinh sau loseDelay
      }
      return;
    }
    this.applyRope(); // dây trước: lực chân (phanh) bù ngay vận tốc dây vừa truyền, không bị trôi dần
    this.moveObjects();
    this.drive();
    this.world.step(PHYS.step, 8, 3);
    this.tick++;
    this.sense();
    this.computeSignals(PHYS.step);
    this.applyGates();
    this.checkRules();
  }

  /**
   * Chân chạy = LỰC ngang theo khung thế giới (không chở người đứng trên đầu),
   * trên đất giới hạn theo lực ép; trên không chỉ là lực nhỏ (lái khi tự nhảy, đu khi bị treo).
   * Đứng trên thang/sàn chở/khối/băng chuyền: vận tốc "đứng yên" là vận tốc của nền đó (được chở theo).
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

      const slow = this.inSlowZone(a);
      const base = grounded ? this.supportVx(a) : 0;
      let target = base + (inp.r - inp.l) * PHYS.speed * (slow ? PHYS.slowSpeed : 1);
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
      // đứng yên: phanh TỈ LỆ vận tốc (so với nền đang đứng) → đang trượt thì dừng gần như ngay (không lướt),
      //           nhưng bị dây kéo liên tục (người treo dưới hố) thì vẫn bị lôi đi từ từ.
      const want = pressing || !grounded ? (m * (target - v.x)) / PHYS.step : -m * (v.x - base) * PHYS.idleBrake;
      let maxF: number;
      if (grounded) {
        // lực ép = trọng lượng (+ người đứng trên đầu) − lực dây kéo lên
        const normal = Math.max(0, m * PHYS.gravity * (1 + a.load) - a.ropeLift);
        maxF = this.slippingOffEdge(a) ? 0 : this.surfaceGrip(a) * normal;
      } else if (!pressing) {
        maxF = 0; // không bấm gì: trên không không có lực cản ngang, giữ quán tính
      } else {
        maxF = (a.jumped ? PHYS.airControl : PHYS.swingControl) * m * PHYS.gravity;
      }
      if (maxF > 0) body.applyForceToCenter(new Vec2(clamp(want, -maxF, maxF), 0), true);

      if (!grounded) this.stepOverLedge(a);

      // nhảy: phải đứng trên mặt phẳng và KHÔNG có ai đè trên đầu
      if (inp.j === 1 && a.prevJ === 0 && grounded && a.load === 0) {
        body.setLinearVelocity(new Vec2(v.x, -PHYS.jump * (slow ? PHYS.slowJump : 1)));
        a.jumped = true;
        this.jumps[a.slot] = (this.jumps[a.slot] ?? 0) + 1;
      }
      a.prevJ = inp.j;
    }
  }

  /** Vận tốc ngang trung bình của nền đang đỡ: thang/sàn chở/khối (kinematic) hoặc băng chuyền. */
  private supportVx(a: Actor): number {
    let sum = 0;
    let cnt = 0;
    for (const b of a.supports.keys()) {
      const o = this.objByBody.get(b);
      if (!o) continue;
      if (o.def.spec.t === "conveyor") sum += o.def.spec.speed;
      else if (b.getType() === "kinematic") sum += b.getLinearVelocity().x;
      else continue;
      cnt++;
    }
    return cnt ? sum / cnt : 0;
  }

  /** Lực bám của nền dưới chân: băng → iceGrip; bập bênh nghiêng → giảm dần tới 0; còn lại → grip. */
  private surfaceGrip(a: Actor): number {
    let grip: number = PHYS.grip;
    for (const b of a.supports.keys()) {
      const o = this.objByBody.get(b);
      if (!o) continue;
      if (o.def.spec.t === "ice") grip = Math.min(grip, PHYS.iceGrip);
      if (o.def.spec.t === "seesaw") {
        const tilt = Math.abs(b.getAngle());
        if (tilt > PHYS.seesawSlide) grip = 0; // dốc quá: trượt hẳn
        else if (tilt > PHYS.seesawSlip) grip = Math.min(grip, PHYS.iceGrip); // hơi lệch: trơn như băng
      }
    }
    return grip;
  }

  private inSlowZone(a: Actor): boolean {
    const p = a.body.getPosition();
    return this.objs.some((o) => {
      if (o.def.spec.t !== "slow" || (o.def.spec.sig && this.isSignalOn(o.def.spec.sig))) return false;
      const r = o.def.rect;
      return p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
    });
  }

  /** Người đang đứng (trực tiếp — tâm nằm hẳn trên mặt — hoặc chồng lên người khác) trên thân này. */
  private riders(body: planck.Body, w: number): number {
    const on = new Set<Actor>();
    const bx = body.getPosition().x;
    const actorOf = new Map(this.actors.map((a) => [a.body, a] as const));
    let grew = true;
    while (grew) {
      grew = false;
      for (const a of this.actors) {
        if (on.has(a)) continue;
        for (const s of a.supports.keys()) {
          const under = actorOf.get(s);
          const direct = s === body && Math.abs(a.body.getPosition().x - bx) < w / 2 - 0.2;
          if (direct || (under && on.has(under))) {
            on.add(a);
            grew = true;
            break;
          }
        }
      }
    }
    return on.size;
  }

  /** Tấm nút gắn trên sàn chở (theo vị trí hiện tại của sàn). */
  private moverPlates(o: Obj): Rect[] {
    const r = this.bodyRect(o);
    return Array.from({ length: moverPadCount(this.n) }, (_, k) => ({ x: r.x + k + 0.05, y: r.y - 0.4, w: 0.9, h: 0.4 }));
  }

  private actorBox(a: Actor, half: number): Aabb {
    const p = a.body.getPosition();
    return { x: p.x - half, y: p.y - half, w: half * 2, h: half * 2 };
  }

  /** Đặt vận tốc cho thang, sàn chở, khối số; cập nhật khối đỏ, sàn sụp — trước bước vật lý. */
  private moveObjects(): void {
    for (const o of this.objs) {
      const spec = o.def.spec;
      if (spec.t === "hazard") {
        this.moveHazard(o);
        continue;
      }
      const b = o.body;
      if (!b || !b.isActive()) {
        if (spec.t === "crumble") this.tickCrumble(o);
        continue;
      }
      const p = b.getPosition();
      if (spec.t === "lift") {
        const topY = o.home.y - spec.rise;
        // đủ người (hoặc thang thường đã lên đỉnh) → đi lên; thiếu người → hạ về chỗ cũ
        const up = (!spec.drop && o.latched) || this.riders(b, o.def.rect.w) >= crowdNeed(spec.need, this.n);
        const ty = up ? topY : o.home.y;
        if (Math.abs(ty - p.y) < 1e-4) {
          b.setLinearVelocity(new Vec2(0, 0));
          if (ty === topY && !spec.drop) o.latched = true; // thang thường: lên đỉnh thì ở lại
        } else {
          b.setLinearVelocity(new Vec2(0, clamp((ty - p.y) / PHYS.step, -PHYS.liftSpeed, PHYS.liftSpeed)));
        }
      } else if (spec.t === "mover") {
        this.moveMover(o, b, p);
      } else if (spec.t === "box") {
        this.moveBox(o, b);
      } else if (spec.t === "crumble") {
        this.tickCrumble(o);
      } else if (spec.t === "seesaw") {
        // lò xo ở trục kéo tấm về thăng bằng: 1 người chỉ làm nghiêng nhẹ, 2 người dồn một bên mới nghiêng hẳn
        b.applyTorque(-PHYS.seesawSpring * b.getAngle() - PHYS.seesawSpringDamp * b.getAngularVelocity(), true);
      }
    }
  }

  private moveMover(o: Obj, b: planck.Body, p: planck.Vec2): void {
    const spec = o.def.spec as Extract<ObjDef["spec"], { t: "mover" }>;
    if (spec.pads) {
      // sàn có nút: chỉ chạy khi MỌI nút trên sàn đang bị đè
      const plates = this.moverPlates(o);
      o.pressed = plates.every((pl) => this.actors.some((a) => overlap(this.actorBox(a, 0.4), pl)));
      if (!o.pressed) {
        b.setLinearVelocity(new Vec2(0, 0));
        return;
      }
      o.started = true;
    } else if (!o.started) {
      // đủ người đứng hẳn trên sàn liên tục PHYS.moverStartDelay giây thì mới chạy (không bỏ rơi người đang bước lên)
      o.wait = this.riders(b, o.def.rect.w) >= crowdNeed(spec.need, this.n) ? o.wait + PHYS.step : 0;
      if (o.wait >= PHYS.moverStartDelay) {
        o.started = true;
        o.wait = 0;
      }
    }
    if (!o.started || o.wp >= spec.path.length) {
      b.setLinearVelocity(new Vec2(0, 0));
      return;
    }
    if (o.wait > 0) {
      o.wait -= PHYS.step;
      b.setLinearVelocity(new Vec2(0, 0));
      return;
    }
    const [dx, dy] = spec.path[o.wp];
    const tx = o.home.x + dx - spec.path[0][0];
    const ty = o.home.y + dy - spec.path[0][1];
    const ex = tx - p.x;
    const ey = ty - p.y;
    const dist = Math.hypot(ex, ey);
    if (dist < 1e-4) {
      if (spec.stops?.includes(o.wp)) o.wait = PHYS.stopWait;
      o.wp++;
      b.setLinearVelocity(new Vec2(0, 0));
    } else {
      const k = Math.min(PHYS.moverSpeed / dist, 1 / PHYS.step);
      b.setLinearVelocity(new Vec2(ex * k, ey * k));
    }
  }

  /** Khối đỏ: đi qua lại theo lộ trình (xuôi rồi ngược), dừng một chút ở hai đầu mút. */
  private moveHazard(o: Obj): void {
    const spec = o.def.spec as Extract<ObjDef["spec"], { t: "hazard" }>;
    if (spec.path.length < 2) return;
    if (o.wait > 0) {
      o.wait -= PHYS.step;
      return;
    }
    const [dx, dy] = spec.path[o.wp];
    const tx = o.def.rect.x + dx - spec.path[0][0];
    const ty = o.def.rect.y + dy - spec.path[0][1];
    const ex = tx - o.pos.x;
    const ey = ty - o.pos.y;
    const dist = Math.hypot(ex, ey);
    const stepLen = spec.speed * PHYS.step;
    if (dist <= stepLen) {
      o.pos = { x: tx, y: ty };
      const next = o.wp + o.dir;
      if (next < 0 || next >= spec.path.length) {
        o.dir = o.dir === 1 ? -1 : 1; // tới đầu mút: quay đầu
        o.wait = spec.pause ?? 0.5;
      }
      o.wp += o.dir;
    } else {
      o.pos = { x: o.pos.x + (ex / dist) * stepLen, y: o.pos.y + (ey / dist) * stepLen };
    }
  }

  /** Các hình chữ nhật gây thua của khối đỏ ở vị trí hiện tại. */
  private hazardRects(o: Obj): Rect[] {
    const spec = o.def.spec as Extract<ObjDef["spec"], { t: "hazard" }>;
    const main = { x: o.pos.x, y: o.pos.y, w: o.def.rect.w, h: o.def.rect.h };
    if (!spec.extra) return [main];
    const [ex, ey, ew, eh] = spec.extra;
    return [main, { x: o.pos.x + ex, y: o.pos.y + ey, w: ew, h: eh }];
  }

  /** Sàn sụp: đứng liên tục crumbleStand giây → rung crumbleShake giây → biến mất crumbleBack giây → hiện lại. */
  private tickCrumble(o: Obj): void {
    const b = o.body!;
    if (o.phase === 0) {
      const stood = this.actors.some((a) => a.supports.has(b));
      o.timer = stood ? o.timer + PHYS.step : 0;
      if (o.timer >= PHYS.crumbleStand) {
        o.phase = 1;
        o.timer = 0;
      }
    } else if (o.phase === 1) {
      o.timer += PHYS.step;
      if (o.timer >= PHYS.crumbleShake) {
        o.phase = 2;
        o.timer = 0;
        b.setActive(false);
      }
    } else {
      o.timer += PHYS.step;
      const blocked = this.actors.some((a) => overlap(this.actorBox(a, 0.4), o.def.rect));
      if (o.timer >= PHYS.crumbleBack && !blocked) {
        o.phase = 0;
        o.timer = 0;
        b.setActive(true);
      }
    }
  }

  private bodyRect(o: Obj): Rect {
    const p = o.body ? o.body.getPosition() : o.home;
    return { x: p.x - o.def.rect.w / 2, y: p.y - o.def.rect.h / 2, w: o.def.rect.w, h: o.def.rect.h };
  }

  /** Hình chữ nhật đặc mà khối số không đi xuyên qua được (nền + vật đặc đang bật, trừ chính nó). */
  private blockingRects(self: Obj): Rect[] {
    const out: Rect[] = [...this.level.solids];
    for (const o of this.objs) {
      if (o === self || !o.body || !o.body.isActive()) continue;
      const t = o.def.spec.t;
      if (t === "seesaw") continue;
      out.push(this.bodyRect(o));
    }
    return out;
  }

  /** Nền ngay dưới khối: null = không có gì đỡ; ngược lại trả về loại nền (để băng/băng chuyền tác động). */
  private boxSupport(self: Obj, r: Rect): { kind: "solid" | "ice" | "conveyor"; speed: number } | null {
    const probe = { x: r.x + 0.05, y: r.y + r.h, w: r.w - 0.1, h: 0.06 };
    let found: { kind: "solid" | "ice" | "conveyor"; speed: number } | null = null;
    for (const o of this.objs) {
      if (o === self || !o.body || !o.body.isActive() || !overlap(probe, this.bodyRect(o))) continue;
      const s = o.def.spec;
      if (s.t === "conveyor") return { kind: "conveyor", speed: s.speed };
      found = { kind: s.t === "ice" ? "ice" : "solid", speed: 0 };
    }
    if (found) return found;
    return this.level.solids.some((s) => overlap(probe, s)) ? { kind: "solid", speed: 0 } : null;
  }

  /**
   * Khối số: đủ người đẩy thì đi boxSpeed; trên băng giữ đà rồi chậm dần; trên băng chuyền bị cuốn;
   * không có gì đỡ thì rơi (rơi vào hố → thành nền mới); rơi sâu quá 2,5 ô → về chỗ cũ sau boxRespawn giây.
   */
  private moveBox(o: Obj, b: planck.Body): void {
    const spec = o.def.spec as Extract<ObjDef["spec"], { t: "box" }>;
    const r = this.bodyRect(o);
    if (r.y + r.h > o.def.rect.y + o.def.rect.h + 2.5) {
      o.timer += PHYS.step;
      if (o.timer >= PHYS.boxRespawn || r.y > this.level.h) {
        b.setPosition(new Vec2(o.home.x, o.home.y));
        b.setLinearVelocity(new Vec2(0, 0));
        o.vx = 0;
        o.vy = 0;
        o.timer = 0;
        return;
      }
    }
    const need = crowdNeed(spec.weight, this.n);
    const right = this.pushers(o, 1) >= need;
    const left = this.pushers(o, -1) >= need;
    const push = right && !left ? 1 : left && !right ? -1 : 0;
    const sup = this.boxSupport(o, r);

    // vận tốc ngang
    let vx: number;
    if (!sup) vx = 0; // đang rơi: rơi thẳng xuống
    else if (push !== 0) vx = push * PHYS.boxSpeed;
    else if (sup.kind === "ice") vx = Math.sign(o.vx) * Math.max(0, Math.abs(o.vx) - PHYS.boxGlide * PHYS.step);
    else vx = 0;
    const carry = sup?.kind === "conveyor" ? sup.speed : 0;

    // vận tốc rơi
    let vy = sup ? 0 : Math.min(o.vy + PHYS.boxGravity * PHYS.step, PHYS.boxMaxFall);

    const walls = this.blockingRects(o);
    const nx = { x: r.x + (vx + carry) * PHYS.step, y: r.y + 0.02, w: r.w, h: r.h - 0.04 };
    if (vx + carry !== 0 && walls.some((w) => overlap(nx, w))) vx = -carry; // đụng vách: đứng lại
    // thu hẹp 0,06 ô mỗi bên (rộng hơn đầu dò "có nền đỡ" 0,05) để khối đã hết chỗ đỡ thì chắc chắn rơi được
    const ny = { x: r.x + 0.06, y: r.y + vy * PHYS.step, w: r.w - 0.12, h: r.h };
    if (vy > 0) {
      const hit = walls.filter((w) => overlap(ny, w));
      if (hit.length) {
        const top = Math.min(...hit.map((w) => w.y));
        vy = (top - (r.y + r.h)) / PHYS.step; // đáp đúng mặt nền
      }
    }
    o.vx = vx;
    o.vy = sup ? 0 : vy;
    b.setLinearVelocity(new Vec2(vx + carry, vy));
  }

  /**
   * Số người cùng đẩy khối theo hướng dir: ai đang bấm hướng đó và tì sát thành khối,
   * hoặc tì sát lưng một người đang đẩy (nối đuôi, kể cả người đứng trên đầu người đẩy).
   */
  private pushers(o: Obj, dir: 1 | -1): number {
    const half = PLAYER_SIZE / 2;
    const r = this.bodyRect(o);
    // "mặt tì": cạnh x mà người đẩy phải chạm + khoảng y của mặt đó
    const faces = [{ edge: dir > 0 ? r.x : r.x + r.w, top: r.y, bottom: r.y + r.h }];
    const used = new Set<Actor>();
    for (let grew = true; grew; ) {
      grew = false;
      for (const a of this.actors) {
        if (used.has(a)) continue;
        const inp = this.inputs.get(a.slot) ?? EMPTY_INPUT;
        if ((dir > 0 ? inp.r : inp.l) !== 1 || inp.l === inp.r) continue;
        const p = a.body.getPosition();
        const lead = p.x + dir * half; // cạnh thân phía đang đẩy
        const touching = faces.some(
          (f) => Math.abs(lead - f.edge) <= 0.15 && (p.x - f.edge) * dir < 0 && p.y + half > f.top + 0.1 && p.y - half < f.bottom - 0.1,
        );
        if (!touching) continue;
        used.add(a);
        faces.push({ edge: p.x - dir * half, top: p.y - half, bottom: p.y + half });
        grew = true;
      }
    }
    return used.size;
  }

  /** Nút (người/khối đè), vật mang (nhặt/nộp), khối vào đích, qua cột mốc. */
  private sense(): void {
    const people = this.actors.map((a) => {
      const p = a.body.getPosition();
      return { slot: a.slot, x: p.x, box: { x: p.x - 0.4, y: p.y - 0.4, w: 0.8, h: 0.8 } };
    });
    const boxes = this.objs.filter((o) => o.def.spec.t === "box" && o.body?.isActive()).map((o) => this.bodyRect(o));
    const carrying = new Set(this.objs.filter((o) => o.carriedBy).map((o) => o.carriedBy));

    for (const o of this.objs) {
      if (!o.active) continue;
      const { spec, rect } = o.def;
      if (spec.t === "pad") {
        const plate = { x: rect.x + 0.05, y: rect.y + 0.6, w: 0.9, h: 0.4 };
        o.pressed = people.some((p) => overlap(p.box, plate)) || boxes.some((b) => overlap(b, plate));
        if (o.pressed && this.level.sigs[spec.sig]?.padLatch) o.latched = true;
      } else if (spec.t === "carry" && !o.latched) {
        if (!o.carriedBy) {
          // nhặt: người chạm vào và chưa mang gì (người ở ô nhỏ hơn được ưu tiên)
          const inner = { x: rect.x + 0.15, y: rect.y + 0.15, w: 0.7, h: 0.7 };
          const taker = people.find((p) => !carrying.has(p.slot) && overlap(p.box, inner));
          if (taker) {
            o.carriedBy = taker.slot;
            carrying.add(taker.slot);
          }
        } else {
          // nộp: người mang chạm nơi nhận cùng tín hiệu (không có nơi nhận → cửa level)
          const who = people.find((p) => p.slot === o.carriedBy);
          const targets = this.objs.filter((r) => r.def.spec.t === "receiver" && r.def.spec.sig === spec.to).map((r) => r.def.rect);
          if (!targets.length && this.level.door) targets.push(this.level.door);
          if (who && targets.some((t) => overlap(who.box, t))) {
            o.latched = true;
            o.carriedBy = null;
            carrying.delete(who.slot);
          }
        }
      } else if (spec.t === "box" && spec.sig && !o.latched && o.body) {
        const r = this.bodyRect(o);
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const hit = this.objs.some(
          (g) =>
            g.def.spec.t === "goal" &&
            g.def.spec.sig === spec.sig &&
            cx > g.def.rect.x &&
            cx < g.def.rect.x + g.def.rect.w &&
            Math.abs(cy - (g.def.rect.y + g.def.rect.h / 2)) < 1,
        );
        // khối phải DỪNG HẲN trong ô đích (trên băng: canh lúc thôi đẩy để khối trượt vừa vào)
        if (hit && Math.abs(o.body.getLinearVelocity().x) < 0.05) {
          o.latched = true;
          o.body.setActive(false); // khối đã vào đích: biến mất
        }
      }
    }

    const cps = this.level.checkpoints;
    for (let i = cps.length - 1; i > this.cp; i--) {
      if (people.some((p) => p.x >= cps[i].x + 0.5)) {
        this.cp = i;
        this.saved = {
          sigs: [...this.sigLatched],
          objs: this.objs.filter((o) => o.latched && o.def.spec.t !== "lift").map((o) => o.def.id),
          carried: this.objs.filter((o) => o.carriedBy).map((o) => [o.def.id, o.carriedBy!] as [number, string]),
        };
        break;
      }
    }
  }

  private computeSignals(dt: number): void {
    for (const sig of this.level.sigNames) {
      const spec = this.level.sigs[sig] ?? {};
      const sources = this.objs.filter((o) => o.active && sourceSig(o.def) === sig);
      const count = sources.filter((o) => (o.def.spec.t === "pad" ? o.pressed || o.latched : o.latched)).length;
      const need = sigNeed(this.level, sig, this.n);
      const raw = sources.length > 0 && count >= need;
      const held = raw ? (this.sigHeld.get(sig) ?? 0) + dt : 0;
      this.sigHeld.set(sig, held);
      const on = raw && held >= (spec.hold ?? 0) - 1e-9;
      if (on && spec.latch) this.sigLatched.add(sig);
      this.sigOn.set(sig, on || this.sigLatched.has(sig));
    }
    if (this.level.doorSig) this.hasKey = this.isSignalOn(this.level.doorSig);
  }

  /** Cổng (đặc → mở) và cầu (ẩn → hiện) theo tín hiệu. Không đóng/hiện đè lên người đang đứng trong đó. */
  private applyGates(): void {
    for (const o of this.objs) {
      const s = o.def.spec;
      if ((s.t !== "gate" && s.t !== "bridge") || !o.body) continue;
      const on = this.isSignalOn(s.sig) || (s.t === "bridge" && !!s.any?.some((g) => this.isSignalOn(g)));
      const solid = s.t === "gate" ? !on : on;
      if (solid === o.body.isActive()) continue;
      if (solid && this.actors.some((a) => overlap(this.actorBox(a, 0.4), o.def.rect))) continue;
      o.body.setActive(solid);
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
    const movingHazards = this.objs.filter((o) => o.def.spec.t === "hazard").flatMap((o) => this.hazardRects(o));

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
      for (const z of level.hazards) {
        if (overlap(box, z)) culprit ??= a.slot; // vùng chết (trần): chạm là thua
      }
      for (const z of movingHazards) {
        if (overlap(box, z)) culprit ??= a.slot; // khối đỏ di chuyển
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

    // Ở chế độ Sandbox / server (toàn bộ actor local, không có onDiedCallback): thắng khi cửa mở và tất cả vào cửa
    if (!this.onDiedCallback && this.hasKey && localCount > 0 && inDoor === localCount) {
      this.won = true;
    }
  }
}
