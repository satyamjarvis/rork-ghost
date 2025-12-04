export type PowerUpType = 'letter_bomb';
export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'superior';

export interface PowerUp {
  id: PowerUpType;
  name: string;
  description: string;
  price: number;
  icon: string;
}

export interface PlayerInventory {
  letterBombs: number;
}

export interface PlayerWallet {
  ghostCoins: number;
}

export interface PlayerSettings {
  aiDifficulty: AIDifficulty;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  roundsWon: number;
  roundsLost: number;
  winStreak: number;
  longestWinStreak: number;
}

export const AVAILABLE_POWERUPS: PowerUp[] = [
  {
    id: 'letter_bomb',
    name: 'Letter Bomb',
    description: 'Explode the most recent letter your opponent played and replace it with any letter (except the exploded one)',
    price: 10,
    icon: '💣',
  },
];
