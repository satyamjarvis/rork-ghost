import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, GameMode, Round, Player } from '@/types/game';
import { GAME_CONFIG, POINTS_PER_LETTER } from '@/constants/game';
import { isValidWord, isValidWordAsync, getAllWordsStartingWith } from '@/utils/dictionary';
import { findBestLetter, shouldAIChallenge } from '@/utils/ai';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { AIDifficulty } from '@/types/store';

export const [GameContext, useGame] = createContextHook(() => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(GAME_CONFIG.TIME_PER_TURN);
  const [isAIThinking, setIsAIThinking] = useState<boolean>(false);
  const [letterBombActive, setLetterBombActive] = useState<boolean>(false);
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('medium');
  const [lastLetterBombUsedBy, setLastLetterBombUsedBy] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const validationInProgress = useRef<boolean>(false);

  const startGame = useCallback((mode: GameMode = 'ai') => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    
    const initialRound: Round = {
      number: 1,
      currentWord: randomLetter,
      wordHistory: [{ letter: randomLetter, playerId: 'system' }],
      timeLeft: GAME_CONFIG.TIME_PER_TURN,
    };

    const player1: Player = {
      id: 'player1',
      name: 'You',
      type: 'human',
      score: 0,
      roundsWon: 0,
    };

    const player2: Player = {
      id: 'player2',
      name: 'AI',
      type: 'ai',
      score: 0,
      roundsWon: 0,
    };

    setGameState({
      mode: 'ai',
      phase: 'playing',
      player1,
      player2,
      currentRound: 1,
      totalRounds: GAME_CONFIG.TOTAL_ROUNDS,
      rounds: [initialRound],
      currentPlayer: 'player1',
    });

    setTimeLeft(GAME_CONFIG.TIME_PER_TURN);
  }, []);

  const playLetter = useCallback((letter: string) => {
    setGameState(prevState => {
      if (!prevState) return null;

      const currentRound = prevState.rounds[prevState.currentRound - 1];
      const isPlayer1 = prevState.currentPlayer === 'player1';
      const currentPlayerId = isPlayer1 ? 'player1' : 'player2';
      
      const newWord = currentRound.currentWord + letter.toUpperCase();

      const updatedHistory = [
        ...currentRound.wordHistory,
        {
          letter: letter.toUpperCase(),
          playerId: currentPlayerId,
        },
      ];

      const updatedRound = {
        ...currentRound,
        currentWord: newWord,
        wordHistory: updatedHistory,
      };

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const updatedRounds = [...prevState.rounds];
      updatedRounds[prevState.currentRound - 1] = updatedRound;

      const isInChallengeMode = prevState.phase === 'challenge';
      const nextPlayer = isInChallengeMode ? prevState.currentPlayer : (isPlayer1 ? 'player2' : 'player1');

      return {
        ...prevState,
        currentPlayer: nextPlayer,
        rounds: updatedRounds,
        disabledLetter: prevState.disabledLetterBy === currentPlayerId ? undefined : prevState.disabledLetter,
        disabledLetterBy: prevState.disabledLetterBy === currentPlayerId ? undefined : prevState.disabledLetterBy,
      };
    });

    setTimeLeft(GAME_CONFIG.TIME_PER_TURN);
  }, []);

  const nextRound = useCallback(() => {
    if (!gameState) return;

    if (gameState.player1.roundsWon >= 2 || gameState.player2.roundsWon >= 2) {
      const winner = gameState.player1.roundsWon >= 2 ? 'player1' : 'player2';

      setGameState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          phase: 'gameOver',
          winner,
        };
      });
    } else {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
      
      const newRound: Round = {
        number: gameState.currentRound + 1,
        currentWord: randomLetter,
        wordHistory: [{ letter: randomLetter, playerId: 'system' }],
        timeLeft: GAME_CONFIG.TIME_PER_TURN,
      };

      setGameState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          phase: 'playing',
          currentRound: prev.currentRound + 1,
          rounds: [...prev.rounds, newRound],
          currentPlayer: 'player1',
        };
      });

      setTimeLeft(GAME_CONFIG.TIME_PER_TURN);
    }
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState(null);
    setTimeLeft(GAME_CONFIG.TIME_PER_TURN);
  }, []);

  const callWord = useCallback(async () => {
    if (!gameState || validationInProgress.current) return;
    
    const currentRound = gameState.rounds[gameState.currentRound - 1];
    const isPlayer1 = gameState.currentPlayer === 'player1';
    const currentPlayerId = isPlayer1 ? 'player1' : 'player2';
    
    if (currentRound.currentWord.length < 4) {
      console.log('Word must be at least 4 letters to call');
      return;
    }

    validationInProgress.current = true;
    setIsValidating(true);
    
    console.log(`[CallWord] Validating "${currentRound.currentWord}" with API...`);
    
    try {
      const wordIsValid = await isValidWordAsync(currentRound.currentWord);
      console.log(`[CallWord] Validation result for "${currentRound.currentWord}": ${wordIsValid}`);

      setGameState(prevState => {
        if (!prevState) return null;
        
        const round = prevState.rounds[prevState.currentRound - 1];

        const wordPoints = round.currentWord.split('').reduce((sum, letter) => {
            return sum + (POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER] || 0);
          }, 0);

          if (wordIsValid) {
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          
          const winnerId = currentPlayerId;
          const loserId = isPlayer1 ? 'player2' : 'player1';
          const newPlayer1RoundsWon = winnerId === 'player1' ? prevState.player1.roundsWon + 1 : prevState.player1.roundsWon;
          const newPlayer2RoundsWon = winnerId === 'player2' ? prevState.player2.roundsWon + 1 : prevState.player2.roundsWon;
          const newPlayer1Score = winnerId === 'player1' ? prevState.player1.score + wordPoints : prevState.player1.score;
          const newPlayer2Score = winnerId === 'player2' ? prevState.player2.score + wordPoints : prevState.player2.score;

          const updatedRounds = [...prevState.rounds];
          updatedRounds[prevState.currentRound - 1] = {
            ...round,
            loser: loserId,
            reason: 'called_word',
          };

          console.log(`${currentPlayerId} successfully called word: ${round.currentWord} worth ${wordPoints} points`);

          return {
            ...prevState,
            phase: 'roundEnd',
            player1: { ...prevState.player1, roundsWon: newPlayer1RoundsWon, score: newPlayer1Score },
            player2: { ...prevState.player2, roundsWon: newPlayer2RoundsWon, score: newPlayer2Score },
            rounds: updatedRounds,
          };
        } else {
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          
          console.log(`${currentPlayerId} called invalid word: ${round.currentWord}`);
          
          const winnerId = isPlayer1 ? 'player2' : 'player1';
          const loserId = currentPlayerId;
          const newPlayer1RoundsWon = winnerId === 'player1' ? prevState.player1.roundsWon + 1 : prevState.player1.roundsWon;
          const newPlayer2RoundsWon = winnerId === 'player2' ? prevState.player2.roundsWon + 1 : prevState.player2.roundsWon;
          const newPlayer1Score = winnerId === 'player1' ? prevState.player1.score + wordPoints : prevState.player1.score;
          const newPlayer2Score = winnerId === 'player2' ? prevState.player2.score + wordPoints : prevState.player2.score;

          const updatedRounds = [...prevState.rounds];
          updatedRounds[prevState.currentRound - 1] = {
            ...round,
            loser: loserId,
            reason: 'invalid',
          };

          return {
            ...prevState,
            phase: 'roundEnd',
            player1: { ...prevState.player1, roundsWon: newPlayer1RoundsWon, score: newPlayer1Score },
            player2: { ...prevState.player2, roundsWon: newPlayer2RoundsWon, score: newPlayer2Score },
            rounds: updatedRounds,
          };
        }
      });
    } catch (error) {
      console.error('[CallWord] Validation error:', error);
      // Fall back to local validation on error
      const localResult = isValidWord(currentRound.currentWord);
      console.log(`[CallWord] Fallback to local validation: ${localResult}`);
      
      setGameState(prevState => {
        if (!prevState) return null;
        const round = prevState.rounds[prevState.currentRound - 1];
        
        const fallbackWordPoints = round.currentWord.split('').reduce((sum, letter) => {
            return sum + (POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER] || 0);
          }, 0);

          if (localResult) {
          const winnerId = currentPlayerId;
          const loserId = isPlayer1 ? 'player2' : 'player1';
          const newPlayer1RoundsWon = winnerId === 'player1' ? prevState.player1.roundsWon + 1 : prevState.player1.roundsWon;
          const newPlayer2RoundsWon = winnerId === 'player2' ? prevState.player2.roundsWon + 1 : prevState.player2.roundsWon;
          const newPlayer1Score = winnerId === 'player1' ? prevState.player1.score + fallbackWordPoints : prevState.player1.score;
          const newPlayer2Score = winnerId === 'player2' ? prevState.player2.score + fallbackWordPoints : prevState.player2.score;

          const updatedRounds = [...prevState.rounds];
          updatedRounds[prevState.currentRound - 1] = {
            ...round,
            loser: loserId,
            reason: 'called_word',
          };

          return {
            ...prevState,
            phase: 'roundEnd',
            player1: { ...prevState.player1, roundsWon: newPlayer1RoundsWon, score: newPlayer1Score },
            player2: { ...prevState.player2, roundsWon: newPlayer2RoundsWon, score: newPlayer2Score },
            rounds: updatedRounds,
          };
        } else {
          const winnerId = isPlayer1 ? 'player2' : 'player1';
          const loserId = currentPlayerId;
          const newPlayer1RoundsWon = winnerId === 'player1' ? prevState.player1.roundsWon + 1 : prevState.player1.roundsWon;
          const newPlayer2RoundsWon = winnerId === 'player2' ? prevState.player2.roundsWon + 1 : prevState.player2.roundsWon;
          const newPlayer1Score = winnerId === 'player1' ? prevState.player1.score + fallbackWordPoints : prevState.player1.score;
          const newPlayer2Score = winnerId === 'player2' ? prevState.player2.score + fallbackWordPoints : prevState.player2.score;

          const updatedRounds = [...prevState.rounds];
          updatedRounds[prevState.currentRound - 1] = {
            ...round,
            loser: loserId,
            reason: 'invalid',
          };

          return {
            ...prevState,
            phase: 'roundEnd',
            player1: { ...prevState.player1, roundsWon: newPlayer1RoundsWon, score: newPlayer1Score },
            player2: { ...prevState.player2, roundsWon: newPlayer2RoundsWon, score: newPlayer2Score },
            rounds: updatedRounds,
          };
        }
      });
    } finally {
      validationInProgress.current = false;
      setIsValidating(false);
    }
  }, [gameState]);

  const initiateChallenge = useCallback(() => {
    setGameState(prevState => {
      if (!prevState) return null;

      const currentRound = prevState.rounds[prevState.currentRound - 1];
      if (currentRound.currentWord.length < 3) {
        console.log('Cannot challenge until there are 3 letters on the board');
        return prevState;
      }

      const isPlayer1 = prevState.currentPlayer === 'player1';
      const challengerId = isPlayer1 ? 'player1' : 'player2';
      const challengedId = isPlayer1 ? 'player2' : 'player1';

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      return {
        ...prevState,
        phase: 'challenge',
        challengeState: 'active',
        challengeInput: '',
        currentPlayer: challengedId,
        challengerId,
        originalWordBeforeChallenge: currentRound.currentWord,
      };
    });
  }, []);

  const submitChallengeWord = useCallback(async (word: string) => {
    if (!gameState || gameState.phase !== 'challenge' || validationInProgress.current) return;
    
    const currentRound = gameState.rounds[gameState.currentRound - 1];
    const challengedPlayerId = gameState.currentPlayer;
    const challengerPlayerId = gameState.challengerId || (challengedPlayerId === 'player1' ? 'player2' : 'player1');
    
    const upperWord = word.toUpperCase();
    const originalWord = gameState.originalWordBeforeChallenge || currentRound.currentWord;
    
    console.log('[Challenge] Original word:', originalWord);
    console.log('[Challenge] Submitted word:', upperWord);
    
    // Basic validation first
    if (!upperWord.startsWith(originalWord) || upperWord.length <= originalWord.length || upperWord.length < 4) {
      console.log('[Challenge] Failed basic validation checks');
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      setGameState(prevState => {
        if (!prevState) return null;
        const round = prevState.rounds[prevState.currentRound - 1];
        
        const challengeWordPoints = upperWord.split('').reduce((sum, letter) => {
          return sum + (POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER] || 0);
        }, 0);
        
        const loserId = challengedPlayerId;
        const winnerId = loserId === 'player1' ? 'player2' : 'player1';
        const newPlayer1RoundsWon = loserId === 'player2' ? prevState.player1.roundsWon + 1 : prevState.player1.roundsWon;
        const newPlayer2RoundsWon = loserId === 'player1' ? prevState.player2.roundsWon + 1 : prevState.player2.roundsWon;
        const newPlayer1Score = winnerId === 'player1' ? prevState.player1.score + challengeWordPoints : prevState.player1.score;
        const newPlayer2Score = winnerId === 'player2' ? prevState.player2.score + challengeWordPoints : prevState.player2.score;

        const updatedRounds = [...prevState.rounds];
        updatedRounds[prevState.currentRound - 1] = {
          ...round,
          currentWord: upperWord,
          loser: loserId,
          reason: 'challenge_success',
          challengedPlayerId,
          challengerPlayerId,
          targetWord: upperWord,
        };

        return {
          ...prevState,
          phase: 'roundEnd',
          player1: { ...prevState.player1, roundsWon: newPlayer1RoundsWon, score: newPlayer1Score },
          player2: { ...prevState.player2, roundsWon: newPlayer2RoundsWon, score: newPlayer2Score },
          rounds: updatedRounds,
          challengeState: 'resolved',
          originalWordBeforeChallenge: undefined,
        };
      });
      return;
    }

    validationInProgress.current = true;
    setIsValidating(true);
    
    console.log(`[Challenge] Validating "${upperWord}" with API...`);
    
    try {
      const wordIsValid = await isValidWordAsync(upperWord);
      console.log(`[Challenge] Validation result: ${wordIsValid}`);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          wordIsValid 
            ? Haptics.NotificationFeedbackType.Success 
            : Haptics.NotificationFeedbackType.Error
        );
      }

      setGameState(prevState => {
        if (!prevState) return null;
        const round = prevState.rounds[prevState.currentRound - 1];
        
        const validWordPoints = upperWord.split('').reduce((sum, letter) => {
          return sum + (POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER] || 0);
        }, 0);
        
        const loserId = wordIsValid ? challengerPlayerId : challengedPlayerId;
        const winnerId = loserId === 'player1' ? 'player2' : 'player1';
        const newPlayer1RoundsWon = loserId === 'player2' ? prevState.player1.roundsWon + 1 : prevState.player1.roundsWon;
        const newPlayer2RoundsWon = loserId === 'player1' ? prevState.player2.roundsWon + 1 : prevState.player2.roundsWon;
        const newPlayer1Score = winnerId === 'player1' ? prevState.player1.score + validWordPoints : prevState.player1.score;
        const newPlayer2Score = winnerId === 'player2' ? prevState.player2.score + validWordPoints : prevState.player2.score;

        const updatedRounds = [...prevState.rounds];
        updatedRounds[prevState.currentRound - 1] = {
          ...round,
          currentWord: upperWord,
          loser: loserId,
          reason: wordIsValid ? 'challenge_failed' : 'challenge_success',
          challengedPlayerId,
          challengerPlayerId,
          targetWord: upperWord,
        };

        return {
          ...prevState,
          phase: 'roundEnd',
          player1: { ...prevState.player1, roundsWon: newPlayer1RoundsWon, score: newPlayer1Score },
          player2: { ...prevState.player2, roundsWon: newPlayer2RoundsWon, score: newPlayer2Score },
          rounds: updatedRounds,
          challengeState: 'resolved',
          originalWordBeforeChallenge: undefined,
        };
      });
    } catch (error) {
      console.error('[Challenge] Validation error:', error);
      // Fall back to local validation
      const localResult = isValidWord(upperWord);
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          localResult 
            ? Haptics.NotificationFeedbackType.Success 
            : Haptics.NotificationFeedbackType.Error
        );
      }

      setGameState(prevState => {
        if (!prevState) return null;
        const round = prevState.rounds[prevState.currentRound - 1];
        
        const localWordPoints = upperWord.split('').reduce((sum, letter) => {
          return sum + (POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER] || 0);
        }, 0);
        
        const loserId = localResult ? challengerPlayerId : challengedPlayerId;
        const winnerId = loserId === 'player1' ? 'player2' : 'player1';
        const newPlayer1RoundsWon = loserId === 'player2' ? prevState.player1.roundsWon + 1 : prevState.player1.roundsWon;
        const newPlayer2RoundsWon = loserId === 'player1' ? prevState.player2.roundsWon + 1 : prevState.player2.roundsWon;
        const newPlayer1Score = winnerId === 'player1' ? prevState.player1.score + localWordPoints : prevState.player1.score;
        const newPlayer2Score = winnerId === 'player2' ? prevState.player2.score + localWordPoints : prevState.player2.score;

        const updatedRounds = [...prevState.rounds];
        updatedRounds[prevState.currentRound - 1] = {
          ...round,
          currentWord: upperWord,
          loser: loserId,
          reason: localResult ? 'challenge_failed' : 'challenge_success',
          challengedPlayerId,
          challengerPlayerId,
          targetWord: upperWord,
        };

        return {
          ...prevState,
          phase: 'roundEnd',
          player1: { ...prevState.player1, roundsWon: newPlayer1RoundsWon, score: newPlayer1Score },
          player2: { ...prevState.player2, roundsWon: newPlayer2RoundsWon, score: newPlayer2Score },
          rounds: updatedRounds,
          challengeState: 'resolved',
          originalWordBeforeChallenge: undefined,
        };
      });
    } finally {
      validationInProgress.current = false;
      setIsValidating(false);
    }
  }, [gameState]);



  const initiateBomb = useCallback((bombedLetter: string) => {
    setGameState(prevState => {
      if (!prevState) return null;
      
      const isPlayer1 = prevState.currentPlayer === 'player1';
      const currentPlayerId = isPlayer1 ? 'player1' : 'player2';
      
      console.log(`[Letter Bomb] ${currentPlayerId} initiated bomb on letter: ${bombedLetter}`);
      
      return {
        ...prevState,
        letterBombPending: true,
        letterBombedLetter: bombedLetter,
        letterBombedBy: currentPlayerId,
      };
    });
    
    setLetterBombActive(true);
  }, []);

  const useLetterBomb = useCallback((newLetter: string) => {
    setGameState(prevState => {
      if (!prevState) return null;

      const currentRound = prevState.rounds[prevState.currentRound - 1];
      
      if (currentRound.wordHistory.length <= 1) {
        console.log('Cannot use letter bomb - no opponent letters to remove');
        return prevState;
      }

      const isPlayer1 = prevState.currentPlayer === 'player1';
      const currentPlayerId = isPlayer1 ? 'player1' : 'player2';
      const bombedLetter = prevState.letterBombedLetter;

      if (!bombedLetter) {
        console.log('No bombed letter set');
        return prevState;
      }

      if (newLetter.toUpperCase() === bombedLetter) {
        console.log('Cannot replace with the same letter that was bombed');
        return prevState;
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const newHistory = [
        ...currentRound.wordHistory.slice(0, -1),
        {
          letter: newLetter.toUpperCase(),
          playerId: currentPlayerId,
        },
      ];

      const newWord = newHistory.map(h => h.letter).join('');

      const updatedRound = {
        ...currentRound,
        currentWord: newWord,
        wordHistory: newHistory,
      };

      const updatedRounds = [...prevState.rounds];
      updatedRounds[prevState.currentRound - 1] = updatedRound;

      const nextPlayer = isPlayer1 ? 'player2' : 'player1';

      console.log(`[Letter Bomb] ${currentPlayerId} replaced ${bombedLetter} with ${newLetter.toUpperCase()}, switching to ${nextPlayer}`);
      setLastLetterBombUsedBy(currentPlayerId);

      return {
        ...prevState,
        currentPlayer: nextPlayer,
        rounds: updatedRounds,
        letterBombPending: false,
        letterBombedLetter: undefined,
        letterBombedBy: undefined,
      };
    });

    setLetterBombActive(false);
    setTimeLeft(GAME_CONFIG.TIME_PER_TURN);
  }, []);

  const activateLetterBomb = useCallback(() => {
    setGameState(prevState => {
      if (!prevState) return null;
      
      const currentRound = prevState.rounds[prevState.currentRound - 1];
      if (currentRound.wordHistory.length <= 1) return prevState;
      
      const lastMove = currentRound.wordHistory[currentRound.wordHistory.length - 1];
      const bombedLetter = lastMove.letter;
      const isPlayer1 = prevState.currentPlayer === 'player1';
      const currentPlayerId = isPlayer1 ? 'player1' : 'player2';
      
      console.log(`[Letter Bomb] Activating bomb - letter to bomb: ${bombedLetter}, bomber: ${currentPlayerId}`);
      
      return {
        ...prevState,
        letterBombPending: true,
        letterBombedLetter: bombedLetter,
        letterBombedBy: currentPlayerId,
      };
    });
    
    setLetterBombActive(true);
  }, []);

  const cancelLetterBomb = useCallback(() => {
    setGameState(prevState => {
      if (!prevState) return null;
      return {
        ...prevState,
        letterBombPending: false,
        letterBombedLetter: undefined,
        letterBombedBy: undefined,
      };
    });
    setLetterBombActive(false);
  }, []);

  useEffect(() => {
    if (!gameState || isAIThinking) return;

    if (gameState.mode === 'ai' && gameState.currentPlayer === 'player2') {
      if (gameState.phase === 'playing') {
        setIsAIThinking(true);
        const currentRound = gameState.rounds[gameState.currentRound - 1];
        
        setTimeout(() => {
          try {
            console.log('[AI Turn] Current word:', currentRound.currentWord);
            
            const shouldChallenge = shouldAIChallenge(currentRound.currentWord, aiDifficulty);
            
            if (shouldChallenge && currentRound.currentWord.length >= 3) {
              console.log('[AI] 🚨 AI is challenging the current word!');
              initiateChallenge();
              setIsAIThinking(false);
              return;
            }
            
            if (aiDifficulty === 'superior' && currentRound.wordHistory.length > 2) {
              const shouldUseBomb = Math.random() < 0.45;
              if (shouldUseBomb) {
                const lastMove = currentRound.wordHistory[currentRound.wordHistory.length - 1];
                if (lastMove.playerId === 'player1') {
                  console.log('[AI] 💣 AI is using a LETTER BOMB!');
                  const aiLetter = findBestLetter(currentRound.currentWord.slice(0, -1), aiDifficulty);
                  console.log('[AI] Selected replacement letter:', aiLetter);
                  useLetterBomb(aiLetter);
                  setIsAIThinking(false);
                  return;
                }
              }
            }
            
            console.log('[AI] Finding best letter for:', currentRound.currentWord);
            const aiLetter = findBestLetter(currentRound.currentWord, aiDifficulty);
            console.log('[AI] Selected letter:', aiLetter);
            
            if (!aiLetter || typeof aiLetter !== 'string' || aiLetter.length !== 1) {
              console.error('[AI] Invalid letter returned:', aiLetter);
              throw new Error('Invalid AI letter');
            }
            
            playLetter(aiLetter);
            setIsAIThinking(false);
          } catch (error) {
            console.error('[AI] Error during AI turn:', error);
            setIsAIThinking(false);
            const randomLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
            console.log('[AI] Using fallback random letter:', randomLetter);
            playLetter(randomLetter);
          }
        }, 1500);
      } else if (gameState.phase === 'challenge') {
        setIsAIThinking(true);
        const currentRound = gameState.rounds[gameState.currentRound - 1];
        
        setTimeout(() => {
          console.log('[AI Challenge] Current word:', currentRound.currentWord);
          const possibleWords = getAllWordsStartingWith(currentRound.currentWord);
          console.log('[AI Challenge] Found', possibleWords.length, 'possible words');
          
          if (possibleWords.length > 0) {
            const validWord = possibleWords[Math.floor(Math.random() * Math.min(3, possibleWords.length))];
            console.log('[AI Challenge] Submitting valid word:', validWord);
            submitChallengeWord(validWord);
          } else {
            console.log('[AI Challenge] No valid words found, submitting invalid response');
            const fakeWord = currentRound.currentWord + 'E';
            console.log('[AI Challenge] Submitting:', fakeWord);
            submitChallengeWord(fakeWord);
          }
          setIsAIThinking(false);
        }, 2000);
      }
    }
  }, [gameState, isAIThinking, playLetter, submitChallengeWord, aiDifficulty, initiateChallenge, useLetterBomb]);

  return {
    gameState,
    timeLeft,
    isAIThinking,
    letterBombActive,
    aiDifficulty,
    lastLetterBombUsedBy,
    isValidating,
    startGame,
    playLetter,
    nextRound,
    resetGame,
    callWord,
    initiateChallenge,
    submitChallengeWord,
    useLetterBomb,
    activateLetterBomb,
    cancelLetterBomb,
    setAIDifficulty,
    initiateBomb,
  };
});
