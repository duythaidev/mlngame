import { useState, useEffect } from "react";
import { CARD_PAIRS, type Card } from "../lib/constants";
import { buildDeck } from "../lib/shuffle";
import "../App.css";

export interface FlipCardGameProps {
  seed?: number;
  readOnly?: boolean;
  onBoardChange?: (faceUpCardIds: string[], matchedPairIds: number[]) => void;
  onComplete?: (durationMs: number) => void;
  playStartedAt?: string | null;
  externalFaceUpIds?: string[];
  externalMatchedIds?: number[];
  playerName?: string;
}

export default function FlipCardGame({
  seed,
  readOnly = false,
  onBoardChange,
  onComplete,
  playStartedAt,
  externalFaceUpIds = [],
  externalMatchedIds = [],
  playerName,
}: FlipCardGameProps) {
  const [deck, setDeck] = useState<Card[]>(() => buildDeck(CARD_PAIRS, seed || Math.floor(Math.random() * 100000)));
  const [flipped, setFlipped] = useState<Card[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [won, setWon] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);

  useEffect(() => {
    if (seed !== undefined) {
      setDeck(buildDeck(CARD_PAIRS, seed));
      setFlipped([]);
      setMatched([]);
      setLocked(false);
      setWon(false);
      setWrong([]);
    }
  }, [seed]);

  useEffect(() => {
    if (!readOnly && onBoardChange) {
      const faceUpCardIds = flipped.map(c => c.id);
      onBoardChange(faceUpCardIds, matched);
    }
  }, [flipped, matched, readOnly, onBoardChange]);

  const handleFlip = (card: Card) => {
    if (readOnly || locked) return;
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
    if (!readOnly && matched.length === CARD_PAIRS.length && !won) {
      setTimeout(() => {
        setWon(true);
        if (onComplete && playStartedAt) {
          const duration = Date.now() - new Date(playStartedAt).getTime();
          onComplete(duration);
        } else if (onComplete) {
          onComplete(0);
        }
      }, 500);
    }
  }, [matched, readOnly, won, onComplete, playStartedAt]);

  const isFaceUp = (card: Card) => {
    if (readOnly) {
      return externalFaceUpIds.includes(card.id) || externalMatchedIds.includes(card.pairId);
    }
    return flipped.some((c) => c.id === card.id) || matched.includes(card.pairId);
  };
  
  const isMatched = (card: Card) => {
    if (readOnly) return externalMatchedIds.includes(card.pairId);
    return matched.includes(card.pairId);
  };
  
  const isWrong = (card: Card) => {
    if (readOnly) return false;
    return wrong.includes(card.id);
  };

  return (
    <div className={`root ${readOnly ? 'readonly-board' : ''}`}>
      {!readOnly && (
        <div className="header">
          <div className="title">Cách Mạng <span className="title-red">Tháng Tám</span></div>
          <div className="rule">
            <div className="rule-line" />
            <div className="rule-star">✦</div>
            <div className="rule-line" />
          </div>
        </div>
      )}
      
      {readOnly && playerName && (
        <div style={{ textAlign: 'center', marginBottom: '10px', fontSize: '18px', fontWeight: 'bold',  }}>
          {playerName} ({externalMatchedIds.length}/{CARD_PAIRS.length})
        </div>
      )}

      <div className="grid">
        {deck.map((card, index) => {
          const faceUp = isFaceUp(card);
          const matchedState = isMatched(card);
          const wrongState = isWrong(card);

          return (
            <div
              key={card.id}
              className={["card-wrap", matchedState ? "is-matched" : "", wrongState ? "is-wrong" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleFlip(card)}
            >
              <div className={`card-inner${faceUp ? " face-up" : ""}`}>
                <div className="card-face card-back">
                  <span className="card-back-star">✦</span>
                  <span className="card-back-label">{index + 1}</span>
                </div>

                {card.type === "image" ? (
                  <div className="card-face card-front type-image">
                    <img className="card-img" src={card.content} alt="" draggable={false} />
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

      {!readOnly && won && (
        <div className="win-overlay">
          <div className="win-box">
            <span className="win-stamp">★</span>
            <div className="win-title">Xuất sắc!</div>
          </div>
        </div>
      )}
    </div>
  );
}
