import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useGameSession } from "../hooks/useGameSession";
import { usePlayers } from "../hooks/usePlayers";
import { useResults } from "../hooks/useResults";
import { useFinalResults } from "../hooks/useFinalResults";
import { useGameBroadcast } from "../hooks/useGameBroadcast";
import MiniBoardPreview from "./MiniBoardPreview";
import AdminLogin from "./AdminLogin";
import { CARD_PAIRS, REVEAL_TIMEOUT_SECONDS } from "../lib/constants";

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => sessionStorage.getItem("admin_logged_in") === "true",
  );
  const [confirmKickPlayer, setConfirmKickPlayer] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");

  const { session, loading } = useGameSession(sessionId);
  const { players } = usePlayers(sessionId);
  const { results } = useResults(sessionId);
  const { finalResults } = useFinalResults(sessionId);
  const { boards, clearBoards } = useGameBroadcast(sessionId, false);

  const [creating, setCreating] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (session?.phase === "reveal" && session.reveal_started_at) {
      const interval = setInterval(() => {
        const start = new Date(session.reveal_started_at!).getTime();
        const remaining = REVEAL_TIMEOUT_SECONDS - Math.floor((Date.now() - start) / 1000);
        setRevealCountdown(remaining > 0 ? remaining : 0);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setRevealCountdown(null);
    }
  }, [session?.phase, session?.reveal_started_at]);

  const createSession = async () => {
    setCreating(true);
    const seed = Math.floor(Math.random() * 1000000);
    const { data, error } = await supabase
      .from("game_sessions")
      .insert([{ seed, phase: "waiting" }])
      .select()
      .single();

    if (data) {
      window.location.href = `/admin?session=${data.id}`;
    } else {
      alert("Error creating session");
      console.error(error);
    }
    setCreating(false);
  };

  const startReveal = async () => {
    if (!sessionId) return;
    await supabase
      .from("game_sessions")
      .update({ phase: "reveal", reveal_started_at: new Date().toISOString() })
      .eq("id", sessionId);
  };

  const startPlay = async () => {
    if (!sessionId) return;
    await supabase
      .from("game_sessions")
      .update({ phase: "play", play_started_at: new Date().toISOString() })
      .eq("id", sessionId);
  };

  const restartSession = async () => {
    if (!sessionId) return;
    const newSeed = Math.floor(Math.random() * 1000000);
    clearBoards();
    await supabase
      .from("game_sessions")
      .update({
        phase: "waiting",
        seed: newSeed,
        reveal_started_at: null,
        play_started_at: null,
      })
      .eq("id", sessionId);
    await supabase.from("results").delete().eq("session_id", sessionId);
    await supabase.from("final_results").delete().eq("session_id", sessionId);
  };

  const endGame = async () => {
    if (!sessionId || !session) return;

    const playStart = session.play_started_at
      ? new Date(session.play_started_at).getTime()
      : Date.now();
    const now = Date.now();

    const rows = players.map((player) => {
      const board = boards[player.id];
      const matchedPairs = board?.matchedPairIds?.length ?? 0;
      const finishedResult = results.find((r) => r.player_id === player.id);
      const completed = !!finishedResult;
      const durationMs = completed
        ? finishedResult!.duration_ms
        : now - playStart;

      return {
        session_id: sessionId,
        player_id: player.id,
        player_name: player.name,
        matched_pairs: matchedPairs,
        duration_ms: durationMs,
        completed,
      };
    });

    // Sắp theo: số cặp giảm dần, rồi thời gian tăng dần
    rows.sort((a, b) => {
      if (b.matched_pairs !== a.matched_pairs)
        return b.matched_pairs - a.matched_pairs;
      return a.duration_ms - b.duration_ms;
    });

    const rankedRows = rows.map((r, index) => ({ ...r, rank: index + 1 }));

    await supabase.from("final_results").insert(rankedRows);
    await supabase
      .from("game_sessions")
      .update({ phase: "ended" })
      .eq("id", sessionId);
  };

  const kickPlayer = async (playerId: string) => {
    await supabase.from("players").delete().eq("id", playerId);
    setConfirmKickPlayer(null);
  };

  if (!isLoggedIn) {
    return <AdminLogin onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  if (!sessionId) {
    return (
      <div style={{ padding: 40, color: "white", textAlign: "center" }}>
        <h1>Admin Dashboard</h1>
        <button className="btn" onClick={createSession} disabled={creating}>
          {creating ? "Đang tạo..." : "Tạo ván mới"}
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ color: "white", padding: 40 }}>Đang tải...</div>;
  }

  if (!session) {
    return (
      <div style={{ color: "white", padding: 40 }}>Không tìm thấy session</div>
    );
  }

  return (
    <div style={{ padding: 20, color: "white" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2>Admin Panel - Session: {sessionId.substring(0, 8)}...</h2>
        <div style={{ display: "flex", gap: 10 }}>
          {session.phase === "waiting" && (
            <button
              className="btn"
              onClick={startReveal}
              disabled={players.length === 0}
            >
              Start Reveal Phase ({players.length} players)
            </button>
          )}
          {session.phase === "reveal" && (
            <button className="btn" onClick={startPlay}>
              Start Play Phase{revealCountdown !== null && ` (còn ${revealCountdown}s)`}
            </button>
          )}
          {session.phase === "play" && (
            <button
              className="btn"
              style={{ background: "#27ae60" }}
              onClick={endGame}
            >
              🏁 Kết thúc trò chơi
            </button>
          )}
          <div
            style={{
              padding: "10px 20px",
              background: "#333",
              borderRadius: 8,
            }}
          >
            Trạng thái: <strong>{session.phase.toUpperCase()}</strong>
          </div>
          <button
            className="btn"
            style={{ background: "#c0392b" }}
            onClick={restartSession}
          >
            ↺ Chơi lại ván này
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <h3>Live Boards</h3>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
          >
            {players.map((player) => (
              <div
                key={player.id}
                style={{
                  border: "1px solid #444",
                  borderRadius: 8,
                  padding: 6,
                  maxHeight: 500,
                  background: "#1a1a1a",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <button
                  className="btn"
                  style={{
                    background: "#c0392b",
                    position: "absolute",
                    top: 8,
                    right: 8,
                    fontSize: 12,
                    padding: "4px 10px",
                    zIndex: 10,
                  }}
                  onClick={() =>
                    setConfirmKickPlayer({ id: player.id, name: player.name })
                  }
                >
                  Kick
                </button>
                <MiniBoardPreview
                  seed={session.seed}
                  playerName={player.name}
                  boardState={boards[player.id]}
                  forceRevealAll={session.phase === "reveal"}
                />
               </div>
            ))}
            {players.length === 0 && <p>Chưa có player nào join.</p>}
          </div>
        </div>

        <div style={{ width: 300 }}>
          <div
            style={{
              background: "#222",
              padding: 20,
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            <h3>Bảng xếp hạng</h3>
            {session.phase === "ended" ? (
              <ol style={{ paddingLeft: 20 }}>
                {finalResults.map((r) => (
                  <li key={r.id} style={{ marginBottom: 10 }}>
                    <strong>{r.player_name}</strong>: {r.matched_pairs}/
                    {CARD_PAIRS.length} cặp
                    {r.completed
                      ? ` — ${(r.duration_ms! / 1000).toFixed(2)}s`
                      : " (chưa hoàn thành)"}
                  </li>
                ))}
              </ol>
            ) : results.length === 0 ? (
              <p>Chưa ai hoàn thành</p>
            ) : (
              <ol style={{ paddingLeft: 20 }}>
                {results.map((r) => {
                  const p = players.find((pl) => pl.id === r.player_id);
                  return (
                    <li key={r.id} style={{ marginBottom: 10 }}>
                      <strong>{p?.name || "Unknown"}</strong>:{" "}
                      {(r.duration_ms / 1000).toFixed(2)}s
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div style={{ background: "#222", padding: 20, borderRadius: 8 }}>
            <p style={{ wordBreak: "break-all", fontSize: 14, color: "#222" }}>
              {window.location.origin}/play?session={sessionId}
            </p>
          </div>
        </div>
      </div>

      {confirmKickPlayer && (
        <div
          className="win-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmKickPlayer(null);
          }}
        >
          <div className="win-box" style={{ padding: 30 }}>
            <div
              className="win-title"
              style={{ fontSize: 24, marginBottom: 20 }}
            >
              Xác nhận Kick
            </div>
            <p style={{ color: "black", marginBottom: 30 }}>
              Bạn có chắc muốn loại <strong>{confirmKickPlayer.name}</strong>{" "}
              khỏi ván chơi?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="btn"
                style={{ background: "#c0392b" }}
                onClick={() => kickPlayer(confirmKickPlayer.id)}
              >
                Xác nhận Kick
              </button>
              <button
                className="btn"
                style={{ background: "#555" }}
                onClick={() => setConfirmKickPlayer(null)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
