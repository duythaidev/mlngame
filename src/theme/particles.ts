// src/theme/particles.ts
// Hệ hạt nhỏ dùng chung (spec B12): bụi, giấy, chim giấy, hạt vàng, pháo hoa — tối đa 200 hạt, không cần ảnh.
// Rung màn hình 2 px / 120 ms.

export type ParticleKind = "dust" | "paper" | "bird" | "gold" | "firework";

interface P {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // giây còn lại
  max: number;
  color: string;
}

const FIRE = ["#FFD600", "#FF7043", "#E53935", "#FFF59D"];

export class Particles {
  private list: P[] = [];
  private readonly cap: number;

  constructor(cap = 200) {
    this.cap = cap;
  }

  get count(): number {
    return this.list.length;
  }

  clear(): void {
    this.list = [];
  }

  /** Thêm n hạt quanh (x, y) px thế giới; vượt trần thì bỏ hạt cũ nhất. */
  emit(kind: ParticleKind, x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = kind === "firework" ? 60 + Math.random() * 90 : 20 + Math.random() * 40;
      const life = kind === "bird" ? 2.2 : kind === "firework" ? 1.2 : 0.9;
      this.list.push({
        kind,
        x,
        y,
        vx: kind === "bird" ? 30 + Math.random() * 40 : Math.cos(a) * sp,
        vy: kind === "bird" || kind === "gold" ? -40 - Math.random() * 50 : Math.sin(a) * sp - (kind === "dust" ? 10 : 0),
        life,
        max: life,
        color: kind === "firework" ? FIRE[i % FIRE.length] : kind === "gold" ? "#FFC107" : kind === "dust" ? "#8D6E63" : "#FFFFFF",
      });
    }
    if (this.list.length > this.cap) this.list.splice(0, this.list.length - this.cap);
  }

  step(dt: number): void {
    for (const p of this.list) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "dust" || p.kind === "paper" || p.kind === "firework") p.vy += 60 * dt; // rơi
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      if (p.kind === "bird") {
        ctx.strokeStyle = "#5D4037";
        ctx.lineWidth = 1;
        ctx.beginPath(); // chim giấy: chữ V vỗ cánh
        const f = Math.sin(p.life * 20) * 3;
        ctx.moveTo(p.x - 6, p.y - f);
        ctx.lineTo(p.x, p.y + 2);
        ctx.lineTo(p.x + 6, p.y - f);
        ctx.stroke();
      } else if (p.kind === "paper") ctx.fillRect(p.x - 3, p.y - 4, 6, 8);
      else ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  }
}

export class Shake {
  private until = 0;
  private px = 0;

  kick(now: number, px = 2, ms = 120): void {
    this.until = now + ms;
    this.px = px;
  }

  /** Độ lệch [x, y] px tại thời điểm now (ms). */
  offset(now: number): [number, number] {
    if (now >= this.until) return [0, 0];
    return [Math.round((Math.random() * 2 - 1) * this.px), Math.round((Math.random() * 2 - 1) * this.px)];
  }
}
