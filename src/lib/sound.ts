// src/lib/sound.ts
// Âm thanh trò chơi. File nằm ở public/sound/*.mp3; phát chồng được (clone) nên nhảy liên tục không bị cắt tiếng.
export type SoundName = "jump" | "restart";

const BASE = import.meta.env.BASE_URL;

const SRC: Record<SoundName, string> = {
  jump: `${BASE}sound/jump.mp3`,
  restart: `${BASE}sound/restart.mp3`,
};

const VOLUME: Record<SoundName, number> = {
  jump: 0.5,
  restart: 0.8,
};

const cache = new Map<SoundName, HTMLAudioElement>();

function base(name: SoundName): HTMLAudioElement {
  let a = cache.get(name);
  if (!a) {
    a = new Audio(SRC[name]);
    a.preload = "auto";
    cache.set(name, a);
  }
  return a;
}

/** Nạp sẵn để lần phát đầu tiên không bị trễ. */
export function preloadSounds(): void {
  for (const n of Object.keys(SRC) as SoundName[]) base(n);
}

/** Trình duyệt chặn phát tiếng trước khi người dùng chạm/bấm phím lần đầu → bỏ qua lỗi, không làm gì thêm. */
export function playSound(name: SoundName): void {
  try {
    const a = base(name).cloneNode() as HTMLAudioElement;
    a.volume = VOLUME[name];
    void a.play().catch(() => undefined);
  } catch {
    /* môi trường không có Audio */
  }
}
