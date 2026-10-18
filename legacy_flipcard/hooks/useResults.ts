import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Result {
  id: string;
  session_id: string;
  player_id: string;
  duration_ms: number;
  completed_at: string;
}

export function useResults(sessionId: string | null) {
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    const fetchResults = async () => {
      const { data } = await supabase
        .from('results')
        .select('*')
        .eq('session_id', sessionId)
        .order('duration_ms', { ascending: true });
      
      if (data) setResults(data as Result[]);
    };

    fetchResults();

    const channel = supabase
      .channel(`results_changes_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'results',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setResults((prev) => {
            const newResults = [...prev, payload.new as Result];
            newResults.sort((a, b) => a.duration_ms - b.duration_ms);
            return newResults;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { results };
}
