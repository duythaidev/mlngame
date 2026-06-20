import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useGameSession } from "../hooks/useGameSession";
import { useGameBroadcast } from "../hooks/useGameBroadcast";
import FlipCardGame from "./FlipCardGame";

export default function PlayerBoard() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(() => {
    return localStorage.getItem(`player_id_${sessionId}`) || null;
  });
  const [joined, setJoined] = useState(!!playerId);
  
  const { session, loading } = useGameSession(sessionId);
  const { broadcastBoardState } = useGameBroadcast(sessionId, true);

  const [kicked, setKicked] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (joined && playerId && !playerName) {
      supabase.from("players").select("name").eq("id", playerId).single()
        .then(({ data }) => { if (data) setPlayerName(data.name); });
    }
  }, [joined, playerId, playerName]);

  useEffect(() => {
    if (!playerId) return;
    const channel = supabase
      .channel(`player-watch-${playerId}`)
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "players", filter: `id=eq.${playerId}` },
        () => {
          setKicked(true);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [playerId]);

  useEffect(() => {
    if (session?.phase === "reveal" && session.reveal_started_at) {
      const interval = setInterval(() => {
        const start = new Date(session.reveal_started_at!).getTime();
        const now = Date.now();
        // Giả sử reveal 60s
        const remaining = 60 - Math.floor((now - start) / 1000);
        if (remaining > 0) {
          setRevealCountdown(remaining);
        } else {
          setRevealCountdown(0);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setRevealCountdown(null);
    }
  }, [session?.phase, session?.reveal_started_at]);

  const handleJoin = async () => {
    if (!playerName.trim() || !sessionId) return;
    
    // Insert to DB
    const { data, error } = await supabase
      .from("players")
      .insert([{ session_id: sessionId, name: playerName }])
      .select()
      .single();
      
    if (data) {
      setPlayerId(data.id);
      localStorage.setItem(`player_id_${sessionId}`, data.id);
      setJoined(true);
    } else {
      alert("Error joining game");
      console.error(error);
    }
  };

  const handleBoardChange = (faceUpCardIds: string[], matchedPairIds: number[]) => {
    if (playerId) {
      broadcastBoardState(playerId, faceUpCardIds, matchedPairIds);
    }
  };

  const handleComplete = async (durationMs: number) => {
    if (!playerId || !sessionId) return;
    await supabase.from("results").insert([
      { session_id: sessionId, player_id: playerId, duration_ms: durationMs }
    ]);
  };

  if (!sessionId) {
    return <div style={{ padding: 40 }}>Vui lòng cung cấp link có chứa session ID.</div>;
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Đang tải...</div>;
  }

  if (!session) {
    return <div style={{ padding: 40 }}>Không tìm thấy session</div>;
  }

  if (!joined) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Tham gia ván chơi</h2>
        <input
          type="text"
          placeholder="Nhập tên của bạn"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={{ padding: 10, fontSize: 18, borderRadius: 8, marginRight: 10, color: 'black' }}
        />
        <button className="btn" onClick={handleJoin}>Tham gia</button>
      </div>
    );
  }

  if (kicked) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Bạn đã bị Admin loại khỏi ván chơi.</h2>
      </div>
    );
  }

  if (session.phase === "waiting") {
    return (
      <div style={{
      
        padding: 40,
        textAlign: "center",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}>
        <div className="rule">
          <div className="rule-line" />
          <div className="rule-star">✦</div>
          <div className="rule-line" />
        </div>
        <h2>Xin chào, {playerName || "bạn"}!</h2>
        <p style={{ fontSize: 18, opacity: 0.8 }}>
          Bạn đã tham gia thành công. Đang chờ Admin bắt đầu ván đấu...
        </p>
        <div className="spinner" />
        <p style={{ fontSize: 14, opacity: 0.6 }}>
          Khi Admin bấm bắt đầu, các thẻ bài sẽ tự động hiện ra để bạn ghi nhớ vị trí trong 60 giây.
        </p>
      </div>
    );
  }

  if (session.phase === "ended") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Ván chơi đã kết thúc.</h2>
      </div>
    );
  }

  // Phase reveal or play
  const isReveal = session.phase === "reveal";
  const isPlay = session.phase === "play";

  // When reveal phase, pretend we flipped all cards, or let FlipCardGame know it's reveal.
  // We can pass externalFaceUpIds as all cards if it's reveal, or modify FlipCardGame.
  // Actually, FlipCardGame will need to know if it's forced reveal.
  // Let's pass `readOnly` true when in reveal phase, and externalFaceUpIds to show all.
  // Oh wait, `FlipCardGame` needs to know all card IDs. We don't have them easily here without re-building deck.
  // Instead, let's just show a message. Or we can just build deck here to pass to externalFaceUpIds.
  const deckSize = 18; // 9 pairs * 2
  const allCardIds = [];
  if (isReveal) {
    for (let i = 0; i < deckSize / 2; i++) {
      allCardIds.push(`img-${i}`);
      allCardIds.push(`txt-${i}`);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      {isReveal && (
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.8)", color: "white", padding: "10px 20px", borderRadius: 8, zIndex: 1000 }}>
          <h3 style={{ margin: 0 }}>Ghi nhớ: {revealCountdown}s</h3>
        </div>
      )}
      <FlipCardGame
        seed={session.seed}
        readOnly={isReveal}
        externalFaceUpIds={isReveal ? allCardIds : []}
        onBoardChange={isPlay ? handleBoardChange : undefined}
        onComplete={handleComplete}
        playStartedAt={session.play_started_at}
      />
    </div>
  );
}
