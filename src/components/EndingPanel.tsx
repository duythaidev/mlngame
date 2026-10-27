// src/components/EndingPanel.tsx
// Màn kết sau level cuối: câu hỏi của bài → "Không mâu thuẫn" + 3 ý. Phủ lên canvas.
import { ENDING } from "../game/story";

export default function EndingPanel({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="ending-panel">
      <p className="ending-question">{ENDING.question}</p>
      <h2>{ENDING.answer}</h2>
      <ol>
        {ENDING.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
    </div>
  );
}
