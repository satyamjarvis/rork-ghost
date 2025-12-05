import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';

import { POINTS_PER_LETTER } from '@/constants/game';
import { COLORS, COLOR_SCHEMES } from '@/constants/colors';
import FloatingGhost from '@/components/FloatingGhost';
import KeyboardGhost from '@/components/KeyboardGhost';
import DanglingG from '@/components/DanglingG';
import { ArrowLeft, AlertCircle, SkipForward, Bomb, Zap } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isValidWord } from '@/utils/game';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface KeyPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ExplodingLetter {
  letter: string;
  index: number;
  anim: Animated.Value;
  rotateAnim: Animated.Value;
  scaleAnim: Animated.Value;
}

interface FloatingLetterData {
  id: string;
  letter: string;
  anim: Animated.Value;
  x: number;
  y: number;
  targetIndex: number;
}

interface FallingLetter {
  id: string;
  letter: string;
  index: number;
  points: number;
  fallAnim: Animated.Value;
  startX: number;
  startY: number;
  randomXOffset: number;
  randomRotation: number;
}

export default function MultiplayerGameScreen() {
  const router = useRouter();
  const { id: gameId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { 
    currentGame, 
    opponentProfile, 
    loadGame, 
    playMove, 
    passTurn, 
    callWord, 
    leaveGame, 
    isLoading,
    letterBombState,
    useLetterBomb: triggerLetterBomb,
    playBombReplacement,
    cancelLetterBomb,
  } = useMultiplayer();

  console.log("MULTIPLAYER GAME RENDER", { isLoading, currentGame: currentGame ? { id: currentGame.id, status: currentGame.status, current_word: currentGame.current_word } : null, currentUser: user?.id, gameId });
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [displayedWord, setDisplayedWord] = useState<string>('');
  const [animatingIndex, setAnimatingIndex] = useState<number>(-1);
  const [isOpponentMove, setIsOpponentMove] = useState<boolean>(false);
  const newLetterAnim = useRef(new Animated.Value(0)).current;
  const opponentLetterFadeAnim = useRef(new Animated.Value(0)).current;
  const wordBoardRef = useRef<View | null>(null);
  const [wordBoardPosition, setWordBoardPosition] = useState<{ x: number; y: number } | null>(null);
  
  const [floatingLetters, setFloatingLetters] = useState<FloatingLetterData[]>([]);
  const [keyPositions, setKeyPositions] = useState<Record<string, KeyPosition>>({});
  const keyRefs = useRef<Record<string, View | null>>({});
  
  const [explodingLetter, setExplodingLetter] = useState<ExplodingLetter | null>(null);
  const [ghostTargetPosition, setGhostTargetPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showKeyboardGhost, setShowKeyboardGhost] = useState(false);
  
  const [player1Points, setPlayer1Points] = useState<number>(0);
  const [player2Points, setPlayer2Points] = useState<number>(0);
  
  const [roundWinnerAnnouncement, setRoundWinnerAnnouncement] = useState<{ winner: string; points: number } | null>(null);
  const announcementOpacity = useRef(new Animated.Value(0)).current;
  
  const [fallingLetters, setFallingLetters] = useState<FallingLetter[]>([]);
  const player1ScoreRef = useRef<View | null>(null);
  const player2ScoreRef = useRef<View | null>(null);
  
  const previousRoundRef = useRef<number>(1);
  const previousRoundsWonRef = useRef<{ player1: number; player2: number }>({ player1: 0, player2: 0 });
  
  const previousTurnRef = useRef<string | null>(null);
  const previousWordRef = useRef<string>('');
  const [challengeState, setChallengeState] = useState<{ active: boolean; challengerId: string | null; originalWord: string }>({ active: false, challengerId: null, originalWord: '' });

  useEffect(() => {
    if (gameId) {
      loadGame(gameId);
    }

    return () => {
      leaveGame();
    };
  }, [gameId, loadGame, leaveGame]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();


  }, [fadeAnim]);

  useEffect(() => {
    if (currentGame) {
      const wordChanged = currentGame.current_word !== previousWordRef.current;
      const wordGrew = currentGame.current_word.length > previousWordRef.current.length;
      
      if (wordChanged && wordGrew && currentGame.current_word.length > displayedWord.length) {
        const lastMove = currentGame.word_history?.[currentGame.word_history.length - 1];
        const wasPlayedByMe = lastMove?.playerId === user?.id;
        
        const newIndex = currentGame.current_word.length - 1;
        setAnimatingIndex(newIndex);
        
        if (!wasPlayedByMe && lastMove?.playerId !== 'system' && !letterBombState.awaitingReplacement) {
          console.log('[GAME] Opponent played a letter, triggering fade-in animation');
          setIsOpponentMove(true);
          opponentLetterFadeAnim.setValue(0);
          
          Animated.timing(opponentLetterFadeAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }).start(() => {
            setDisplayedWord(currentGame.current_word);
            setAnimatingIndex(-1);
            setIsOpponentMove(false);
          });
        } else if (wasPlayedByMe || lastMove?.playerId === 'system') {
          newLetterAnim.setValue(0);
          
          Animated.timing(newLetterAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }).start(() => {
            setDisplayedWord(currentGame.current_word);
            setAnimatingIndex(-1);
          });
        }
      } else if (wordChanged && currentGame.current_word.length < displayedWord.length) {
        setDisplayedWord(currentGame.current_word);
        setAnimatingIndex(-1);
      } else if (!wordChanged && displayedWord !== currentGame.current_word) {
        setDisplayedWord(currentGame.current_word);
      }
      
      previousTurnRef.current = currentGame.current_turn;
      previousWordRef.current = currentGame.current_word;
    }
  }, [currentGame, user?.id, letterBombState.awaitingReplacement, newLetterAnim, opponentLetterFadeAnim, displayedWord]);

  const calculateWordPoints = useCallback((word: string): number => {
    return word.split('').reduce((sum, letter) => {
      return sum + (POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER] || 0);
    }, 0);
  }, []);

  const startFallingLettersAnimation = useCallback((isPlayer1Winner: boolean, letters: { letter: string; points: number }[]) => {
    console.log('[FALLING] startFallingLettersAnimation called', { isPlayer1Winner, letterCount: letters.length, wordBoardPosition });
    
    if (!wordBoardPosition || letters.length === 0) {
      console.log('[FALLING] No word board position or no letters, skipping animation');
      letters.forEach((letterData) => {
        if (isPlayer1Winner) {
          setPlayer1Points(prev => prev + letterData.points);
        } else {
          setPlayer2Points(prev => prev + letterData.points);
        }
      });
      
      setTimeout(() => {
        Animated.timing(announcementOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setRoundWinnerAnnouncement(null);
        });
      }, 1500);
      return;
    }

    // Step 1: Just animate the FIRST letter falling 200px down
    const firstLetter = letters[0];
    const fallAnim = new Animated.Value(0);
    const tileWidth = getLetterTileWidth();
    const totalWidth = letters.length * (tileWidth + 8);
    const startXBase = wordBoardPosition.x - totalWidth / 2;
    const startX = startXBase + tileWidth / 2;
    const startY = wordBoardPosition.y;

    const fallingLetter: FallingLetter = {
      id: `falling-${Date.now()}-0`,
      letter: firstLetter.letter,
      index: 0,
      points: firstLetter.points,
      fallAnim,
      startX,
      startY,
      randomXOffset: 0,
      randomRotation: 0,
    };

    // Wait 1 second after announcement, then animate
    setTimeout(() => {
      console.log('[FALLING] Starting first letter animation:', fallingLetter.letter);
      setFallingLetters([fallingLetter]);

      Animated.timing(fallAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        console.log('[FALLING] First letter animation complete');
        // Add all points at once for now
        letters.forEach((letterData) => {
          if (isPlayer1Winner) {
            setPlayer1Points(prev => prev + letterData.points);
          } else {
            setPlayer2Points(prev => prev + letterData.points);
          }
        });
        
        setFallingLetters([]);
        
        // Fade out announcement
        setTimeout(() => {
          Animated.timing(announcementOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setRoundWinnerAnnouncement(null);
          });
        }, 500);
      });
    }, 1000);
  }, [wordBoardPosition, announcementOpacity]);

  useEffect(() => {
    if (!currentGame) return;
    
    const isPlayer1 = currentGame.player1_id === user?.id;
    const player1RoundsWon = currentGame.player1_rounds_won;
    const player2RoundsWon = currentGame.player2_rounds_won;
    
    const player1WonRound = player1RoundsWon > previousRoundsWonRef.current.player1;
    const player2WonRound = player2RoundsWon > previousRoundsWonRef.current.player2;
    
    if (player1WonRound || player2WonRound) {
      const wordPoints = calculateWordPoints(previousWordRef.current);
      console.log(`[GAME] Round ended! Word "${previousWordRef.current}" worth ${wordPoints} points`);
      console.log('[GAME] Round winner detection:', { player1WonRound, player2WonRound, previousWord: previousWordRef.current });
      
      let winnerName = '';
      const isPlayer1Winner = player1WonRound;
      
      if (player1WonRound) {
        winnerName = isPlayer1 ? 'You' : (opponentProfile?.username || 'Opponent');
      } else if (player2WonRound) {
        winnerName = !isPlayer1 ? 'You' : (opponentProfile?.username || 'Opponent');
      }
      
      const letters = previousWordRef.current.split('').map(letter => ({
        letter,
        points: POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER] || 0,
      }));
      
      setRoundWinnerAnnouncement({ winner: winnerName, points: wordPoints });
      announcementOpacity.setValue(0);

      Animated.sequence([
        Animated.timing(announcementOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(announcementOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setRoundWinnerAnnouncement(null);
        console.log('[GAME] Announcement animation complete, starting falling letters');
        startFallingLettersAnimation(isPlayer1Winner, letters);
      });
    }
    
    previousRoundsWonRef.current = { player1: player1RoundsWon, player2: player2RoundsWon };
    previousRoundRef.current = currentGame.current_round;
  }, [currentGame?.player1_rounds_won, currentGame?.player2_rounds_won, currentGame?.current_round, user?.id, opponentProfile, calculateWordPoints, currentGame?.player1_id, announcementOpacity, startFallingLettersAnimation]);

  useEffect(() => {
    if (currentGame?.status === 'completed') {
      const didWin = currentGame.winner_id === user?.id;
      const isPlayer1 = currentGame.player1_id === user?.id;
      const myPoints = isPlayer1 ? player1Points : player2Points;
      const opponentPoints = isPlayer1 ? player2Points : player1Points;
      Alert.alert(
        didWin ? 'You Won!' : 'You Lost',
        `Final Score: ${currentGame.player1_rounds_won} - ${currentGame.player2_rounds_won}\nPoints: ${myPoints} - ${opponentPoints}`,
        [{ text: 'OK', onPress: () => router.replace('/multiplayer') }]
      );
    }
  }, [currentGame?.status, currentGame?.winner_id, currentGame?.player1_rounds_won, currentGame?.player2_rounds_won, currentGame?.player1_id, user?.id, router, player1Points, player2Points]);

  useEffect(() => {
    if (!letterBombState.isActive && showKeyboardGhost) {
      setShowKeyboardGhost(false);
    }
  }, [letterBombState.isActive, showKeyboardGhost]);

  const measureKeyPosition = useCallback((letter: string) => {
    const keyRef = keyRefs.current[letter];
    if (keyRef) {
      keyRef.measureInWindow((x, y, width, height) => {
        setKeyPositions(prev => ({
          ...prev,
          [letter]: { x, y, width, height },
        }));
      });
    }
  }, []);

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (letterBombState.awaitingReplacement) {
      cancelLetterBomb();
    }
    leaveGame();
    router.back();
  };

  const handleLetterPress = useCallback(async (letter: string, event: any) => {
    if (!currentGame) return;
    
    const isMyTurn = currentGame.current_turn === user?.id;
    if (!isMyTurn && !letterBombState.awaitingReplacement) return;
    
    if (letterBombState.awaitingReplacement && letter === letterBombState.bombedLetter) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Blocked!', 'You cannot select the same letter that was just bombed!');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }


    const nativeEvent = event?.nativeEvent;
    if (nativeEvent && wordBoardPosition) {
      const { pageX, pageY } = nativeEvent;
      const id = `${letter}-${Date.now()}`;
      const anim = new Animated.Value(0);
      const targetIndex = letterBombState.awaitingReplacement 
        ? letterBombState.bombedIndex 
        : (currentGame?.current_word?.length || 0);
      
      setFloatingLetters(prev => [...prev, { id, letter, anim, x: pageX, y: pageY, targetIndex }]);

      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setFloatingLetters(prev => prev.filter(l => l.id !== id));
      });
    }

    if (letterBombState.awaitingReplacement) {
      const result = await playBombReplacement(letter);
      if (result.error) {
        Alert.alert('Error', result.error.message);
      }
    } else {
      const result = await playMove(letter);
      if (result.error) {
        Alert.alert('Error', result.error.message);
      }
    }
  }, [currentGame, user?.id, wordBoardPosition, playMove, letterBombState, playBombReplacement]);

  const handlePass = useCallback(async () => {
    if (!currentGame || currentGame.current_turn !== user?.id) return;
    if (letterBombState.awaitingReplacement) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      'Pass Turn',
      'Are you sure you want to pass? If both players pass, the game ends.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Pass', 
          onPress: async () => {
            const result = await passTurn();
            if (result.error) {
              Alert.alert('Error', result.error.message);
            }
          }
        },
      ]
    );
  }, [currentGame, user?.id, passTurn, letterBombState.awaitingReplacement]);

  const handleCallWord = useCallback(async () => {
    if (!currentGame || currentGame.current_turn !== user?.id) return;
    if (currentGame.current_word.length < 4) return;
    if (letterBombState.awaitingReplacement) return;
    if (challengeState.active) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const result = await callWord();
    if (result.error) {
      Alert.alert('Error', result.error.message);
    }
  }, [currentGame, user?.id, callWord, letterBombState.awaitingReplacement, challengeState.active]);

  const handleChallenge = useCallback(() => {
    if (!currentGame || currentGame.current_turn !== user?.id) return;
    if (currentGame.current_word.length < 3) return;
    if (letterBombState.awaitingReplacement) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    console.log('[MP] Initiating challenge');
    setChallengeState({
      active: true,
      challengerId: user.id,
      originalWord: currentGame.current_word,
    });
  }, [currentGame, user?.id, letterBombState.awaitingReplacement]);

  const handleConfirmChallenge = useCallback(async () => {
    if (!currentGame || !challengeState.active) return;
    
    const word = currentGame.current_word;
    console.log('[MP] Confirming challenge with word:', word);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (word.length < 4) {
      Alert.alert('Invalid', 'Word must be at least 4 letters');
      return;
    }

    if (!word.startsWith(challengeState.originalWord)) {
      Alert.alert('Invalid', 'Word must start with the original letters');
      return;
    }

    const wordIsValid = isValidWord(word);
    
    if (wordIsValid) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Success!', `"${word}" is a valid word! Challenger loses the round.`);
    } else {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Failed!', `"${word}" is not a valid word. You lose the round.`);
    }

    setChallengeState({ active: false, challengerId: null, originalWord: '' });
    
    const result = await callWord();
    if (result.error) {
      Alert.alert('Error', result.error.message);
    }
  }, [currentGame, challengeState, callWord]);

  const handleLetterBomb = useCallback(async () => {
    if (!currentGame || currentGame.current_turn !== user?.id) return;
    if (currentGame.current_word.length < 2) {
      Alert.alert('Cannot Use', 'The word must have at least 2 letters to use Letter Bomb.');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    const lastLetter = currentGame.current_word[currentGame.current_word.length - 1];
    const lastIndex = currentGame.current_word.length - 1;
    
    const explodeAnim = new Animated.Value(0);
    const rotateAnim = new Animated.Value(0);
    const scaleAnim = new Animated.Value(1);
    
    setExplodingLetter({
      letter: lastLetter,
      index: lastIndex,
      anim: explodeAnim,
      rotateAnim,
      scaleAnim,
    });

    Animated.parallel([
      Animated.timing(explodeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.5,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    ]).start(async () => {
      setExplodingLetter(null);
      
      const result = await triggerLetterBomb();
      if (result.error) {
        Alert.alert('Error', result.error.message);
        return;
      }
      
      if (result.bombedLetter) {
        measureKeyPosition(result.bombedLetter);
        setTimeout(() => {
          const keyPos = keyPositions[result.bombedLetter as string];
          if (keyPos) {
            setGhostTargetPosition({
              x: keyPos.x + keyPos.width / 2,
              y: keyPos.y,
            });
          } else {
            const keyRef = keyRefs.current[result.bombedLetter as string];
            if (keyRef) {
              keyRef.measureInWindow((x, y, width) => {
                setGhostTargetPosition({
                  x: x + width / 2,
                  y: y,
                });
              });
            }
          }
          setShowKeyboardGhost(true);
        }, 100);
      }
    });
  }, [currentGame, user?.id, triggerLetterBomb, measureKeyPosition, keyPositions]);

  const handleGhostArrived = useCallback(() => {
    console.log('[GAME] Ghost has arrived on bombed letter');
  }, []);

  const keyboardRows = [
    'ABCDEFG'.split(''),
    'HIJKLM'.split(''),
    'NOPQRST'.split(''),
    'UVWXYZ'.split(''),
  ];

  const calculateWordValue = () => {
    if (!currentGame) return 0;
    return displayedWord.split('').reduce((sum, letter) => {
      return sum + (POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER] || 0);
    }, 0);
  };

  const getLetterTileWidth = () => {
    const letterCount = displayedWord.length || 1;
    const containerWidth = SCREEN_WIDTH * 0.95;
    const margin = 4 * 2;
    const maxTileWidth = 70;
    const calculatedWidth = (containerWidth / letterCount) - margin;
    return Math.min(calculatedWidth, maxTileWidth);
  };

  const getDynamicFontSize = () => {
    const letterCount = displayedWord.length;
    if (letterCount <= 5) return 60;
    if (letterCount === 6) return 50;
    if (letterCount === 7) return 42;
    if (letterCount === 8) return 36;
    if (letterCount === 9) return 32;
    return 28;
  };

  if (isLoading || !currentGame) {
    console.log("SHOWING LOADING SCREEN", { isLoading, hasCurrentGame: !!currentGame });
    return (
      <LinearGradient
        colors={[COLOR_SCHEMES.peachy.top, COLOR_SCHEMES.peachy.middle, COLOR_SCHEMES.peachy.bottom]}
        style={styles.loadingContainer}
        locations={[0, 0.5, 1]}
      >
        <ActivityIndicator size="large" color={COLORS.white} />
        <Text style={styles.loadingText}>Loading game...</Text>
      </LinearGradient>
    );
  }

  const isMyTurn = currentGame.current_turn === user?.id || letterBombState.awaitingReplacement || (challengeState.active && challengeState.challengerId !== user?.id);
  const isPlayer1 = currentGame.player1_id === user?.id;

  console.log("SHOWING GAME UI", { currentWord: currentGame?.current_word, isMyTurn, player1_id: currentGame.player1_id, player2_id: currentGame.player2_id, current_turn: currentGame.current_turn });
  const myScore = isPlayer1 ? currentGame.player1_rounds_won : currentGame.player2_rounds_won;
  const opponentScore = isPlayer1 ? currentGame.player2_rounds_won : currentGame.player1_rounds_won;
  const myPoints = isPlayer1 ? player1Points : player2Points;
  const opponentPoints = isPlayer1 ? player2Points : player1Points;

  const fontSize = getDynamicFontSize();

  return (
    <LinearGradient
      colors={[COLOR_SCHEMES.peachy.top, COLOR_SCHEMES.peachy.middle, COLOR_SCHEMES.peachy.bottom]}
      style={styles.outerContainer}
      locations={[0, 0.5, 1]}
    >
      <View style={styles.container}>
        <View style={styles.danglingGWrapper}>
          <DanglingG size={80} />
        </View>
        <FloatingGhost />
        
        <KeyboardGhost 
          visible={showKeyboardGhost && letterBombState.awaitingReplacement}
          targetX={ghostTargetPosition.x}
          targetY={ghostTargetPosition.y}
          onArrived={handleGhostArrived}
        />
        
        {explodingLetter && (
          <Animated.View
            style={[
              styles.explodingLetterContainer,
              {
                transform: [
                  { 
                    translateY: explodingLetter.anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -200],
                    })
                  },
                  {
                    translateX: explodingLetter.anim.interpolate({
                      inputRange: [0, 0.3, 0.6, 1],
                      outputRange: [0, 50, -30, 100],
                    })
                  },
                  {
                    rotate: explodingLetter.rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '720deg'],
                    })
                  },
                  { scale: explodingLetter.scaleAnim },
                ],
                opacity: explodingLetter.anim.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [1, 1, 0],
                }),
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.explosionGlow} />
            <Text style={[styles.explodingLetterText, { fontSize }]}>{explodingLetter.letter}</Text>
            <View style={styles.explosionParticle1} />
            <View style={styles.explosionParticle2} />
            <View style={styles.explosionParticle3} />
          </Animated.View>
        )}
        
        {floatingLetters.map((item) => {
          const targetY = wordBoardPosition ? wordBoardPosition.y - item.y : -400;
          const targetX = wordBoardPosition ? wordBoardPosition.x - item.x : 0;
          
          const translateY = item.anim.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0, targetY * 0.3, targetY],
          });
          const translateX = item.anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, targetX],
          });
          const opacity = item.anim.interpolate({
            inputRange: [0, 0.2, 0.8, 1],
            outputRange: [1, 1, 0.8, 0],
          });
          const scale = item.anim.interpolate({
            inputRange: [0, 0.2, 0.5, 1],
            outputRange: [1, 1.2, 1.1, 0.6],
          });

          return (
            <Animated.View
              key={item.id}
              style={[
                styles.floatingLetter,
                {
                  left: item.x - 30,
                  top: item.y - 30,
                  transform: [{ translateX }, { translateY }, { scale }],
                  opacity,
                },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.floatingLetterText}>{item.letter}</Text>
            </Animated.View>
          );
        })}

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <View style={styles.headerWrapper}>
              <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <ArrowLeft color={COLORS.white} size={24} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                  <Text style={styles.vsText}>vs {opponentProfile?.username || 'Opponent'}</Text>
                  <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>{myScore} - {opponentScore}</Text>
                    <Text style={styles.roundText}>Round {currentGame.current_round}</Text>
                  </View>
                </View>
                <View style={styles.headerRight} />
              </View>
              <View style={styles.playerPointsContainer}>
                <View 
                  style={styles.playerPointsBox}
                  ref={isPlayer1 ? player1ScoreRef : player2ScoreRef}
                >
                  <Text style={styles.playerPointsLabel}>You</Text>
                  <Text style={styles.playerPointsValue}>{myPoints} pts</Text>
                </View>
                <View 
                  style={styles.playerPointsBox}
                  ref={isPlayer1 ? player2ScoreRef : player1ScoreRef}
                >
                  <Text style={styles.playerPointsLabel}>{opponentProfile?.username || 'Opponent'}</Text>
                  <Text style={styles.playerPointsValue}>{opponentPoints} pts</Text>
                </View>
              </View>
            </View>



            <View style={styles.wordDisplayContainer}>
              <View 
                style={styles.wordLettersDisplay}
                ref={wordBoardRef}
                onLayout={() => {
                  wordBoardRef.current?.measureInWindow((x, y, w, height) => {
                    setWordBoardPosition({ x: x + w / 2, y: y + height / 2 });
                  });
                }}
              >
                {(challengeState.active ? currentGame.current_word : currentGame.current_word).split('').map((letter, index) => {
                  const isAnimating = index === animatingIndex && index === displayedWord.length;
                  const isExploding = explodingLetter?.index === index;
                  const letterCount = currentGame.current_word.length;
                  const containerWidth = SCREEN_WIDTH * 0.95 - 40;
                  const scaleFactor = Math.min(1, 70 / (containerWidth / letterCount));
                  
                  const baseFontSize = 60;
                  const basePointsSize = 10;
                  let dynamicFontSize = baseFontSize;
                  let dynamicPointsSize = basePointsSize;
                  
                  if (letterCount > 6) {
                    const reductionFactor = Math.max(0.4, 1 - ((letterCount - 6) * 0.08));
                    dynamicFontSize = baseFontSize * reductionFactor;
                    dynamicPointsSize = basePointsSize * reductionFactor;
                  }
                  
                  const shadowBottomOffset = -4 * scaleFactor;
                  
                  if (isExploding) {
                    return (
                      <View 
                        key={`letter-${index}`} 
                        style={styles.wordLetterContainer}
                      >
                        <View style={styles.wordLetter}>
                          <Text style={[styles.wordLetterText, { opacity: 0, fontSize: dynamicFontSize, lineHeight: dynamicFontSize * 1.13 }]}>{letter}</Text>
                        </View>
                      </View>
                    );
                  }
                  
                  if (isAnimating && isOpponentMove) {
                    const glowOpacity = opponentLetterFadeAnim.interpolate({
                      inputRange: [0, 0.2, 0.5, 1],
                      outputRange: [1, 0.8, 0.4, 0],
                    });
                    
                    return (
                      <Animated.View
                        key={`letter-${index}`}
                        style={[
                          styles.wordLetterContainer,
                          { opacity: opponentLetterFadeAnim },
                        ]}
                      >
                        <View style={styles.wordLetter}>
                          <Animated.View 
                            style={[
                              styles.ghostlyGlow,
                              { opacity: glowOpacity }
                            ]} 
                          />
                          <Text style={[styles.wordLetterText, { fontSize: dynamicFontSize, lineHeight: dynamicFontSize * 1.13 }]}>{letter}</Text>
                          <Text style={[styles.wordLetterPoints, { fontSize: dynamicPointsSize }]}>
                            {POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER]}
                          </Text>
                          <View style={[styles.wordLetterShadow, { bottom: shadowBottomOffset }]} />
                        </View>
                      </Animated.View>
                    );
                  }
                  
                  if (isAnimating && !isOpponentMove) {
                    const opacity = newLetterAnim.interpolate({
                      inputRange: [0, 0.2, 0.5, 0.8, 1],
                      outputRange: [0, 0.1, 0.4, 0.75, 1],
                    });
                    
                    const animScale = newLetterAnim.interpolate({
                      inputRange: [0, 0.3, 0.7, 1],
                      outputRange: [0.95, 0.98, 1.02, 1],
                    });
                    
                    return (
                      <Animated.View
                        key={`letter-${index}`}
                        style={[
                          styles.wordLetterContainer,
                          {
                            opacity,
                            transform: [{ scale: animScale }],
                          },
                        ]}
                      >
                        <View style={styles.wordLetter}>
                          <Text style={[styles.wordLetterText, { fontSize: dynamicFontSize, lineHeight: dynamicFontSize * 1.13 }]}>{letter}</Text>
                          <Text style={[styles.wordLetterPoints, { fontSize: dynamicPointsSize }]}>
                            {POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER]}
                          </Text>
                          <View style={[styles.wordLetterShadow, { bottom: shadowBottomOffset }]} />
                        </View>
                      </Animated.View>
                    );
                  }
                  
                  return (
                    <View 
                      key={`letter-${index}`} 
                      style={styles.wordLetterContainer}
                    >
                      <View style={styles.wordLetter}>
                        <Text style={[styles.wordLetterText, { fontSize: dynamicFontSize, lineHeight: dynamicFontSize * 1.13 }]}>{letter}</Text>
                        <Text style={[styles.wordLetterPoints, { fontSize: dynamicPointsSize }]}>
                          {POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER]}
                        </Text>
                        <View style={[styles.wordLetterShadow, { bottom: shadowBottomOffset }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.wordValueText}>Word Value: {calculateWordValue()} pts</Text>
            </View>

            <View style={styles.keyboardSection}>
              <View style={styles.keyboardContainer}>
                {keyboardRows.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.keyboardRow}>
                    {row.map((letter) => {
                      const isBombedLetter = letterBombState.awaitingReplacement && letter === letterBombState.bombedLetter;
                      const isDisabled = (!isMyTurn && !letterBombState.awaitingReplacement) || isBombedLetter;
                      
                      return (
                        <TouchableOpacity
                          key={letter}
                          ref={(ref) => { keyRefs.current[letter] = ref; }}
                          style={[
                            styles.keyTile, 
                            isDisabled && styles.keyTileDisabled,
                            isBombedLetter && styles.keyTileBombed,
                          ]}
                          onPress={(event) => handleLetterPress(letter, event)}
                          activeOpacity={0.7}
                          disabled={isDisabled}
                        >
                          <Text style={[
                            styles.keyLetter, 
                            isDisabled && styles.keyLetterDisabled,
                            isBombedLetter && styles.keyLetterBombed,
                          ]}>
                            {letter}
                          </Text>
                          <Text style={styles.keyPoints}>
                            {POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.bottomBar}>
              <View style={styles.playerInfo}>
                <View style={styles.playerRow}>
                  <Text style={styles.playerLabel}>You:</Text>
                  <Text style={styles.playerScore}>{myPoints} pts</Text>
                </View>
                <View style={styles.playerRow}>
                  <Text style={styles.playerLabel}>{opponentProfile?.username || 'Opponent'}:</Text>
                  <Text style={styles.playerScore}>{opponentPoints} pts</Text>
                </View>
              </View>

              {isMyTurn && !letterBombState.awaitingReplacement && (
                <View style={styles.actionButtons}>
                  {challengeState.active ? (
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={handleConfirmChallenge}
                      activeOpacity={0.7}
                    >
                      <AlertCircle color={COLORS.white} size={28} />
                      <Text style={styles.iconButtonLabel}>CONFIRM</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={handleLetterBomb}
                        activeOpacity={0.7}
                      >
                        <Bomb color={COLORS.white} size={28} />
                        <Text style={styles.iconButtonLabel}>BOMB</Text>
                      </TouchableOpacity>

                      {currentGame.current_word.length >= 3 && (
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={handleChallenge}
                          activeOpacity={0.7}
                        >
                          <Zap color={COLORS.white} size={28} />
                          <Text style={styles.iconButtonLabel}>CHALLENGE</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={handlePass}
                        activeOpacity={0.7}
                      >
                        <SkipForward color={COLORS.white} size={28} />
                        <Text style={styles.iconButtonLabel}>PASS</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.iconButton, currentGame.current_word.length < 4 && styles.iconButtonDisabled]}
                        onPress={handleCallWord}
                        activeOpacity={0.7}
                        disabled={currentGame.current_word.length < 4}
                      >
                        <AlertCircle color={COLORS.white} size={28} />
                        <Text style={styles.iconButtonLabel}>CALL WORD</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          </Animated.View>
        </SafeAreaView>
        
      </View>
      
      
    {roundWinnerAnnouncement && (
        <Animated.View 
          style={[
            styles.roundWinnerOverlay,
            { opacity: announcementOpacity }
          ]}
          pointerEvents="none"
        >
          <View style={styles.roundWinnerCard}>
            <Text style={styles.roundWinnerLabel}>ROUND WINNER</Text>
            <Text style={styles.roundWinnerName}>{roundWinnerAnnouncement.winner}</Text>
            <Text style={styles.roundWinnerPoints}>+{roundWinnerAnnouncement.points} pts</Text>
          </View>
        </Animated.View>
      )}
      
      {letterBombState.awaitingReplacement && (
        <View style={styles.challengeIndicator} pointerEvents="none">
          <Bomb color={COLORS.white} size={14} />
          <Text style={styles.challengeIndicatorText}>
            Pick letter (not {letterBombState.bombedLetter})
          </Text>
        </View>
      )}

      {challengeState.active && challengeState.challengerId !== user?.id && (
        <View style={styles.challengedIndicator} pointerEvents="none">
          <Text style={styles.challengedIndicatorTitle}>⚠️ CHALLENGED</Text>
          <Text style={styles.challengedIndicatorSubtitle}>Spell a valid word</Text>
        </View>
      )}

      {challengeState.active && challengeState.challengerId === user?.id && (
        <View style={styles.waitingChallengeIndicator} pointerEvents="none">
          <Text style={styles.waitingIndicatorText}>Waiting for opponent...</Text>
        </View>
      )}

      {!isMyTurn && !letterBombState.awaitingReplacement && (
        <View style={styles.waitingIndicator} pointerEvents="none">
          <Text style={styles.waitingIndicatorText}>Opponent&apos;s turn</Text>
        </View>
      )}

      {fallingLetters.map((item) => {
        console.log('[FALLING] Rendering falling letter:', item.letter, item.id);
        
        // Step 1: Simple animation - move straight down 200px, then fade out
        const translateY = item.fallAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 200],
        });
        
        const opacity = item.fallAnim.interpolate({
          inputRange: [0, 0.8, 1],
          outputRange: [1, 1, 0],
        });

        return (
          <Animated.View
            key={item.id}
            style={[
              styles.fallingLetter,
              {
                left: item.startX - 25,
                top: item.startY - 30,
                transform: [
                  { translateY },
                ],
                opacity,
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.fallingLetterTile}>
              <Text style={styles.fallingLetterText}>{item.letter}</Text>
              <Text style={styles.fallingLetterPoints}>{item.points}</Text>
            </View>
          </Animated.View>
        );
      })}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    zIndex: 1,
  },
  danglingGWrapper: {
    zIndex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  headerWrapper: {
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginTop: -80,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  vsText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.gold,
  },
  roundText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
  },
  playerPointsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  playerPointsBox: {
    alignItems: 'center',
  },
  playerPointsLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
    marginBottom: 2,
  },
  playerPointsValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  headerRight: {
    width: 40,
  },
  challengeIndicator: {
    position: 'absolute' as const,
    top: 180,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 80, 80, 0.85)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    zIndex: 8000,
    maxWidth: 160,
  },
  challengeIndicatorText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  waitingIndicator: {
    position: 'absolute' as const,
    top: 180,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    zIndex: 8000,
    maxWidth: 140,
  },
  waitingIndicatorText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
  },
  challengedIndicator: {
    position: 'absolute' as const,
    top: 180,
    left: 20,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: 160,
  },
  challengedIndicatorTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFD700',
    marginBottom: 2,
  },
  challengedIndicatorSubtitle: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  waitingChallengeIndicator: {
    position: 'absolute' as const,
    top: 180,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    zIndex: 8000,
  },
  wordDisplayContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 100,
    height: 100,
    minHeight: 100,
  },
  wordLettersDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    flexWrap: 'nowrap',
    alignItems: 'center',
    width: '95%',
    alignSelf: 'center',
  },
  wordLetterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 70,
    marginHorizontal: 4,
  },
  wordLetter: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    width: '100%',
    aspectRatio: 0.77,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  wordLetterText: {
    fontWeight: '700' as const,
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 0,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  wordLetterPoints: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    fontWeight: '400' as const,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  wordLetterShadow: {
    position: 'absolute' as const,
    bottom: -4,
    width: '50%',
    height: '12%',
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    zIndex: -1,
  },
  ghostlyGlow: {
    position: 'absolute' as const,
    width: '120%',
    height: '120%',
    borderRadius: 50,
    backgroundColor: 'rgba(200, 220, 255, 0.4)',
  },
  wordValueText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
  },
  keyboardSection: {
    position: 'absolute' as const,
    left: 20,
    right: 20,
    bottom: 140,
  },
  keyboardContainer: {
    gap: 10,
    marginBottom: 20,
  },
  keyboardRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  keyTile: {
    width: 45,
    height: 48,
    backgroundColor: COLORS.keyBackground,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.keyBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    position: 'relative' as const,
  },
  keyTileDisabled: {
    opacity: 0.5,
  },
  keyTileBombed: {
    backgroundColor: 'rgba(100, 100, 100, 0.5)',
    borderColor: 'rgba(150, 150, 150, 0.5)',
    opacity: 0.6,
  },
  keyLetter: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  keyLetterDisabled: {
    color: COLORS.whiteTransparent,
  },
  keyLetterBombed: {
    color: 'rgba(200, 200, 200, 0.5)',
  },
  keyPoints: {
    position: 'absolute' as const,
    top: 2,
    right: 4,
    fontSize: 8,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 30,
    paddingTop: 12,
  },
  playerInfo: {
    gap: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  playerScore: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.gold,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  iconButton: {
    alignItems: 'center',
    gap: 4,
  },
  iconButtonLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
  floatingLetter: {
    position: 'absolute' as const,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  floatingLetterText: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 2, height: 4 },
    textShadowRadius: 8,
  },
  explodingLetterContainer: {
    position: 'absolute' as const,
    top: '35%',
    left: '50%',
    marginLeft: -40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5000,
  },
  explodingLetterText: {
    fontWeight: '700' as const,
    color: COLORS.white,
    textShadowColor: 'rgba(255, 100, 50, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  explosionGlow: {
    position: 'absolute' as const,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 150, 50, 0.6)',
  },
  explosionParticle1: {
    position: 'absolute' as const,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 200, 100, 0.8)',
    top: -10,
    left: 10,
  },
  explosionParticle2: {
    position: 'absolute' as const,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 150, 50, 0.8)',
    bottom: 5,
    right: -5,
  },
  explosionParticle3: {
    position: 'absolute' as const,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 100, 50, 0.8)',
    top: 5,
    right: -10,
  },
  roundWinnerOverlay: {
    position: 'absolute' as const,
    top: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  roundWinnerCard: {
    backgroundColor: 'rgba(20, 15, 10, 0.95)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 100, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  roundWinnerLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: 'rgba(255, 200, 100, 0.9)',
    letterSpacing: 1.5,
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  roundWinnerName: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  roundWinnerPoints: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  fallingLetter: {
    position: 'absolute' as const,
    width: 50,
    height: 60,
    zIndex: 9000,
  },
  fallingLetterTile: {
    width: 50,
    height: 60,
    backgroundColor: 'rgba(255, 200, 100, 0.9)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  fallingLetterText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#1a1a1a',
  },
  fallingLetterPoints: {
    position: 'absolute' as const,
    top: 2,
    right: 4,
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#1a1a1a',
  },
});
