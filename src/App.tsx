import { useState, useEffect, useCallback } from "react";

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
    image: "/phapnhat.png",
    description: "Hai thế lực áp bức dân tộc năm 1945.",
  },
  {
    image: "/doi1945.png",
    description: "Nạn đói cướp đi hơn 2 triệu sinh mạng.",
  },
  {
    image: "/nole.png",
    description: "Thân phận dân tộc nô lệ thời thuộc địa.",
  },
  {
    image: "/kehoach.jpg",
    description: "Các chiến sĩ Việt Minh họp bàn kế hoạch.",
  },
  {
    image: "/nhathavuki.png",
    description: "Quân Nhật hạ vũ khí, buông súng trước quân Đồng minh.",
  },
  {
    image: "/thoico.jpg",
    description: "Thời cơ cách mạng đã chín muồi.",
  },
  {
    image: "/quangtruong.jpg",
    description: "Quảng trường Ba Đình",
  },
  {
    image: "/bacHodoctuyenngon.webp",
    description: "Bác Hồ đứng trên bục đọc bản Tuyên ngôn Độc lập.",
  },
  {
    image: "/chiacat.webp",
    description: "Đất nước bị chia cắt.",
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
    { id: `txt-${i}`, pairId: i, type: "text" as const, content: p.description },
  ]);
  return shuffle(cards);
}

