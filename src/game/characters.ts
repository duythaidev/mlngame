// src/game/characters.ts
// 5 nhân vật chibi pixel (Chiến sĩ · Thanh niên · Công nhân · Sinh viên · Nông dân), vẽ bằng code từ lưới ký tự.
// Sprite vẽ hướng PHẢI; quay trái = lật gương. Tư thế: đứng yên / đi (2 khung, chân tay đưa theo hướng đi).
//
// Ký tự trong lưới: . trong suốt · K viền · S da · E mắt · H mũ · h vành/bóng mũ · Y huy hiệu trên mũ
//                   X tóc · G gọng kính · T áo · t áo tối · A điểm nhấn (cổ áo / quai / cà vạt) · P quần · F giày

export type RoleId = "soldier" | "volunteer" | "builder" | "scholar" | "farmer";
export type Pose = "idle" | "walk";

export interface Role {
  id: RoleId;
  name: string;
}

export const ROLES: Role[] = [
  { id: "soldier", name: "Chiến sĩ" },
  { id: "volunteer", name: "Thanh niên" },
  { id: "builder", name: "Công nhân" },
  { id: "scholar", name: "Sinh viên" },
  { id: "farmer", name: "Nông dân" },
];

export const SPRITE_W = 14;

type HeadKind = "helmet" | "hardhat" | "hair" | "nonla";

const HEADS: Record<HeadKind, string[]> = {
  helmet: [
    "....KKKKKK....",
    "..KKHHHHHHKK..",
    ".KHHHHHYYHHHK.",
    "KhhhhhhhhhhhhK",
    ".KSSSSSSSSSSK.",
    ".KSSSSSSESSEK.",
    "..KKSSSSSSKK..",
  ],
  hardhat: [
    "....KKKKKK....",
    "..KKHHHHHHKK..",
    ".KHHHhHHhHHHK.",
    "KhhhhhhhhhhhhK",
    ".KXSSSSSSSSXK.",
    ".KSSSSSSESSEK.",
    "..KKSSSSSSKK..",
  ],
  hair: [
    "....KKKKKK....",
    "..KKXXXXXXKK..",
    ".KXXXXXXXXXXK.",
    ".KXXSSSSSSXXK.",
    ".KXSSSSSSSSXK.",
    ".KSSSSSSESSEK.",
    "..KKSSSSSSKK..",
  ],
  nonla: [
    ".....KKKK.....",
    "...KHHHHHhK...",
    ".KHHHHHHHHhhK.",
    "KhhhhhhhhhhhhK",
    ".KSSSSSSSSSSK.",
    ".KSSSSSSESSEK.",
    "..KKSSSSSSKK..",
  ],
};

/** Thân + chân theo tư thế. walk[0] = sải chân (tay trước vươn ra), walk[1] = chân khép, người nhún lên 1 px. */
const BODY = {
  idle: [
    "..KTTTAATTTK..",
    ".KSKTTTTTTKSK.",
    "..KKttttttKK..",
    "...KPPPPPPK...",
    "...KPPKKPPK...",
    "..KFFK..KFFK..",
  ],
  walk0: [
    "..KTTTAATTTK..",
    "..KTTTTTTTTKSK",
    "..KKttttttKK..",
    "...KPPPPPPK...",
    "..KPPK..KPPK..",
    ".KFFK....KFFK.",
  ],
  walk1: [
    "..KTTTAATTTK..",
    ".KSKTTTTTTTK..",
    "..KKttttttKK..",
    "...KPPPPPPK...",
    "....KPPPPK....",
    "...KFFFFFFK...",
  ],
};

export const SPRITE_H = HEADS.helmet.length + BODY.idle.length;

const BASE: Record<string, string> = {
  K: "#231811",
  S: "#F2C9A0",
  E: "#231811",
  X: "#3E2723",
  G: "#D32F2F",
};

