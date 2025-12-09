import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing environment variables. Multiplayer features will not work.');
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.log('[Supabase Storage] Error getting item:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.log('[Supabase Storage] Error setting item:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.log('[Supabase Storage] Error removing item:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Profile = {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  wins: number;
  losses: number;
  ghost_coins: number;
  all_time_points: number;
  ai_wins: number;
  ai_losses: number;
  ai_points: number;
  ai_win_streak: number;
  ai_longest_win_streak: number;
  pvp_wins: number;
  pvp_losses: number;
  pvp_points: number;
  pvp_win_streak: number;
  pvp_longest_win_streak: number;
  created_at: string;
  updated_at: string;
};

export type Game = {
  id: string;
  player1_id: string;
  player2_id: string | null;
  current_word: string;
  word_history: { letter: string; playerId: string }[];
  current_turn: string | null;
  player1_rounds_won: number;
  player2_rounds_won: number;
  current_round: number;
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  winner_id: string | null;
  player1_passed: boolean;
  player2_passed: boolean;
  created_at: string;
  updated_at: string;
};

export type GameInvite = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  game_id: string | null;
  created_at: string;
  expires_at: string;
};

export type GameMove = {
  id: string;
  game_id: string;
  player_id: string;
  letter: string;
  word_after: string;
  move_type: 'letter' | 'pass' | 'challenge' | 'call_word';
  created_at: string;
};
