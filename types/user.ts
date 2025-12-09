export interface UserProfile {
  userId: string;
  username?: string;
  email?: string;
}

export interface UserStats {
  userId: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  roundsWon: number;
  roundsLost: number;
  winStreak: number;
  longestWinStreak: number;
}

export interface GameModeStats {
  wins: number;
  losses: number;
  points: number;
  winStreak: number;
  longestWinStreak: number;
}

export interface PlayerStats {
  ai: GameModeStats;
  pvp: GameModeStats;
}
