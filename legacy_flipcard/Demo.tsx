import { useState, useEffect, useCallback } from "react";
import "./App.css";

interface CardPair {
  image: string;
  description: string;
}

interface Card {
  id: string;
  pairId: number;
  type: "image" | "text";
  content: string;
}

const CARD_PAIRS: CardPair[] = [
  {
    image: "/cat.webp",
    description: "Mèo cam",
  },
  {
    image: "/corgi.jpg",
    description: "Chó Corgi",
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairs: CardPair[]): Card[] {
  const cards: Card[] = pairs.flatMap((p, i) => [
    { id: `img-${i}`, pairId: i, type: "image" as const, content: p.image },
    {
      id: `txt-${i}`,
      pairId: i,
      type: "text" as const,
      content: p.description,
    },
  ]);
  return shuffle(cards);
}

export default function Demo() {
  const [deck, setDeck] = useState<Card[]>(() => buildDeck(CARD_PAIRS));
  const [flipped, setFlipped] = useState<Card[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [won, setWon] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);

  useEffect(() => {
    console.log("=== DANH SÁCH CÁC CẶP THẺ (SAU KHI XÁO TRỘN) ===");

    // Group các thẻ lại theo pairId
    const groupedPairs = deck.reduce(
      (acc, card) => {
        if (!acc[card.pairId]) acc[card.pairId] = { image: -1, text: -1 };

        // Tìm vị trí thực tế của thẻ (index 1-based) trong mảng deck đang hiển thị
        const actualIndex = deck.findIndex((c) => c.id === card.id) + 1;

        if (card.type === "image") {
          acc[card.pairId].image = actualIndex;
        } else {
          acc[card.pairId].text = actualIndex;
        }
        return acc;
      },
      {} as Record<number, { image: number; text: number }>,
    );

    // In ra console theo format "Số card (Image) - Số card (Text)"
    Object.keys(groupedPairs).forEach((pairId) => {
      const pair = groupedPairs[parseInt(pairId)];
      console.log(`${pair.image} - ${pair.text}`);
    });
  }, [deck]);

  const reset = useCallback(() => {
    setDeck(buildDeck(CARD_PAIRS));
    setFlipped([]);
    setMatched([]);
    setLocked(false);
    setWon(false);
    setWrong([]);
  }, []);

  const handleFlip = (card: Card) => {
    if (locked) return;
    if (flipped.some((c) => c.id === card.id)) return;
    if (matched.includes(card.pairId)) return;

    const newFlipped = [...flipped, card];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setLocked(true);
      const [a, b] = newFlipped;
      const isMatch = a.pairId === b.pairId && a.type !== b.type;

      if (isMatch) {
        setTimeout(() => {
          setMatched((prev) => [...prev, a.pairId]);
          setFlipped([]);
          setLocked(false);
        }, 700);
      } else {
        setWrong([a.id, b.id]);
        setTimeout(() => {
          setWrong([]);
          setFlipped([]);
          setLocked(false);
        }, 2000);
      }
    }
  };

  useEffect(() => {
    if (matched.length === CARD_PAIRS.length) {
      setTimeout(() => setWon(true), 500);
    }
  }, [matched]);

  const isFaceUp = (card: Card) =>
    flipped.some((c) => c.id === card.id) || matched.includes(card.pairId);
  const isMatched = (card: Card) => matched.includes(card.pairId);
  const isWrong = (card: Card) => wrong.includes(card.id);

  useEffect(() => {
    console.log("=== THẺ SAU KHI RENDER VÀ XÁO TRỘN ===");
    const groupedPairs = deck.reduce(
      (acc, card) => {
        if (!acc[card.pairId]) acc[card.pairId] = [];
        acc[card.pairId].push(card);
        return acc;
      },
      {} as Record<number, Card[]>,
    );

    console.log(groupedPairs);
    console.log("Chi tiết mảng deck gốc:", deck);
  }, [deck]);

  return (
    <div className="root">
      <div className="header">
        <div className="title">
          Tiền tệ <span className="title-red">Demo</span>
        </div>
        <div className="rule">
          <div className="rule-line" />
          <div className="rule-star">✦</div>
          <div className="rule-line" />
        </div>
      </div>

      <div className="grid">
        {deck.map((card, index) => {
          const faceUp = isFaceUp(card);
          const matchedState = isMatched(card);
          const wrongState = isWrong(card);

          return (
            <div
              key={card.id}
              className={[
                "card-wrap",
                matchedState ? "is-matched" : "",
                wrongState ? "is-wrong" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleFlip(card)}
            >
              <div className={`card-inner${faceUp ? " face-up" : ""}`}>
                {/* BACK */}
                <div className="card-face card-back">
                  <span className="card-back-star">✦</span>
                  <span className="card-back-label">{index + 1}</span>
                </div>

                {/* FRONT */}
                {card.type === "image" ? (
                  <div className="card-face card-front type-image">
                    <img
                      className="card-img"
                      src={card.content}
                      alt=""
                      draggable={false}
                    />
                    <div className="card-img-overlay" />
                  </div>
                ) : (
                  <div className="card-face card-front type-text">
                    <span className="card-text-content">{card.content}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {won && (
        <div className="win-overlay">
          <div className="win-box">
            <span className="win-stamp">★</span>
            <div className="win-title">Xuất sắc!</div>
            <button className="btn" onClick={reset}>
              Chơi lại từ đầu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
