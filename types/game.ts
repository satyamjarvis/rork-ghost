export type GameMode = 'ai';
export type PlayerType = 'human' | 'ai';
export type GamePhase = 'waiting' | 'playing' | 'roundEnd' | 'gameOver' | 'challenge';
export type ChallengeState = 'active' | 'proving' | 'resolved';

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  score: number;
  roundsWon: number;
  currentWord?: string;
}

export interface Round {
  number: number;
  currentWord: string;
  wordHistory: { letter: string; playerId: string }[];
  loser?: string;
  reason?: 'completed' | 'invalid' | 'timeout' | 'called_word' | 'challenge_failed' | 'challenge_success';
  timeLeft: number;
  challengedPlayerId?: string;
  challengerPlayerId?: string;
  targetWord?: string;
}

export interface GameState {
  mode: GameMode;
  phase: GamePhase;
  player1: Player;
  player2: Player;
  currentRound: number;
  totalRounds: number;
  rounds: Round[];
  currentPlayer: string;
  winner?: 'player1' | 'player2';
  challengeState?: ChallengeState;
  challengeInput?: string;
  challengerId?: string;
  originalWordBeforeChallenge?: string;
  letterBombedLetter?: string;
  letterBombedBy?: string;
  letterBombPending?: boolean;
  disabledLetter?: string;
  disabledLetterBy?: string;
}
