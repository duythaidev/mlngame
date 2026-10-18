import FlipCardGame from "./FlipCardGame";
import type { BoardUpdatePayload } from "../hooks/useGameBroadcast";
import { CARD_PAIRS } from "../lib/constants";

interface MiniBoardPreviewProps {
  seed: number;
  playerName: string;
  boardState?: BoardUpdatePayload;
  forceRevealAll?: boolean;
}

export default function MiniBoardPreview({
  seed,
  playerName,
  boardState,
  forceRevealAll = false,
}: MiniBoardPreviewProps) {
  const allCardIds = forceRevealAll
    ? CARD_PAIRS.flatMap((_, i) => [`img-${i}`, `txt-${i}`])
    : [];

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <FlipCardGame
        seed={seed}
        readOnly={true}
        playerName={playerName}
        externalFaceUpIds={forceRevealAll ? allCardIds : (boardState?.faceUpCardIds || [])}
        externalMatchedIds={boardState?.matchedPairIds || []}
      />
    </div>
  );
}
