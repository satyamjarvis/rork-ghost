import { UserStats } from '@/types/user';

const userStatsStore = new Map<string, UserStats>();

export function getUserStats(userId: string): UserStats {
  const existing = userStatsStore.get(userId);
  if (existing) {
    return existing;
  }

  const newStats: UserStats = {
    userId,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    roundsWon: 0,
    roundsLost: 0,
    winStreak: 0,
    longestWinStreak: 0,
  };
  
  userStatsStore.set(userId, newStats);
  return newStats;
}

export function updateUserStats(userId: string, updates: Partial<Omit<UserStats, 'userId'>>): UserStats {
  const currentStats = getUserStats(userId);
  const updatedStats = { ...currentStats, ...updates };
  userStatsStore.set(userId, updatedStats);
  return updatedStats;
}

export function recordGameResult(
  userId: string,
  won: boolean,
  roundsWon: number,
  roundsLost: number
): UserStats {
  const currentStats = getUserStats(userId);
  
  const newWinStreak = won ? currentStats.winStreak + 1 : 0;
  const newLongestStreak = Math.max(currentStats.longestWinStreak, newWinStreak);

  const updatedStats: UserStats = {
    userId,
    gamesPlayed: currentStats.gamesPlayed + 1,
    gamesWon: won ? currentStats.gamesWon + 1 : currentStats.gamesWon,
    gamesLost: won ? currentStats.gamesLost : currentStats.gamesLost + 1,
    roundsWon: currentStats.roundsWon + roundsWon,
    roundsLost: currentStats.roundsLost + roundsLost,
    winStreak: newWinStreak,
    longestWinStreak: newLongestStreak,
  };

  userStatsStore.set(userId, updatedStats);
  return updatedStats;
}
