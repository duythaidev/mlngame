import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface BoardUpdatePayload {
  playerId: string;
  faceUpCardIds: string[];
  matchedPairIds: number[];
}

export function useGameBroadcast(sessionId: string | null, isSender: boolean) {
  const [boards, setBoards] = useState<Record<string, BoardUpdatePayload>>({});
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) return;

    const ch = supabase.channel(`session:${sessionId}`);
    
    // If Admin, listen for broadcasts
    if (!isSender) {
      ch.on(
        'broadcast',
        { event: 'board_update' },
        ({ payload }) => {
          setBoards((prev) => ({
            ...prev,
            [payload.playerId]: payload as BoardUpdatePayload,
          }));
        }
      );
    }
    
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Broadcast channel subscribed');
      }
    });

    setChannel(ch);

    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessionId, isSender]);

  const broadcastBoardState = useCallback(
    async (playerId: string, faceUpCardIds: string[], matchedPairIds: number[]) => {
      if (!channel || !isSender) return;
      await channel.send({
        type: 'broadcast',
        event: 'board_update',
        payload: { playerId, faceUpCardIds, matchedPairIds },
      });
    },
    [channel, isSender]
  );

  const clearBoards = useCallback(() => {
    setBoards({});
  }, []);

  return { boards, broadcastBoardState, clearBoards };
}