export default function FlipCardGame() {
  const [deck, setDeck] = useState<Card[]>(() => buildDeck(CARD_PAIRS));
  const [flipped, setFlipped] = useState<Card[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [won, setWon] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);

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

  return (
    <div className="root">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .root {
          min-height: 100vh;
          background: #f5f0e8;
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 20px 60px;
          font-family: serif;
          color: #1a1208;
        }

        /* paper lines */
        .root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 31px,
            #c8b89622 31px,
            #c8b89622 32px
          );
          pointer-events: none;
          z-index: 0;
        }

        /* red margin line */
        .root::after {
          content: '';
          position: fixed;
          top: 0; bottom: 0;
          left: 72px;
          width: 1px;
          background: #e05050aa;
          pointer-events: none;
          z-index: 0;
        }

        /* === HEADER === */
        .header {
          position: relative;
          z-index: 1;
          text-align: center;
          margin-bottom: 6px;
        }

        .title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(1.8rem, 5vw, 3rem);
          font-weight: 900;
          line-height: 1;
          color: #1a1208;
          letter-spacing: -0.02em;
        }

        .title-red {
          color: #c0392b;
          font-style: italic;
        }

        .rule {
          width: 100%;
          max-width: 480px;
          margin: 12px auto 0;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #8b6a3a;
        }

        .rule-line { flex: 1; height: 1px; background: #c8b896; }
        .rule-star { font-size: 0.6rem; }

        .subtitle {
          font-size: 0.8rem;
          font-style: italic;
          color: #8b6a3a;
          text-align: center;
          margin-top: 8px;
          position: relative;
          z-index: 1;
        }

        /* === STATS === */
        .stats {
          display: flex;
          gap: 0;
          margin: 20px 0 28px;
          position: relative;
          z-index: 1;
          border: 1px solid #c8b896;
          background: #faf7f0;
          box-shadow: 2px 2px 0 #c8b896;
        }

        .stat {
          padding: 10px 28px;
          text-align: center;
          border-right: 1px solid #c8b896;
        }

        .stat:last-child { border-right: none; }

        .stat-label {
          font-size: 0.58rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #8b6a3a;
          font-style: italic;
        }

        .stat-value {
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: #1a1208;
          line-height: 1.1;
        }

        /* === GRID === */
        .grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 14px;
          width: 100%;
          max-width: 1280px;
          position: relative;
          z-index: 1;
        }

        @media (max-width: 560px) {
          .grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
        }

        /* === CARD === */
        .card-wrap {
          aspect-ratio: 3/4;
          perspective: 1100px;
          cursor: pointer;
        }

        .card-wrap.is-matched {
          pointer-events: none;
          animation: stamp-out 0.5s ease forwards;
          animation-delay: 0.15s;
        }

        @keyframes stamp-out {
          0%   { opacity: 1; transform: scale(1) rotate(0deg); }
          30%  { transform: scale(1.05) rotate(-1deg); filter: sepia(1) brightness(1.4); }
          100% { opacity: 0; transform: scale(0.6) rotate(3deg); filter: sepia(1) brightness(2); }
        }

        .card-inner {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 4px;
        }

        .card-inner.face-up {
          transform: rotateY(180deg);
        }

        .card-face {
          position: absolute;
          inset: 0;
          border-radius: 4px;
          backface-visibility: hidden;
          overflow: hidden;
        }

        /* === BACK FACE === */
        .card-back {
          background: #faf7f0;
          border: 1px solid #c8b896;
          box-shadow: 2px 2px 0 #c8b896;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 6px;
        }

        .card-back::before {
          content: '';
          position: absolute;
          inset: 5px;
          border: 1px solid #e0d5c0;
          border-radius: 2px;
          background-image:
            repeating-linear-gradient(
              45deg,
              transparent 0px, transparent 4px,
              #c8b89618 4px, #c8b89618 5px
            );
        }

        .card-back-star {
          font-size: 1.1rem;
          color: #c8b896;
          position: relative;
          z-index: 1;
        }

        .card-back-label {
          font-size: 0.5rem;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #c8b896;
          position: relative;
          z-index: 1;
          font-style: italic;
        }

        .card-wrap:hover:not(.is-matched) .card-back {
          border-color: #8b6a3a;
          box-shadow: 3px 3px 0 #8b6a3a;
          transform: translate(-1px, -1px);
        }

        /* === FRONT IMAGE CARD === */
        .card-front {
          transform: rotateY(180deg);
          border: 1px solid #c8b896;
          box-shadow: 2px 2px 0 #c8b896;
        }

        .card-front.type-image {
          background: #1a1208;
        }

        .card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          filter: sepia(0.3) contrast(1.05);
          transition: filter 0.3s;
        }

        .card-img-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 50%, #1a120888 100%);
        }

        /* === FRONT TEXT CARD === */
        .card-front.type-text {
          background: #fffef9;
          border-color: #8b6a3a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 10px;
          flex-direction: column;
          gap: 8px;
        }

        .card-front.type-text::before {
          content: '❝';
          font-family: 'Playfair Display', serif;
          font-size: 1.6rem;
          color: #c8b896;
          position: absolute;
          top: 4px;
          left: 8px;
          line-height: 1;
        }

        .card-text-content {
          font-size: clamp(0.6rem, 1.6vw, 1rem);
          line-height: 1.5;
          color: #2a1e10;
          text-align: center;
          font-style: italic;
          position: relative;
          z-index: 1;
        }

        /* wrong */
        .card-wrap.is-wrong .card-front {
          border-color: #c0392b !important;
          box-shadow: 2px 2px 0 #c0392b !important;
        }

        .card-wrap.is-wrong .card-inner {
          animation: wrong-jolt 0.3s ease 1.5s;
        }

        @keyframes wrong-jolt {
          0%, 100% { transform: rotateY(180deg) translateX(0); }
          30%       { transform: rotateY(180deg) translateX(-5px) rotate(-0.5deg); }
          70%       { transform: rotateY(180deg) translateX(5px) rotate(0.5deg); }
        }

        /* === BOTTOM === */
        .bottom {
          margin-top: 30px;
          position: relative;
          z-index: 1;
        }

        .btn {
          background: #1a1208;
          border: none;
          color: #f5f0e8;
          font-family: 'Playfair Display', serif;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          padding: 12px 32px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 3px 3px 0 #8b6a3a;
          position: relative;
        }

        .btn:hover {
          transform: translate(-1px, -1px);
          box-shadow: 4px 4px 0 #8b6a3a;
        }

        .btn:active {
          transform: translate(2px, 2px);
          box-shadow: 1px 1px 0 #8b6a3a;
        }

        /* === WIN === */
        .win-overlay {
          position: fixed;
          inset: 0;
          background: #f5f0e8dd;
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .win-box {
          background: #fffef9;
          border: 1px solid #1a1208;
          padding: 52px 60px;
          text-align: center;
          box-shadow: 6px 6px 0 #1a1208;
          max-width: 400px;
          width: 90%;
          position: relative;
          animation: popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes popIn {
          from { transform: scale(0.85) rotate(-2deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        .win-box::before {
          content: '';
          position: absolute;
          inset: 6px;
          border: 1px solid #c8b896;
          pointer-events: none;
        }

        .win-stamp {
          font-size: 2.8rem;
          margin-bottom: 10px;
          display: block;
          animation: rotate 4s linear infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .win-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.2rem;
          font-weight: 900;
          font-style: italic;
          color: #c0392b;
          margin-bottom: 6px;
          line-height: 1;
        }

        .win-sub {
          font-size: 0.85rem;
          font-style: italic;
          color: #8b6a3a;
          margin-bottom: 28px;
        }

        .win-sub strong { color: #1a1208; }
      `}</style>

      <div className="header">
        <div className="title">
          Cách Mạng <span className="title-red">Tháng Tám</span>
        </div>
        <div className="rule">
          <div className="rule-line" />
          <div className="rule-star">✦</div>
          <div className="rule-line" />
        </div>
      </div>

      <div className="grid">
        {deck.map((card) => {
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
                  <span className="card-back-label">1945</span>
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

      <div className="bottom">
        <button className="btn" onClick={reset}>↺ &nbsp;Chơi lại</button>
      </div>

      {won && (
        <div className="win-overlay">
          <div className="win-box">
            <span className="win-stamp">★</span>
            <div className="win-title">Xuất sắc!</div>
            <button className="btn" onClick={reset}>Chơi lại từ đầu</button>
          </div>
        </div>
      )}
    </div>
  );
}