import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase, Game, GameInvite } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { isValidWord } from '@/utils/game';
import { RealtimeChannel } from '@supabase/supabase-js';

const updatePlayerStatsHelper = async (game: Game, winnerId: string) => {
  const loserId = winnerId === game.player1_id 
    ? game.player2_id 
    : game.player1_id;

  try {
    const { data: winnerProfile } = await supabase
      .from('profiles')
      .select('wins')
      .eq('user_id', winnerId)
      .single();

    if (winnerProfile) {
      await supabase
        .from('profiles')
        .update({ wins: winnerProfile.wins + 1 })
        .eq('user_id', winnerId);
    }

    if (loserId) {
      const { data: loserProfile } = await supabase
        .from('profiles')
        .select('losses')
        .eq('user_id', loserId)
        .single();

      if (loserProfile) {
        await supabase
          .from('profiles')
          .update({ losses: loserProfile.losses + 1 })
          .eq('user_id', loserId);
      }
    }
  } catch (err) {
    console.error('[MP] Error updating player stats:', err);
  }
};

export interface LetterBombState {
  isActive: boolean;
  bombedLetter: string | null;
  bombedIndex: number;
  awaitingReplacement: boolean;
}

export const [MultiplayerContext, useMultiplayer] = createContextHook(() => {
  const { user } = useAuth();
  const [activeGames, setActiveGames] = useState<Game[]>([]);
  const [completedGames, setCompletedGames] = useState<Game[]>([]);
  const [pendingInvites, setPendingInvites] = useState<GameInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<GameInvite[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<{ username: string; display_name: string | null } | null>(null);
  const [isInQueue, setIsInQueue] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [letterBombState, setLetterBombState] = useState<LetterBombState>({
    isActive: false,
    bombedLetter: null,
    bombedIndex: -1,
    awaitingReplacement: false,
  });
  
  const gameChannelRef = useRef<RealtimeChannel | null>(null);
  const inviteChannelRef = useRef<RealtimeChannel | null>(null);

  const fetchActiveGames = useCallback(async () => {
    if (!user) return;
    
    console.log('[MP] Fetching active games');
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        player1_profile:profiles!games_player1_id_fkey(username, display_name),
        player2_profile:profiles!games_player2_id_fkey(username, display_name)
      `)
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .in('status', ['waiting', 'active'])
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[MP] Error fetching active games:', error);
      return;
    }

    console.log('[MP] Found', data?.length, 'active games');
    setActiveGames(data || []);
  }, [user]);

  const fetchCompletedGames = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        player1_profile:profiles!games_player1_id_fkey(username, display_name),
        player2_profile:profiles!games_player2_id_fkey(username, display_name)
      `)
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[MP] Error fetching completed games:', error);
      return;
    }

    setCompletedGames(data || []);
  }, [user]);

  const fetchPendingInvites = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('game_invites')
      .select(`
        *,
        from_profile:profiles!game_invites_from_user_id_fkey(username, display_name)
      `)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MP] Error fetching invites:', error);
      return;
    }

    setPendingInvites(data || []);
  }, [user]);

  const fetchSentInvites = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('game_invites')
      .select(`
        *,
        to_profile:profiles!game_invites_to_user_id_fkey(username, display_name)
      `)
      .eq('from_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MP] Error fetching sent invites:', error);
      return;
    }

    setSentInvites(data || []);
  }, [user]);

  const searchUserByUsername = useCallback(async (username: string) => {
    console.log('[MP] Searching for user:', username);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${username}%`)
      .neq('user_id', user?.id)
      .limit(10);

    if (error) {
      console.error('[MP] Error searching users:', error);
      return [];
    }

    return data || [];
  }, [user]);

  const sendGameInvite = useCallback(async (toUserId: string) => {
    if (!user) return { error: new Error('Not logged in') };

    console.log('[MP] Sending game invite to:', toUserId);
    const { data, error } = await supabase
      .from('game_invites')
      .insert({
        from_user_id: user.id,
        to_user_id: toUserId,
      })
      .select()
      .single();

    if (error) {
      console.error('[MP] Error sending invite:', error);
      return { error };
    }

    fetchSentInvites();
    return { data };
  }, [user, fetchSentInvites]);

  const acceptInvite = useCallback(async (inviteId: string, fromUserId: string) => {
    if (!user) return { error: new Error('Not logged in') };

    console.log('[MP] Accepting invite:', inviteId);
    
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        player1_id: fromUserId,
        player2_id: user.id,
        current_word: randomLetter,
        word_history: [{ letter: randomLetter, playerId: 'system' }],
        current_turn: fromUserId,
        status: 'active',
      })
      .select()
      .single();

    if (gameError) {
      console.error('[MP] Error creating game:', gameError);
      return { error: gameError };
    }

    const { error: updateError } = await supabase
      .from('game_invites')
      .update({ status: 'accepted', game_id: game.id })
      .eq('id', inviteId);

    if (updateError) {
      console.error('[MP] Error updating invite:', updateError);
    }

    fetchPendingInvites();
    fetchActiveGames();
    return { data: game };
  }, [user, fetchPendingInvites, fetchActiveGames]);

  const declineInvite = useCallback(async (inviteId: string) => {
    console.log('[MP] Declining invite:', inviteId);
    
    const { error } = await supabase
      .from('game_invites')
      .update({ status: 'declined' })
      .eq('id', inviteId);

    if (error) {
      console.error('[MP] Error declining invite:', error);
      return { error };
    }

    fetchPendingInvites();
    return { error: null };
  }, [fetchPendingInvites]);

  const cancelSentInvite = useCallback(async (inviteId: string) => {
    if (!user) return { error: new Error('Not logged in') };

    console.log('[MP] Cancelling sent invite:', inviteId);
    
    const { error, count } = await supabase
      .from('game_invites')
      .delete()
      .eq('id', inviteId)
      .eq('from_user_id', user.id)
      .eq('status', 'pending');

    if (error) {
      console.error('[MP] Error cancelling invite:', error);
      return { error };
    }

    console.log('[MP] Invite cancelled successfully, removed count:', count);
    
    // Immediately remove from local state for instant UI feedback
    setSentInvites(prev => prev.filter(invite => invite.id !== inviteId));
    
    return { error: null };
  }, [user]);

  const joinMatchmaking = useCallback(async () => {
    if (!user) return { error: new Error('Not logged in') };

    console.log('[MP] Joining matchmaking queue');
    setIsInQueue(true);

    const { data: existingPlayer, error: checkError } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .neq('user_id', user.id)
      .order('joined_at', { ascending: true })
      .limit(1)
      .single();

    if (existingPlayer && !checkError) {
      console.log('[MP] Found opponent in queue:', existingPlayer.user_id);
      
      await supabase
        .from('matchmaking_queue')
        .delete()
        .eq('user_id', existingPlayer.user_id);

      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];

      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          player1_id: existingPlayer.user_id,
          player2_id: user.id,
          current_word: randomLetter,
          word_history: [{ letter: randomLetter, playerId: 'system' }],
          current_turn: existingPlayer.user_id,
          status: 'active',
        })
        .select()
        .single();

      setIsInQueue(false);

      if (gameError) {
        console.error('[MP] Error creating game:', gameError);
        return { error: gameError };
      }

      fetchActiveGames();
      return { data: game };
    }

    const { error: queueError } = await supabase
      .from('matchmaking_queue')
      .upsert({ user_id: user.id });

    if (queueError) {
      console.error('[MP] Error joining queue:', queueError);
      setIsInQueue(false);
      return { error: queueError };
    }

    return { data: null, waiting: true };
  }, [user, fetchActiveGames]);

  const leaveMatchmaking = useCallback(async () => {
    if (!user) return;

    console.log('[MP] Leaving matchmaking queue');
    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('user_id', user.id);

    setIsInQueue(false);
  }, [user]);

  const loadGame = useCallback(async (gameId: string) => {
    console.log('[MP] Loading game:', gameId);
    setIsLoading(true);

    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        player1_profile:profiles!games_player1_id_fkey(username, display_name),
        player2_profile:profiles!games_player2_id_fkey(username, display_name)
      `)
      .eq('id', gameId)
      .single();

    if (error) {
      console.error('[MP] Error loading game:', error);
      setIsLoading(false);
      return { error };
    }

    setCurrentGame(data);
    
    const isPlayer1 = data.player1_id === user?.id;
    const opponent = isPlayer1 ? data.player2_profile : data.player1_profile;
    setOpponentProfile(opponent);

    if (gameChannelRef.current) {
      supabase.removeChannel(gameChannelRef.current);
    }

    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log('[MP] Game updated:', payload);
          setCurrentGame(payload.new as Game);
        }
      )
      .subscribe();

    gameChannelRef.current = channel;
    setIsLoading(false);
    return { data };
  }, [user]);

  const playMove = useCallback(async (letter: string) => {
    if (!currentGame || !user) return { error: new Error('No active game') };
    
    if (currentGame.current_turn !== user.id) {
      return { error: new Error('Not your turn') };
    }

    console.log('[MP] Playing letter:', letter);
    const newWord = currentGame.current_word + letter.toUpperCase();
    const newHistory = [...(currentGame.word_history || []), { letter: letter.toUpperCase(), playerId: user.id }];

    const isPlayer1 = currentGame.player1_id === user.id;
    const opponentId = isPlayer1 ? currentGame.player2_id : currentGame.player1_id;

    const { error } = await supabase
      .from('games')
      .update({
        current_word: newWord,
        word_history: newHistory,
        current_turn: opponentId,
        player1_passed: false,
        player2_passed: false,
      })
      .eq('id', currentGame.id);

    if (error) {
      console.error('[MP] Error playing move:', error);
      return { error };
    }

    await supabase
      .from('game_moves')
      .insert({
        game_id: currentGame.id,
        player_id: user.id,
        letter: letter.toUpperCase(),
        word_after: newWord,
        move_type: 'letter',
      });

    return { error: null };
  }, [currentGame, user]);

  const passTurn = useCallback(async () => {
    if (!currentGame || !user) return { error: new Error('No active game') };
    
    if (currentGame.current_turn !== user.id) {
      return { error: new Error('Not your turn') };
    }

    console.log('[MP] Passing turn');
    const isPlayer1 = currentGame.player1_id === user.id;
    const opponentId = isPlayer1 ? currentGame.player2_id : currentGame.player1_id;
    
    const opponentPassed = isPlayer1 ? currentGame.player2_passed : currentGame.player1_passed;

    if (opponentPassed) {
      console.log('[MP] Both players passed - ending game');
      const winnerId = currentGame.player1_rounds_won > currentGame.player2_rounds_won 
        ? currentGame.player1_id 
        : currentGame.player2_id;

      const { error } = await supabase
        .from('games')
        .update({
          status: 'completed',
          winner_id: winnerId,
        })
        .eq('id', currentGame.id);

      if (error) {
        console.error('[MP] Error ending game:', error);
        return { error };
      }

      if (winnerId) {
        await updatePlayerStatsHelper(currentGame, winnerId);
      }
      return { error: null, gameEnded: true };
    }

    const updateData = isPlayer1
      ? { player1_passed: true, current_turn: opponentId }
      : { player2_passed: true, current_turn: opponentId };

    const { error } = await supabase
      .from('games')
      .update(updateData)
      .eq('id', currentGame.id);

    if (error) {
      console.error('[MP] Error passing turn:', error);
      return { error };
    }

    await supabase
      .from('game_moves')
      .insert({
        game_id: currentGame.id,
        player_id: user.id,
        letter: '',
        word_after: currentGame.current_word,
        move_type: 'pass',
      });

    return { error: null };
  }, [currentGame, user]);

  const callWord = useCallback(async () => {
    if (!currentGame || !user) return { error: new Error('No active game') };
    
    if (currentGame.current_turn !== user.id) {
      return { error: new Error('Not your turn') };
    }

    const word = currentGame.current_word;
    console.log('[MP] Calling word:', word);

    if (word.length < 4) {
      return { error: new Error('Word must be at least 4 letters') };
    }

    const isPlayer1 = currentGame.player1_id === user.id;
    const opponentId = isPlayer1 ? currentGame.player2_id : currentGame.player1_id;

    if (isValidWord(word)) {
      console.log('[MP] Valid word! Caller wins round');
      
      const newPlayer1RoundsWon = isPlayer1 ? currentGame.player1_rounds_won + 1 : currentGame.player1_rounds_won;
      const newPlayer2RoundsWon = !isPlayer1 ? currentGame.player2_rounds_won + 1 : currentGame.player2_rounds_won;

      if (newPlayer1RoundsWon >= 2 || newPlayer2RoundsWon >= 2) {
        const winnerId = newPlayer1RoundsWon >= 2 ? currentGame.player1_id : currentGame.player2_id;
        
        const { error } = await supabase
          .from('games')
          .update({
            player1_rounds_won: newPlayer1RoundsWon,
            player2_rounds_won: newPlayer2RoundsWon,
            status: 'completed',
            winner_id: winnerId,
          })
          .eq('id', currentGame.id);

        if (error) return { error };
        if (winnerId) await updatePlayerStatsHelper(currentGame, winnerId);
        return { error: null, gameEnded: true, roundWon: true };
      }

      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];

      const { error } = await supabase
        .from('games')
        .update({
          player1_rounds_won: newPlayer1RoundsWon,
          player2_rounds_won: newPlayer2RoundsWon,
          current_round: currentGame.current_round + 1,
          current_word: randomLetter,
          word_history: [{ letter: randomLetter, playerId: 'system' }],
          current_turn: currentGame.player1_id,
          player1_passed: false,
          player2_passed: false,
        })
        .eq('id', currentGame.id);

      if (error) return { error };
      return { error: null, roundWon: true };
    } else {
      console.log('[MP] Invalid word! Opponent wins round');
      
      const newPlayer1RoundsWon = !isPlayer1 ? currentGame.player1_rounds_won + 1 : currentGame.player1_rounds_won;
      const newPlayer2RoundsWon = isPlayer1 ? currentGame.player2_rounds_won + 1 : currentGame.player2_rounds_won;

      if (newPlayer1RoundsWon >= 2 || newPlayer2RoundsWon >= 2) {
        const winnerId = newPlayer1RoundsWon >= 2 ? currentGame.player1_id : currentGame.player2_id;
        
        const { error } = await supabase
          .from('games')
          .update({
            player1_rounds_won: newPlayer1RoundsWon,
            player2_rounds_won: newPlayer2RoundsWon,
            status: 'completed',
            winner_id: winnerId,
          })
          .eq('id', currentGame.id);

        if (error) return { error };
        if (winnerId) await updatePlayerStatsHelper(currentGame, winnerId);
        return { error: null, gameEnded: true, roundWon: false };
      }

      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];

      const { error } = await supabase
        .from('games')
        .update({
          player1_rounds_won: newPlayer1RoundsWon,
          player2_rounds_won: newPlayer2RoundsWon,
          current_round: currentGame.current_round + 1,
          current_word: randomLetter,
          word_history: [{ letter: randomLetter, playerId: 'system' }],
          current_turn: opponentId,
          player1_passed: false,
          player2_passed: false,
        })
        .eq('id', currentGame.id);

      if (error) return { error };
      return { error: null, roundWon: false };
    }
  }, [currentGame, user]);



  const useLetterBomb = useCallback(async () => {
    if (!currentGame || !user) return { error: new Error('No active game') };
    
    if (currentGame.current_turn !== user.id) {
      return { error: new Error('Not your turn') };
    }

    if (currentGame.current_word.length < 2) {
      return { error: new Error('Word must have at least 2 letters to use Letter Bomb') };
    }

    console.log('[MP] Using Letter Bomb');
    const wordArray = currentGame.current_word.split('');
    const lastLetter = wordArray[wordArray.length - 1];
    const bombedIndex = wordArray.length - 1;
    const newWord = wordArray.slice(0, -1).join('');

    setLetterBombState({
      isActive: true,
      bombedLetter: lastLetter,
      bombedIndex: bombedIndex,
      awaitingReplacement: true,
    });

    setCurrentGame(prev => prev ? {
      ...prev,
      current_word: newWord,
    } : null);

    return { error: null, bombedLetter: lastLetter, bombedIndex };
  }, [currentGame, user]);

  const playBombReplacement = useCallback(async (letter: string) => {
    if (!currentGame || !user) return { error: new Error('No active game') };
    
    if (!letterBombState.awaitingReplacement) {
      return { error: new Error('Not awaiting bomb replacement') };
    }

    if (letter.toUpperCase() === letterBombState.bombedLetter) {
      return { error: new Error('Cannot use the same letter that was bombed') };
    }

    console.log('[MP] Playing bomb replacement letter:', letter);
    const newWord = currentGame.current_word + letter.toUpperCase();
    const newHistory = [...(currentGame.word_history || []), { letter: letter.toUpperCase(), playerId: user.id, isBombReplacement: true }];

    const isPlayer1 = currentGame.player1_id === user.id;
    const opponentId = isPlayer1 ? currentGame.player2_id : currentGame.player1_id;

    const { error } = await supabase
      .from('games')
      .update({
        current_word: newWord,
        word_history: newHistory,
        current_turn: opponentId,
        player1_passed: false,
        player2_passed: false,
      })
      .eq('id', currentGame.id);

    if (error) {
      console.error('[MP] Error playing bomb replacement:', error);
      return { error };
    }

    await supabase
      .from('game_moves')
      .insert({
        game_id: currentGame.id,
        player_id: user.id,
        letter: letter.toUpperCase(),
        word_after: newWord,
        move_type: 'bomb_replacement',
      });

    setLetterBombState({
      isActive: false,
      bombedLetter: null,
      bombedIndex: -1,
      awaitingReplacement: false,
    });

    return { error: null };
  }, [currentGame, user, letterBombState]);

  const cancelLetterBomb = useCallback(() => {
    setLetterBombState({
      isActive: false,
      bombedLetter: null,
      bombedIndex: -1,
      awaitingReplacement: false,
    });
  }, []);

  const leaveGame = useCallback(() => {
    if (gameChannelRef.current) {
      supabase.removeChannel(gameChannelRef.current);
      gameChannelRef.current = null;
    }
    setCurrentGame(null);
    setOpponentProfile(null);
    setLetterBombState({
      isActive: false,
      bombedLetter: null,
      bombedIndex: -1,
      awaitingReplacement: false,
    });
  }, []);

  const deleteGame = useCallback(async (gameId: string) => {
    if (!user) return { error: new Error('Not logged in') };

    console.log('[MP] Deleting/leaving game:', gameId);
    
    const { error } = await supabase
      .from('games')
      .update({
        status: 'completed',
        winner_id: null,
      })
      .eq('id', gameId);

    if (error) {
      console.error('[MP] Error deleting game:', error);
      return { error };
    }

    setActiveGames(prev => prev.filter(g => g.id !== gameId));
    fetchCompletedGames();
    return { error: null };
  }, [user, fetchCompletedGames]);

  useEffect(() => {
    if (user) {
      fetchActiveGames();
      fetchCompletedGames();
      fetchPendingInvites();
      fetchSentInvites();

      const channel = supabase
        .channel('invites')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'game_invites',
            filter: `to_user_id=eq.${user.id}`,
          },
          () => {
            console.log('[MP] New invite received');
            fetchPendingInvites();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'games',
          },
          () => {
            fetchActiveGames();
            fetchCompletedGames();
          }
        )
        .subscribe();

      inviteChannelRef.current = channel;

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchActiveGames, fetchCompletedGames, fetchPendingInvites, fetchSentInvites]);

  return {
    activeGames,
    completedGames,
    pendingInvites,
    sentInvites,
    currentGame,
    opponentProfile,
    isInQueue,
    isLoading,
    letterBombState,
    fetchActiveGames,
    fetchCompletedGames,
    fetchPendingInvites,
    searchUserByUsername,
    sendGameInvite,
    acceptInvite,
    declineInvite,
    cancelSentInvite,
    joinMatchmaking,
    leaveMatchmaking,
    loadGame,
    playMove,
    passTurn,
    callWord,
    useLetterBomb,
    playBombReplacement,
    cancelLetterBomb,
    leaveGame,
    deleteGame,
  };
});
