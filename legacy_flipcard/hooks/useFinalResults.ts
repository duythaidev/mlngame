import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface FinalResult {
  id: string;
  session_id: string;
  player_id: string;
  player_name: string;
  matched_pairs: number;
  duration_ms: number | null;
  completed: boolean;
  rank: number;
  created_at: string;
}

export function useFinalResults(sessionId: string | null) {
  const [finalResults, setFinalResults] = useState<FinalResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setFinalResults([]);
      setLoading(false);
      return;
    }

    const fetchFinalResults = async () => {
      const { data } = await supabase
        .from("final_results")
        .select("*")
        .eq("session_id", sessionId)
        .order("rank", { ascending: true });

      if (data) setFinalResults(data as FinalResult[]);
      setLoading(false);
    };

    fetchFinalResults();

    const channel = supabase
      .channel(`final_results_changes_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "final_results",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchFinalResults();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { finalResults, loading };
}
