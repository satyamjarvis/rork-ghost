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
import { ArrowLeft, AlertCircle, SkipForward, Bomb } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      
      if (wordChanged && wordGrew) {
        const lastMove = currentGame.word_history?.[currentGame.word_history.length - 1];
        const wasPlayedByMe = lastMove?.playerId === user?.id;
        
        if (!wasPlayedByMe && lastMove?.playerId !== 'system' && !letterBombState.awaitingReplacement) {
          console.log('[GAME] Opponent played a letter, triggering fade-in animation');
          setIsOpponentMove(true);
          setAnimatingIndex(currentGame.current_word.length - 1);
          opponentLetterFadeAnim.setValue(0);
          
          Animated.sequence([
            Animated.timing(opponentLetterFadeAnim, {
              toValue: 0.1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(opponentLetterFadeAnim, {
              toValue: 1,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setAnimatingIndex(-1);
            setIsOpponentMove(false);
          });
        } else if (wasPlayedByMe) {
          setAnimatingIndex(currentGame.current_word.length - 1);
          newLetterAnim.setValue(0);
          
          Animated.sequence([
            Animated.timing(newLetterAnim, {
              toValue: 0.5,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.spring(newLetterAnim, {
              toValue: 1,
              useNativeDriver: true,
              friction: 6,
              tension: 40,
            }),
          ]).start(() => {
            setAnimatingIndex(-1);
          });
        }
      }
      
      setDisplayedWord(currentGame.current_word);
      previousTurnRef.current = currentGame.current_turn;
      previousWordRef.current = currentGame.current_word;
    }
  }, [currentGame, user?.id, letterBombState.awaitingReplacement, newLetterAnim, opponentLetterFadeAnim]);

  const calculateWordPoints = useCallback((word: string): number => {
    return word.split('').reduce((sum, letter) => {
      return sum + (POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER] || 0);
    }, 0);
  }, []);

  const startFallingLettersAnimation = useCallback((isPlayer1Winner: boolean, letters: { letter: string; points: number }[]) => {
    console.log('[FALLING] startFallingLettersAnimation called', { isPlayer1Winner, letterCount: letters.length, wordBoardPosition });
    
    if (!wordBoardPosition) {
      console.log('[FALLING] No word board position, skipping falling animation');
      letters.forEach((letterData) => {
        if (isPlayer1Winner) {
          setPlayer1Points(prev => prev + letterData.points);
        } else {
          setPlayer2Points(prev => prev + letterData.points);
        }
      });
      
      setTimeout(() => {
        Animated.sequence([
          Animated.delay(1500),
          Animated.timing(announcementOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setRoundWinnerAnnouncement(null);
        });
      }, 0);
      return;
    }

    const tileWidth = getLetterTileWidth();
    const totalWidth = letters.length * (tileWidth + 8);
    const startXBase = wordBoardPosition.x - totalWidth / 2;

    letters.forEach((letterData, index) => {
      const delay = index * 150;
      const fallAnim = new Animated.Value(0);
      const startX = startXBase + index * (tileWidth + 8) + tileWidth / 2;
      const startY = wordBoardPosition.y;

      const fallingLetter: FallingLetter = {
        id: `falling-${Date.now()}-${index}`,
        letter: letterData.letter,
        index,
        points: letterData.points,
        fallAnim,
        startX,
        startY,
        randomXOffset: (Math.random() - 0.5) * 60,
        randomRotation: (Math.random() - 0.5) * 60,
      };

      setTimeout(() => {
        console.log('[FALLING] Adding falling letter:', { letter: letterData.letter, index, id: fallingLetter.id });
        setFallingLetters(prev => {
          console.log('[FALLING] Current fallingLetters count:', prev.length);
          return [...prev, fallingLetter];
        });

        Animated.timing(fallAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          if (isPlayer1Winner) {
            setPlayer1Points(prev => prev + letterData.points);
          } else {
            setPlayer2Points(prev => prev + letterData.points);
          }
          
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }

          setFallingLetters(prev => prev.filter(l => l.id !== fallingLetter.id));
        });
      }, delay);
    });

    const totalAnimationTime = letters.length * 150 + 600 + 500;
    setTimeout(() => {
      Animated.timing(announcementOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setRoundWinnerAnnouncement(null);
      });
    }, totalAnimationTime);
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
        Animated.delay(500),
      ]).start(() => {
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

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const result = await callWord();
    if (result.error) {
      Alert.alert('Error', result.error.message);
    }
  }, [currentGame, user?.id, callWord, letterBombState.awaitingReplacement]);

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

  const getDynamicPointsSize = () => {
    const letterCount = displayedWord.length;
    if (letterCount <= 5) return 10;
    if (letterCount <= 7) return 9;
    return 8;
  };

  const getDynamicShadowScale = () => {
    const letterCount = displayedWord.length;
    if (letterCount <= 5) return 1;
    if (letterCount <= 7) return 0.8;
    return 0.65;
  };

  if (isLoading || !currentGame) {
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

  const isMyTurn = currentGame.current_turn === user?.id || letterBombState.awaitingReplacement;
  const isPlayer1 = currentGame.player1_id === user?.id;
  const myScore = isPlayer1 ? currentGame.player1_rounds_won : currentGame.player2_rounds_won;
  const opponentScore = isPlayer1 ? currentGame.player2_rounds_won : currentGame.player1_rounds_won;
  const myPoints = isPlayer1 ? player1Points : player2Points;
  const opponentPoints = isPlayer1 ? player2Points : player1Points;

  const tileWidth = getLetterTileWidth();
  const fontSize = getDynamicFontSize();
  const pointsSize = getDynamicPointsSize();
  const shadowScale = getDynamicShadowScale();

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

        <SafeAreaView style={styles.safeArea} edges={['top']}>
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

            {letterBombState.awaitingReplacement ? (
              <View style={styles.bombBanner}>
                <Bomb color={COLORS.white} size={18} />
                <Text style={styles.bombBannerText}>
                  Select a replacement letter (not {letterBombState.bombedLetter})
                </Text>
              </View>
            ) : !isMyTurn ? (
              <View style={styles.waitingBanner}>
                <Text style={styles.waitingText}>Waiting for opponent...</Text>
              </View>
            ) : null}

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
                {displayedWord.split('').map((letter, index) => {
                  const isAnimating = index === animatingIndex;
                  const isExploding = explodingLetter?.index === index;
                  
                  if (isExploding) {
                    return (
                      <View 
                        key={`letter-${index}`} 
                        style={[styles.wordLetterContainer, { width: tileWidth, marginHorizontal: 4 }]}
                      />
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
                          { 
                            width: tileWidth, 
                            marginHorizontal: 4,
                          },
                        ]}
                      >
                        <Animated.View style={[styles.wordLetter, { opacity: opponentLetterFadeAnim }]}>
                          <Animated.View 
                            style={[
                              styles.ghostlyGlow,
                              { opacity: glowOpacity }
                            ]} 
                          />
                          <Text style={[styles.wordLetterText, { fontSize, lineHeight: fontSize * 1.1 }]}>{letter}</Text>
                          <Text style={[styles.wordLetterPoints, { fontSize: pointsSize }]}>
                            {POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER]}
                          </Text>
                          <View style={[
                            styles.wordLetterShadow, 
                            { transform: [{ scaleX: 1.3 * shadowScale }, { scaleY: 0.6 * shadowScale }] }
                          ]} />
                        </Animated.View>
                      </Animated.View>
                    );
                  }
                  
                  if (isAnimating && !isOpponentMove) {
                    const animScale = newLetterAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.8, 1.15, 1],
                    });
                    const translateY = newLetterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    });
                    const opacity = newLetterAnim.interpolate({
                      inputRange: [0, 0.3, 1],
                      outputRange: [0, 1, 1],
                    });
                    
                    return (
                      <Animated.View
                        key={`letter-${index}`}
                        style={[
                          styles.wordLetterContainer,
                          { 
                            width: tileWidth, 
                            marginHorizontal: 4,
                            transform: [{ scale: animScale }, { translateY }], 
                            opacity 
                          },
                        ]}
                      >
                        <View style={styles.wordLetter}>
                          <Text style={[styles.wordLetterText, { fontSize, lineHeight: fontSize * 1.1 }]}>{letter}</Text>
                          <Text style={[styles.wordLetterPoints, { fontSize: pointsSize }]}>
                            {POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER]}
                          </Text>
                          <View style={[
                            styles.wordLetterShadow, 
                            { transform: [{ scaleX: 1.3 * shadowScale }, { scaleY: 0.6 * shadowScale }] }
                          ]} />
                        </View>
                      </Animated.View>
                    );
                  }
                  
                  return (
                    <View 
                      key={`letter-${index}`} 
                      style={[styles.wordLetterContainer, { width: tileWidth, marginHorizontal: 4 }]}
                    >
                      <View style={styles.wordLetter}>
                        <Text style={[styles.wordLetterText, { fontSize, lineHeight: fontSize * 1.1 }]}>{letter}</Text>
                        <Text style={[styles.wordLetterPoints, { fontSize: pointsSize }]}>
                          {POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER]}
                        </Text>
                        <View style={[
                          styles.wordLetterShadow, 
                          { transform: [{ scaleX: 1.3 * shadowScale }, { scaleY: 0.6 * shadowScale }] }
                        ]} />
                      </View>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.wordValueText}>Word Value: {calculateWordValue()} pts</Text>
            </View>

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

            {isMyTurn && !letterBombState.awaitingReplacement && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.bombButton}
                  onPress={handleLetterBomb}
                  activeOpacity={0.7}
                >
                  <Bomb color={COLORS.white} size={20} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.passButton}
                  onPress={handlePass}
                  activeOpacity={0.7}
                >
                  <SkipForward color={COLORS.white} size={20} />
                  <Text style={styles.passButtonText}>Pass</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.callWordButton, currentGame.current_word.length < 4 && styles.callWordButtonDisabled]}
                  onPress={handleCallWord}
                  activeOpacity={0.7}
                  disabled={currentGame.current_word.length < 4}
                >
                  <AlertCircle color={COLORS.white} size={20} />
                  <Text style={styles.callWordButtonText}>Call Word</Text>
                </TouchableOpacity>
              </View>
            )}
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
      
      {fallingLetters.map((item) => {
        console.log('[FALLING] Rendering falling letter:', item.letter, item.id);
        const targetY = 400;
        
        const translateY = item.fallAnim.interpolate({
          inputRange: [0, 0.3, 0.7, 1],
          outputRange: [0, targetY * 0.2, targetY * 0.6, targetY],
        });
        
        const translateX = item.fallAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, item.randomXOffset],
        });
        
        const opacity = item.fallAnim.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [1, 1, 0],
        });
        
        const scale = item.fallAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 0.8, 0.5],
        });
        
        const rotate = item.fallAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${item.randomRotation}deg`],
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
                  { translateX },
                  { translateY },
                  { scale },
                  { rotate },
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
  },
  headerWrapper: {
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
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
  waitingBanner: {
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.whiteTransparent,
  },
  bombBanner: {
    backgroundColor: 'rgba(255, 100, 100, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.5)',
  },
  bombBannerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  wordDisplayContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 80,
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
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 70,
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  bombButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 100, 100, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.8)',
  },
  passButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.whiteGlass,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  passButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  callWordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  callWordButtonDisabled: {
    opacity: 0.5,
  },
  callWordButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.white,
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
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10000,
  },
  roundWinnerCard: {
    backgroundColor: 'rgba(20, 15, 10, 0.9)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 100, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  roundWinnerLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255, 200, 100, 0.8)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  roundWinnerName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFD700',
    textShadowColor: 'rgba(255, 200, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 4,
  },
  roundWinnerPoints: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.9)',
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
