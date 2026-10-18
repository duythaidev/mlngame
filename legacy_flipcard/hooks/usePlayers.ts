import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface Player {
  id: string;
  session_id: string;
  name: string;
  joined_at: string;
}

export function usePlayers(sessionId: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("session_id", sessionId)
        .order("joined_at", { ascending: true });

      if (data) setPlayers(data as Player[]);
    };

    fetchPlayers();

    const channel = supabase
      .channel(`players_changes_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setPlayers((prev) => [...prev, payload.new as Player]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "players",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { players };
}
