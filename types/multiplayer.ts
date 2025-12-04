export type MultiplayerGameStatus = 'waiting' | 'active' | 'completed' | 'abandoned';

export interface MultiplayerGame {
  id: string;
  player1_id: string;
  player2_id: string | null;
  current_word: string;
  word_history: { letter: string; playerId: string }[];
  current_turn: string | null;
  player1_rounds_won: number;
  player2_rounds_won: number;
  current_round: number;
  status: MultiplayerGameStatus;
  winner_id: string | null;
  player1_passed: boolean;
  player2_passed: boolean;
  created_at: string;
  updated_at: string;
  player1_profile?: {
    username: string;
    display_name: string | null;
  };
  player2_profile?: {
    username: string;
    display_name: string | null;
  } | null;
}

export interface GameInvite {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  game_id: string | null;
  created_at: string;
  expires_at: string;
  from_profile?: {
    username: string;
    display_name: string | null;
  };
  to_profile?: {
    username: string;
    display_name: string | null;
  };
}

export interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  wins: number;
  losses: number;
  created_at: string;
}
