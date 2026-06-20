import type { Card, CardPair } from "./constants";

export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildDeck(pairs: CardPair[], seed: number): Card[] {
  const rng = mulberry32(seed);
  const cards: Card[] = pairs.flatMap((p, i) => [
    { id: `img-${i}`, pairId: i, type: "image" as const, content: p.image },
    {
      id: `txt-${i}`,
      pairId: i,
      type: "text" as const,
      content: p.description,
    },
  ]);
  return shuffle(cards, rng);
}
