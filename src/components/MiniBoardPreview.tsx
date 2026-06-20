import FlipCardGame from "./FlipCardGame";
import type { BoardUpdatePayload } from "../hooks/useGameBroadcast";

interface MiniBoardPreviewProps {
  seed: number;
  playerName: string;
  boardState?: BoardUpdatePayload;
}

export default function MiniBoardPreview({ seed, playerName, boardState }: MiniBoardPreviewProps) {
  return (
    <div style={{ transform: "scale(0.5)", transformOrigin: "top left", width: "100%", height: "100%" }}>
      <FlipCardGame
        seed={seed}
        readOnly={true}
        playerName={playerName}
        externalFaceUpIds={boardState?.faceUpCardIds || []}
        externalMatchedIds={boardState?.matchedPairIds || []}
      />
    </div>
  );
}
