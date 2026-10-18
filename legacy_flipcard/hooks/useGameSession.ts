import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface GameSession {
  id: string;
  seed: number;
  phase: 'waiting' | 'reveal' | 'play' | 'ended';
  reveal_started_at: string | null;
  play_started_at: string | null;
}

export function useGameSession(sessionId: string | null) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
        
      if (error) {
        console.error("Error fetching session:", error);
      }
      
      if (data) {
        setSession(data as GameSession);
      }
      setLoading(false);
    };

    fetchSession();

    const channel = supabase
      .channel(`session_changes_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSession(payload.new as GameSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { session, loading };
}