const LOOK: Record<RoleId, { head: HeadKind; colors: Record<string, string> }> = {
  soldier: {
    head: "helmet",
    colors: { H: "#5E8F3E", h: "#46702E", Y: "#FFD600", T: "#6B9A4A", t: "#557D3A", A: "#D32F2F", P: "#557D3A", F: "#4E342E" },
  },
  volunteer: {
    head: "helmet",
    colors: { H: "#4E7A3A", h: "#3B5E2C", Y: "#4E7A3A", T: "#2F6DB5", t: "#24589A", A: "#FFD600", P: "#37474F", F: "#222222" },
  },
  builder: {
    head: "hardhat",
    colors: { H: "#F4C430", h: "#D9A21B", Y: "#F4C430", T: "#2E5FA8", t: "#244C88", A: "#FFD600", P: "#2E5FA8", F: "#4E342E" },
  },
  scholar: {
    head: "hair",
    colors: { X: "#222222", T: "#FFFFFF", t: "#DADADA", A: "#D32F2F", P: "#37474F", F: "#222222" },
  },
  farmer: {
    head: "nonla",
    colors: { H: "#F5E6C8", h: "#D7BA84", T: "#6D4C41", t: "#54382F", A: "#EFEBE9", P: "#37474F", F: "#4E342E" },
  },
};

/** Lưới đầy đủ của một vai ở một khung. */
export function spriteRows(role: RoleId, pose: Pose, frame: number): string[] {
  const body = pose === "idle" ? BODY.idle : frame % 2 === 0 ? BODY.walk0 : BODY.walk1;
  return [...HEADS[LOOK[role].head], ...body];
}

export function colorOf(role: RoleId, ch: string): string | null {
  if (ch === ".") return null;
  return LOOK[role].colors[ch] ?? BASE[ch] ?? null;
}

/** Vai theo giá trị `avatar` đã lưu: id vai, hoặc đường dẫn ảnh cũ có chứa id; không rõ → theo số thứ tự chỗ ngồi. */
export function roleOf(avatar: string | null | undefined, slot = "s0"): RoleId {
  if (avatar) {
    const hit = ROLES.find((r) => avatar === r.id || avatar.includes(`avatar-${r.id}`));
    if (hit) return hit.id;
  }
  const i = Number(slot.slice(1));
  return ROLES[(Number.isFinite(i) ? i : 0) % ROLES.length].id;
}

const cache = new Map<string, HTMLCanvasElement>();

/** Sprite 1 px/ô đã tô sẵn (cache), hướng phải. */
function spriteCanvas(role: RoleId, pose: Pose, frame: number): HTMLCanvasElement {
  const key = `${role}|${pose}|${frame % 2}`;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = SPRITE_W;
  c.height = SPRITE_H;
  const g = c.getContext("2d")!;
  spriteRows(role, pose, frame).forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = colorOf(role, row[x]);
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  });
  cache.set(key, c);
  return c;
}

/**
 * Vẽ nhân vật: (cx, feet) = tâm ngang và mặt đất dưới chân (px); scale = px mỗi ô pixel.
 * face = 1 nhìn phải, -1 nhìn trái (lật gương).
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  role: RoleId,
  pose: Pose,
  frame: number,
  face: 1 | -1,
  cx: number,
  feet: number,
  scale = 2,
): void {
  const w = SPRITE_W * scale;
  const h = SPRITE_H * scale;
  const bob = pose === "walk" && frame % 2 === 1 ? -scale : 0; // chân khép → người nhún lên
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(cx), Math.round(feet + bob));
  ctx.scale(face, 1);
  ctx.drawImage(spriteCanvas(role, pose, frame), -w / 2, -h, w, h);
  ctx.restore();
}

export interface Motion {
  pose: Pose;
  frame: number;
  face: 1 | -1;
}

/** Suy tư thế từ vị trí qua các khung (snapshot chỉ có vị trí): đi khi x đổi, khung chân theo quãng đường đã đi. */
export class MotionTracker {
  private state = new Map<string, { x: number; dist: number; face: 1 | -1; still: number }>();

  /** x theo ô; dt theo giây. */
  update(slot: string, x: number, dt: number): Motion {
    const s = this.state.get(slot) ?? { x, dist: 0, face: 1 as 1 | -1, still: 1 }; // mới xuất hiện = đứng yên
    const dx = x - s.x;
    s.x = x;
    if (Math.abs(dx) > 2) s.still = 1; // hồi sinh / dịch chuyển: không tính là đi
    else if (Math.abs(dx) > 0.004) {
      s.face = dx > 0 ? 1 : -1;
      s.dist += Math.abs(dx);
      s.still = 0;
    } else s.still += dt;
    this.state.set(slot, s);
    const moving = s.still < 0.08; // dừng ngắn giữa 2 khung mạng vẫn coi là đang đi
    return { pose: moving ? "walk" : "idle", frame: Math.floor(s.dist / 0.28) % 2, face: s.face };
  }

  reset(): void {
    this.state.clear();
  }
}
