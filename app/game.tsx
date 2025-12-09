import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform as RNPlatform, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '@/contexts/GameContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Loader2, Bomb, Zap, AlertCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { POINTS_PER_LETTER } from '@/constants/game';
import { COLORS, COLOR_SCHEMES } from '@/constants/colors';
import FloatingGhost from '@/components/FloatingGhost';
import DanglingG from '@/components/DanglingG';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface FallingLetter {
  id: string;
  letter: string;
  index: number;
  points: number;
  fallAnim: Animated.Value;
  startX: number;
  startY: number;
}

export default function GameScreen() {
  const router = useRouter();
  const { gameState, playLetter, isAIThinking, callWord, initiateChallenge, submitChallengeWord, letterBombActive, activateLetterBomb, useLetterBomb, lastLetterBombUsedBy, isValidating, isProcessingMove, nextRound } = useGame();
  const { inventory, usePowerUp } = usePlayer();
  const fadeAnim = useRef(new Animated.Value(0)).current;


  const [floatingLetters, setFloatingLetters] = useState<{ id: string; letter: string; anim: Animated.Value; x: number; y: number }[]>([]);
  const [explodingParticles, setExplodingParticles] = useState<{ id: string; letter: string; anim: Animated.Value; angle: number; speed: number; spin: number; size: number; x: number; y: number }[]>([]);
  const letterViewRefs = useRef<Map<number, View | null>>(new Map()).current;
  const [hiddenLetterIndex, setHiddenLetterIndex] = useState<number>(-1);
  const wordBoardRef = useRef<View | null>(null);
  const [wordBoardPosition, setWordBoardPosition] = useState<{ x: number; y: number } | null>(null);
  const [explosionLetter, setExplosionLetter] = useState<string>('');
  const explodingLetterRef = useRef<{ x: number; y: number } | null>(null);
  const [showBombIndicator, setShowBombIndicator] = useState<boolean>(false);
  const [bombGhostAnimation, setBombGhostAnimation] = useState<{ active: boolean; targetX: number; targetY: number; isVictim: boolean } | null>(null);
  const [fadedLetter, setFadedLetter] = useState<string | null>(null);
  const letterFadeAnim = useRef(new Animated.Value(1)).current;
  const lastBombUserRef = useRef<string | null>(null);
  const bombGhostTranslateX = useRef(new Animated.Value(-150)).current;
  const bombGhostTranslateY = useRef(new Animated.Value(0)).current;
  const bombGhostOpacity = useRef(new Animated.Value(0)).current;
  const bombFallAnim = useRef(new Animated.Value(0)).current;
  const bombFallOpacity = useRef(new Animated.Value(0)).current;
  const [displayedWord, setDisplayedWord] = useState<string>('');
  const [animatingIndex, setAnimatingIndex] = useState<number>(-1);
  const [isAIAnimating, setIsAIAnimating] = useState<boolean>(false);
  const newLetterAnim = useRef(new Animated.Value(0)).current;
  const [showRoundWinner, setShowRoundWinner] = useState<boolean>(false);
  const [roundWinnerName, setRoundWinnerName] = useState<string>('');
  const [roundWinnerPoints, setRoundWinnerPoints] = useState<number>(0);
  const roundWinnerOpacity = useRef(new Animated.Value(0)).current;
  const processedRoundEndRef = useRef<number>(-1);
  const [fallingLetters, setFallingLetters] = useState<FallingLetter[]>([]);
  const [displayedScoreBonus, setDisplayedScoreBonus] = useState<number>(0);
  const [scoringPlayerId, setScoringPlayerId] = useState<string | null>(null);



  const getLetterPixels = (letter: string): { x: number; y: number }[] => {
    const pixels: { x: number; y: number }[] = [];
    const letterPatterns: Record<string, string[]> = {
      'A': [
        '  ███  ',
        ' █   █ ',
        '█     █',
        '███████',
        '█     █',
        '█     █',
      ],
      'B': [
        '██████ ',
        '█     █',
        '██████ ',
        '█     █',
        '█     █',
        '██████ ',
      ],
      'C': [
        ' █████ ',
        '█     █',
        '█      ',
        '█      ',
        '█     █',
        ' █████ ',
      ],
      'D': [
        '██████ ',
        '█     █',
        '█     █',
        '█     █',
        '█     █',
        '██████ ',
      ],
      'E': [
        '███████',
        '█      ',
        '█████  ',
        '█      ',
        '█      ',
        '███████',
      ],
      'F': [
        '███████',
        '█      ',
        '█████  ',
        '█      ',
        '█      ',
        '█      ',
      ],
      'G': [
        ' █████ ',
        '█     █',
        '█      ',
        '█   ███',
        '█     █',
        ' █████ ',
      ],
      'H': [
        '█     █',
        '█     █',
        '███████',
        '█     █',
        '█     █',
        '█     █',
      ],
      'I': [
        '███████',
        '   █   ',
        '   █   ',
        '   █   ',
        '   █   ',
        '███████',
      ],
      'J': [
        '    ███',
        '      █',
        '      █',
        '      █',
        '█     █',
        ' █████ ',
      ],
      'K': [
        '█     █',
        '█   █  ',
        '█ █    ',
        '██     ',
        '█ █    ',
        '█   █  ',
      ],
      'L': [
        '█      ',
        '█      ',
        '█      ',
        '█      ',
        '█      ',
        '███████',
      ],
      'M': [
        '█     █',
        '██   ██',
        '█ █ █ █',
        '█  █  █',
        '█     █',
        '█     █',
      ],
      'N': [
        '█     █',
        '██    █',
        '█ █   █',
        '█  █  █',
        '█   █ █',
        '█     █',
      ],
      'O': [
        ' █████ ',
        '█     █',
        '█     █',
        '█     █',
        '█     █',
        ' █████ ',
      ],
      'P': [
        '██████ ',
        '█     █',
        '██████ ',
        '█      ',
        '█      ',
        '█      ',
      ],
      'Q': [
        ' █████ ',
        '█     █',
        '█     █',
        '█  █  █',
        '█   █ █',
        ' ████ █',
      ],
      'R': [
        '██████ ',
        '█     █',
        '██████ ',
        '█  █   ',
        '█   █  ',
        '█    █ ',
      ],
      'S': [
        ' █████ ',
        '█     █',
        ' █     ',
        '  ███  ',
        '     █ ',
        '██████ ',
      ],
      'T': [
        '███████',
        '   █   ',
        '   █   ',
        '   █   ',
        '   █   ',
        '   █   ',
      ],
      'U': [
        '█     █',
        '█     █',
        '█     █',
        '█     █',
        '█     █',
        ' █████ ',
      ],
      'V': [
        '█     █',
        '█     █',
        '█     █',
        ' █   █ ',
        '  █ █  ',
        '   █   ',
      ],
      'W': [
        '█     █',
        '█     █',
        '█  █  █',
        '█ █ █ █',
        '██   ██',
        '█     █',
      ],
      'X': [
        '█     █',
        ' █   █ ',
        '  █ █  ',
        '   █   ',
        '  █ █  ',
        '█     █',
      ],
      'Y': [
        '█     █',
        ' █   █ ',
        '  █ █  ',
        '   █   ',
        '   █   ',
        '   █   ',
      ],
      'Z': [
        '███████',
        '     █ ',
        '    █  ',
        '   █   ',
        '  █    ',
        '███████',
      ],
    };

    const pattern = letterPatterns[letter] || letterPatterns['O'];
    const pixelSize = 3;
    
    pattern.forEach((row, rowIndex) => {
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        if (row[colIndex] === '█') {
          pixels.push({
            x: (colIndex - 3.5) * pixelSize,
            y: (rowIndex - 3) * pixelSize,
          });
        }
      }
    });

    return pixels;
  };

  const createExplosion = useCallback(() => {
    if (!explodingLetterRef.current || !explosionLetter) return;

    const { x, y } = explodingLetterRef.current;
    const letterPixels = getLetterPixels(explosionLetter);

    const newParticles = letterPixels.map((pixel, i) => {
      const randomAngleOffset = (Math.random() - 0.5) * 0.5;
      const angle = Math.atan2(pixel.y, pixel.x) + randomAngleOffset;
      const randomSpeed = 1.2 + Math.random() * 0.8;
      const randomSpin = (Math.random() - 0.5) * 1200;
      const randomSize = 4 + Math.random() * 6;
      
      const particleId = `particle-${Date.now()}-${i}`;
      const particleAnim = new Animated.Value(0);

      return {
        id: particleId,
        letter: '▪',
        anim: particleAnim,
        angle,
        speed: randomSpeed,
        spin: randomSpin,
        size: randomSize,
        x: x + pixel.x * 2.5,
        y: y + pixel.y * 2.5,
      };
    });

    setExplodingParticles(newParticles);

    if (RNPlatform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    newParticles.forEach(particle => {
      Animated.timing(particle.anim, {
        toValue: 1,
        duration: 900 + Math.random() * 300,
        useNativeDriver: true,
      }).start(() => {
        setExplodingParticles(prev => prev.filter(p => p.id !== particle.id));
      });
    });

    setTimeout(() => {
      activateLetterBomb();
      setShowBombIndicator(true);
      setExplosionLetter('');
      
      const bombedLetter = gameState?.letterBombedLetter;
      if (bombedLetter) {
        setFadedLetter(bombedLetter);
        letterFadeAnim.setValue(1);
        
        Animated.sequence([
          Animated.timing(letterFadeAnim, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(2000),
          Animated.timing(letterFadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setFadedLetter(null);
        });
      }
    }, 600);
  }, [explosionLetter, activateLetterBomb]);

  const animateBombDrop = useCallback((targetX: number, targetY: number, letter: string, isVictim: boolean) => {
    const startX = -150;
    const startY = targetY - 100;

    bombGhostTranslateX.setValue(startX);
    bombGhostTranslateY.setValue(startY);
    bombGhostOpacity.setValue(0);
    bombFallAnim.setValue(0);
    bombFallOpacity.setValue(0);

    setBombGhostAnimation({ active: true, targetX, targetY, isVictim });

    Animated.sequence([
      Animated.parallel([
        Animated.timing(bombGhostTranslateX, {
          toValue: targetX - 40,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(bombGhostTranslateY, {
          toValue: startY,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(bombGhostOpacity, {
            toValue: 0.8,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay(1000),
          Animated.timing(bombGhostOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.delay(100),
    ]).start(() => {
      const currentRound = gameState?.rounds[gameState.currentRound - 1];
      const letterIndexToExplode = (currentRound?.currentWord.length || 1) - 1;
      setExplosionLetter(letter);
      setHiddenLetterIndex(letterIndexToExplode);
      
      setTimeout(() => {
        setBombGhostAnimation(null);
      }, 100);
    });

    setTimeout(() => {
      bombFallOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(bombFallAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(bombFallOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1400);
  }, [gameState, bombGhostTranslateX, bombGhostTranslateY, bombGhostOpacity, bombFallAnim, bombFallOpacity]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (lastLetterBombUsedBy && lastLetterBombUsedBy !== lastBombUserRef.current) {
      lastBombUserRef.current = lastLetterBombUsedBy;
      
      if (gameState && gameState.letterBombedBy) {
        const isVictim = gameState.letterBombedBy === 'player2';
        
        const currentRound = gameState.rounds[gameState.currentRound - 1];
        if (currentRound) {
          const letterIndexToExplode = currentRound.currentWord.length - 1;
          const letterRef = letterViewRefs.get(letterIndexToExplode);
          
          if (letterRef) {
            letterRef.measureInWindow((x, y, width, height) => {
              const letter = gameState.letterBombedLetter || currentRound.currentWord[letterIndexToExplode];
              animateBombDrop(x + width / 2, y + height / 2, letter, isVictim);
            });
          }
        }
      }
    }
  }, [lastLetterBombUsedBy, gameState, animateBombDrop]);

  useEffect(() => {
    if (!gameState) {
      setDisplayedWord('');
      setAnimatingIndex(-1);
      setIsAIAnimating(false);
    } else {
      const currentRound = gameState.rounds[gameState.currentRound - 1];
      if (currentRound && currentRound.currentWord !== displayedWord) {
        if (currentRound.currentWord.length > displayedWord.length) {
          setAnimatingIndex(currentRound.currentWord.length - 1);
          newLetterAnim.setValue(0);
          
          const isAIMove = gameState.mode === 'ai' && gameState.currentPlayer === 'player1' && displayedWord.length > 0;
          const isChallengeResponse = gameState.phase === 'challenge' && gameState.mode === 'ai' && gameState.currentPlayer === 'player1';
          
          if (isAIMove || isChallengeResponse) {
            setIsAIAnimating(true);
            Animated.timing(newLetterAnim, {
              toValue: 1,
              duration: 1800,
              useNativeDriver: true,
            }).start(() => {
              setAnimatingIndex(-1);
              setIsAIAnimating(false);
            });
          } else {
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
        setDisplayedWord(currentRound.currentWord);
      }
    }
  }, [gameState, displayedWord, newLetterAnim]);



  useEffect(() => {
    if (!gameState) {
      router.replace('/');
      return;
    }

    if (gameState.phase === 'roundEnd') {
      const currentRoundNumber = gameState.currentRound;
      
      if (processedRoundEndRef.current === currentRoundNumber) {
        return;
      }
      processedRoundEndRef.current = currentRoundNumber;
      
      const currentRound = gameState.rounds[currentRoundNumber - 1];
      const isPlayer1Winner = currentRound?.loser === 'player2';
      const winnerName = isPlayer1Winner ? gameState.player1.name : gameState.player2.name;
      
      const wordPoints = currentRound.currentWord.split('').reduce((sum, letter) => {
        return sum + (POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER] || 0);
      }, 0);
      
      const player1TotalRoundsWon = gameState.player1.roundsWon;
      const player2TotalRoundsWon = gameState.player2.roundsWon;
      const matchIsOver = player1TotalRoundsWon >= 2 || player2TotalRoundsWon >= 2;
      
      setRoundWinnerName(winnerName);
      setRoundWinnerPoints(wordPoints);
      setShowRoundWinner(true);
      roundWinnerOpacity.setValue(0);
      
      if (RNPlatform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Animated.sequence([
        Animated.timing(roundWinnerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(roundWinnerOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowRoundWinner(false);
      });
      
      // Start falling letters animation after 1 second
      setTimeout(() => {
        if (wordBoardPosition) {
          const letters = currentRound.currentWord.split('').map((letter, index) => ({
            letter,
            points: POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER] || 0,
            index,
          }));
          
          const containerWidth = SCREEN_WIDTH * 0.95 - 40;
          const letterCount = letters.length;
          const tileWidth = Math.min(70, containerWidth / letterCount);
          const totalWidth = letterCount * (tileWidth + 8);
          const startXBase = wordBoardPosition.x - totalWidth / 2;
          
          const newFallingLetters: FallingLetter[] = letters.map((item, idx) => {
            const fallAnim = new Animated.Value(0);
            const startX = startXBase + idx * (tileWidth + 8) + tileWidth / 2;
            
            return {
              id: `falling-${Date.now()}-${idx}`,
              letter: item.letter,
              index: idx,
              points: item.points,
              fallAnim,
              startX,
              startY: wordBoardPosition.y,
            };
          });
          
          setFallingLetters(newFallingLetters);
          setScoringPlayerId(isPlayer1Winner ? 'player1' : 'player2');
          setDisplayedScoreBonus(0);
          
          // Start score ticking animation
          let currentTick = 0;
          const tickInterval = setInterval(() => {
            currentTick++;
            setDisplayedScoreBonus(currentTick);
            if (RNPlatform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            if (currentTick >= wordPoints) {
              clearInterval(tickInterval);
            }
          }, 80);
          
          // Stagger the animations
          newFallingLetters.forEach((item, idx) => {
            setTimeout(() => {
              Animated.timing(item.fallAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }).start();
            }, idx * 100);
          });
        }
      }, 1000);
      
      setTimeout(() => {
        setFallingLetters([]);
        setDisplayedScoreBonus(0);
        setScoringPlayerId(null);
        if (matchIsOver) {
          router.replace('/game-over');
        } else {
          nextRound();
        }
      }, 3000);
      return;
    }

    if (gameState.phase === 'gameOver') {
      router.replace('/game-over');
      return;
    }
  }, [gameState, router, roundWinnerOpacity, nextRound]);



  if (!gameState || (gameState.phase !== 'playing' && gameState.phase !== 'challenge' && gameState.phase !== 'roundEnd')) {
    return (
      <LinearGradient
        colors={[COLOR_SCHEMES.peachy.top, COLOR_SCHEMES.peachy.middle, COLOR_SCHEMES.peachy.bottom]}
        style={styles.outerContainer}
        locations={[0, 0.5, 1]}
      />
    );
  }

  const currentRound = gameState.rounds[gameState.currentRound - 1];
  
  const keyboardRows = [
    'QWERTYUIOP'.split(''),
    'ASDFGHJKL'.split(''),
    'ZXCVBNM'.split(''),
  ];

  const calculateWordValue = () => {
    return currentRound.currentWord.split('').reduce((sum, letter) => {
      return sum + (POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER] || 0);
    }, 0);
  };

  const handleLetterPress = (letter: string, event: any) => {
    if (letterBombActive && gameState?.letterBombPending) {
      if (letter === gameState?.letterBombedLetter) {
        console.log('Cannot replace with the same letter that was bombed');
        if (RNPlatform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        return;
      }
      
      if (RNPlatform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const nativeEvent = event?.nativeEvent;
      if (nativeEvent && wordBoardPosition) {
        const { pageX, pageY } = nativeEvent;
        const id = `${letter}-${Date.now()}`;
        const anim = new Animated.Value(0);
        
        setFloatingLetters(prev => [...prev, { id, letter, anim, x: pageX, y: pageY }]);

        Animated.parallel([
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setFloatingLetters(prev => prev.filter(l => l.id !== id));
        });
      }
      
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const success = usePowerUp('letter_bomb');
      if (success) {
        setShowBombIndicator(false);
        setHiddenLetterIndex(-1);
        setExplosionLetter('');
        explodingLetterRef.current = null;
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useLetterBomb(letter);
      }
      return;
    }

    if (RNPlatform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const nativeEvent = event?.nativeEvent;
    if (nativeEvent && wordBoardPosition) {
      const { pageX, pageY } = nativeEvent;
      const id = `${letter}-${Date.now()}`;
      const anim = new Animated.Value(0);
      
      setFloatingLetters(prev => [...prev, { id, letter, anim, x: pageX, y: pageY }]);

      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setFloatingLetters(prev => prev.filter(l => l.id !== id));
      });
    }

    playLetter(letter);
  };

  const handleBack = () => {
    if (RNPlatform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.back();
  };

  const handleCallWord = () => {
    if (RNPlatform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    callWord();
  };

  const handleChallenge = () => {
    if (RNPlatform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    initiateChallenge();
  };

  const handleActivateLetterBomb = () => {
    if (inventory.letterBombs <= 0) {
      return;
    }

    const currentRound = gameState?.rounds[gameState.currentRound - 1];
    if (!currentRound || currentRound.wordHistory.length <= 1) {
      return;
    }

    const lastMove = currentRound.wordHistory[currentRound.wordHistory.length - 1];
    const isPlayer1 = gameState?.currentPlayer === 'player1';
    const currentPlayerId = isPlayer1 ? 'player1' : 'player2';

    if (lastMove.playerId === currentPlayerId || lastMove.playerId === 'system') {
      return;
    }

    if (RNPlatform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const letterIndexToExplode = currentRound.currentWord.length - 1;
    const letterRef = letterViewRefs.get(letterIndexToExplode);
    
    if (letterRef) {
      letterRef.measureInWindow((x, y, width, height) => {
        animateBombDrop(x + width / 2, y + height / 2, lastMove.letter, false);
      });
    }
  };



  const handleConfirmChallenge = () => {
    if (RNPlatform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    submitChallengeWord(currentRound.currentWord);
  };

  return (
    <LinearGradient
      colors={[COLOR_SCHEMES.peachy.top, COLOR_SCHEMES.peachy.middle, COLOR_SCHEMES.peachy.bottom]}
      style={styles.outerContainer}
      locations={[0, 0.5, 1]}
    >
      <View style={styles.container}>
        <DanglingG size={80} />
        <FloatingGhost />
        {bombGhostAnimation && (
          <>
            <Animated.View
              style={[
                styles.bombGhostContainer,
                {
                  transform: [
                    { translateX: bombGhostTranslateX },
                    { translateY: bombGhostTranslateY },
                  ],
                  opacity: bombGhostOpacity,
                },
              ]}
              pointerEvents="none"
            >
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/giooeoqlx8wvws1oy6m0k' }}
                style={styles.bombGhostImage}
                resizeMode="contain"
              />
              <Text style={styles.ghostCarriedBomb}>💣</Text>
            </Animated.View>
            <Animated.View
              style={[
                styles.fallingBomb,
                {
                  left: bombGhostAnimation.targetX - 20,
                  transform: [
                    {
                      translateY: bombFallAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [bombGhostAnimation.targetY - 100, bombGhostAnimation.targetY],
                      }),
                    },
                  ],
                  opacity: bombFallOpacity,
                },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.bombEmoji}>💣</Text>
            </Animated.View>
          </>
        )}
        {explodingParticles.map((particle) => {
          const baseDistance = 120;
          const distance = baseDistance * particle.speed;
          
          const translateX = particle.anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, Math.cos(particle.angle) * distance],
          });
          const translateY = particle.anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, Math.sin(particle.angle) * distance * 0.6, Math.sin(particle.angle) * distance + 80],
          });
          const opacity = particle.anim.interpolate({
            inputRange: [0, 0.1, 0.7, 1],
            outputRange: [1, 0.95, 0.3, 0],
          });
          const scale = particle.anim.interpolate({
            inputRange: [0, 0.15, 1],
            outputRange: [1, 1.1, 0.2],
          });
          const rotate = particle.anim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', `${particle.spin}deg`],
          });

          return (
            <Animated.View
              key={particle.id}
              style={[
                styles.explodingParticle,
                {
                  left: particle.x - particle.size / 2,
                  top: particle.y - particle.size / 2,
                  width: particle.size,
                  height: particle.size,
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
              <View style={[styles.fragmentBlock, { width: particle.size, height: particle.size }]} />
            </Animated.View>
          );
        })}
        {floatingLetters.map((item) => {
          const targetY = wordBoardPosition ? wordBoardPosition.y - item.y : -400;
          const targetX = wordBoardPosition ? wordBoardPosition.x - item.x : 0;
          
          const translateY = item.anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, targetY],
          });
          const translateX = item.anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, targetX],
          });
          const opacity = item.anim.interpolate({
            inputRange: [0, 0.3, 0.8, 1],
            outputRange: [1, 1, 0.6, 0],
          });
          const scale = item.anim.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [1, 1.3, 0.5],
          });

          return (
            <Animated.View
              key={item.id}
              style={[
                styles.floatingLetter,
                {
                  left: item.x - 30,
                  top: item.y - 30,
                  transform: [
                    { translateX },
                    { translateY },
                    { scale },
                  ],
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
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Text style={styles.backText}>BACK{"\n"}TO LIST</Text>
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text style={styles.newGameText}>New Game</Text>
              </View>
              <View style={styles.coinBadge} />
            </View>

            <>
                {bombGhostAnimation?.isVictim && (
                  <View style={styles.bombedBanner}>
                    <View style={styles.bombedBannerContent}>
                      <Bomb color="#FF4444" size={32} />
                      <View style={styles.bombedBannerTextContainer}>
                        <Text style={styles.bombedBannerTitle}>YOU&apos;VE BEEN LETTER BOMBED!</Text>
                        <Text style={styles.bombedBannerSubtitle}>
                          Your opponent replaced your last letter
                        </Text>
                      </View>
                    </View>
                  </View>
                )}



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
                    {currentRound.currentWord.split('').map((letter, index) => {
                      const isAnimating = index === animatingIndex && displayedWord.length === currentRound.currentWord.length;
                      const isExploding = index === hiddenLetterIndex;
                      const letterCount = currentRound.currentWord.length;
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
                            ref={(ref) => {
                              letterViewRefs.set(index, ref);
                              if (ref && explosionLetter && !explodingParticles.length) {
                                ref.measureInWindow((x, y, width, height) => {
                                  explodingLetterRef.current = {
                                    x: x + width / 2,
                                    y: y + height / 2,
                                  };
                                  createExplosion();
                                });
                              }
                            }}
                          >
                            <View style={styles.wordLetter}>
                              <Text style={[styles.wordLetterText, { opacity: 0, fontSize: dynamicFontSize, lineHeight: dynamicFontSize * 1.13 }]}>{letter}</Text>
                              <Text style={[styles.wordLetterPoints, { opacity: 0, fontSize: dynamicPointsSize }]}>
                                {POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER]}
                              </Text>
                            </View>
                          </View>
                        );
                      }
                      
                      if (isAnimating) {
                        if (isAIAnimating) {
                          const opacity = newLetterAnim.interpolate({
                            inputRange: [0, 0.15, 0.35, 0.6, 0.8, 1],
                            outputRange: [0, 0.05, 0.2, 0.5, 0.8, 1],
                          });
                          
                          const animScale = newLetterAnim.interpolate({
                            inputRange: [0, 0.6, 1],
                            outputRange: [0.95, 1.03, 1],
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
                                transform: [{ scale: animScale }, { translateY }],
                                opacity,
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
                          ref={(ref) => { letterViewRefs.set(index, ref); }}
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
                          const isFaded = fadedLetter === letter;
                          const isPlayer1Turn = gameState?.currentPlayer === 'player1';
                          
                          const isBomberSelectingReplacement = letterBombActive && 
                            gameState?.letterBombPending && 
                            gameState?.letterBombedBy === 'player1' && 
                            isPlayer1Turn;
                          
                          const isBombedLetter = isBomberSelectingReplacement && 
                            letter === gameState?.letterBombedLetter;
                          
                          const isInChallengeMode = gameState?.phase === 'challenge';
                          const isKeyboardDisabled = !isPlayer1Turn || isAIThinking || isValidating || (isProcessingMove && !isInChallengeMode);
                          const isLetterBlocked = isBombedLetter || (isKeyboardDisabled && !isBomberSelectingReplacement);
                          
                          return (
                            <Animated.View
                              key={letter}
                              style={{
                                opacity: isFaded ? letterFadeAnim : 1,
                                position: 'relative' as const,
                              }}
                            >
                              <TouchableOpacity
                                style={[
                                  styles.keyTile,
                                  isLetterBlocked && styles.keyTileDisabled,
                                ]}
                                onPress={(event) => handleLetterPress(letter, event)}
                                activeOpacity={0.7}
                                disabled={isFaded || isLetterBlocked}
                              >
                                <Text style={[styles.keyLetter, isLetterBlocked && styles.keyLetterDisabled]}>{letter}</Text>
                                <Text style={styles.keyPoints}>
                                  {POINTS_PER_LETTER[letter as keyof typeof POINTS_PER_LETTER]}
                                </Text>
                              </TouchableOpacity>
                            </Animated.View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                  <View style={styles.indicatorContainer}>
                    {isValidating ? (
                      <>
                        <Loader2 color={COLORS.gold} size={20} />
                        <Text style={styles.indicatorText}>Validating word...</Text>
                      </>
                    ) : isAIThinking ? (
                      <>
                        <Loader2 color={COLORS.gold} size={20} />
                        <Text style={styles.indicatorText}>AI thinking...</Text>
                      </>
                    ) : showBombIndicator ? (
                      <Text style={styles.indicatorText}>Choose a replacement letter...</Text>
                    ) : gameState.phase === 'challenge' && gameState.mode === 'ai' && gameState.currentPlayer === 'player2' ? (
                      <>
                        <Loader2 color={COLORS.gold} size={20} />
                        <Text style={styles.indicatorText}>AI responding to challenge...</Text>
                      </>
                    ) : null}
                  </View>

                </View>

                <View style={styles.bottomBar}>
                  <View style={styles.playerInfo}>
                    <View style={styles.playerRow}>
                      <Text style={styles.playerLabel}>{gameState.player1.name}:</Text>
                      <Text style={styles.playerScore}>
                        {scoringPlayerId === 'player1' 
                          ? (gameState.player1.score - roundWinnerPoints + displayedScoreBonus)
                          : gameState.player1.score} pts
                      </Text>
                    </View>
                    <View style={styles.playerRow}>
                      <Text style={styles.playerLabel}>{gameState.player2.name}:</Text>
                      <Text style={styles.playerScore}>
                        {scoringPlayerId === 'player2'
                          ? (gameState.player2.score - roundWinnerPoints + displayedScoreBonus)
                          : gameState.player2.score} pts
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    {inventory.letterBombs > 0 && currentRound.wordHistory.length > 1 && (() => {
                      const lastMove = currentRound.wordHistory[currentRound.wordHistory.length - 1];
                      const isPlayer1 = gameState.currentPlayer === 'player1';
                      const currentPlayerId = isPlayer1 ? 'player1' : 'player2';
                      const canUseBomb = lastMove.playerId !== currentPlayerId && lastMove.playerId !== 'system';
                      
                      return canUseBomb ? (
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={handleActivateLetterBomb}
                          activeOpacity={0.7}
                        >
                          <View style={styles.iconButtonWrapper}>
                            <View style={styles.bombIconMirror}>
                              <Bomb color={COLORS.white} size={28} />
                            </View>
                            <View style={styles.bombCountBadge}>
                              <Text style={styles.bombCountText}>{inventory.letterBombs}</Text>
                            </View>
                          </View>
                          <Text style={styles.iconButtonLabel}>BOMB</Text>
                        </TouchableOpacity>
                      ) : null;
                    })()}

                    {gameState.phase === 'challenge' ? (
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
                        {currentRound.currentWord.length >= 3 && (
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
                          style={[styles.iconButton, (currentRound.currentWord.length < 4 || isValidating) && styles.iconButtonDisabled]}
                          onPress={handleCallWord}
                          activeOpacity={0.7}
                          disabled={currentRound.currentWord.length < 4 || isValidating}
                        >
                          <AlertCircle color={COLORS.white} size={28} />
                          <Text style={styles.iconButtonLabel}>CALL WORD</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
            </>
          </Animated.View>
        </SafeAreaView>

        {gameState.phase === 'challenge' && gameState.currentPlayer === 'player1' && (
          <View style={styles.challengeIndicator}>
            <Text style={styles.challengeIndicatorTitle}>⚠️ CHALLENGED</Text>
            <Text style={styles.challengeIndicatorSubtitle}>Spell a valid word</Text>
          </View>
        )}

        {showRoundWinner && (
          <Animated.View 
            style={[
              styles.roundWinnerOverlay,
              { 
                opacity: roundWinnerOpacity,
              },
            ]}
            pointerEvents="none"
          >
            <View style={styles.roundWinnerCard}>
              <Text style={styles.roundWinnerLabel}>ROUND WINNER</Text>
              <Text style={styles.roundWinnerName}>{roundWinnerName}</Text>
              <Text style={styles.roundWinnerPoints}>+{roundWinnerPoints} pts</Text>
            </View>
          </Animated.View>
        )}

        {fallingLetters.map((item) => {
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
                  transform: [{ translateY }],
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
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
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
    gap: 8,
  },
  roundText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.whiteTransparent,
  },
  timerContainer: {
    backgroundColor: COLORS.whiteGlass,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  timerWarning: {
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    borderColor: '#FF6B6B',
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  scoresContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  turnIndicator: {
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  turnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.white,
    textAlign: 'center',
  },
  wordDisplayContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 150,
    height: 100,
    minHeight: 100,
  },
  wordLettersContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    minHeight: 60,
  },
  letterBox: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    width: 50,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFB366',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  letterBoxText: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 3 },
    textShadowRadius: 4,
  },

  wordHint: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
    marginTop: 12,
  },
  lettersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 16,
  },
  letterTile: {
    width: 60,
    height: 60,
    backgroundColor: 'transparent',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFB366',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    position: 'relative' as const,
  },
  letterTileDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.4,
  },
  letterText: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
    marginBottom: -4,
  },
  letterPoints: {
    position: 'absolute' as const,
    top: 2,
    right: 4,
    fontSize: 10,
    fontWeight: '700' as const,
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  letterTextDisabled: {
    color: COLORS.whiteTransparent,
  },
  aiThinkingOverlay: {
    position: 'absolute' as const,
    bottom: -80,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  aiThinkingSmallText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.gold,
  },
  historyContainer: {
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    maxHeight: 150,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.whiteTransparent,
    marginBottom: 12,
  },
  historyList: {
    gap: 8,
  },
  historyEmpty: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    fontStyle: 'italic' as const,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyPlayer: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
  },
  historyLetter: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.gold,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  callWordButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  challengeButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  actionButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalCloseButton: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
    marginBottom: 24,
    textAlign: 'center',
  },
  currentWordDisplay: {
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  currentWordLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.whiteTransparent,
    marginBottom: 8,
  },
  currentWordText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: COLORS.white,
    textTransform: 'uppercase' as const,
  },
  wordPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  additionalLettersText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: COLORS.gold,
    textTransform: 'uppercase' as const,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.white,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.white,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    textTransform: 'uppercase' as const,
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  submitButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
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
  bombButton: {
    width: 70,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bombIcon: {
    fontSize: 28,
  },
  bombCount: {
    position: 'absolute' as const,
    top: 4,
    right: 8,
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.white,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cancelBombButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  backText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 14,
  },
  newGameText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: COLORS.white,
    textAlign: 'center',
  },
  coinBadge: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostCoinIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.goldLight,
    borderWidth: 3,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  ghostCoinIconText: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: COLORS.white,
  },
  currentLetterContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  currentLetter: {
    fontSize: 120,
    fontWeight: '800' as const,
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 4 },
    textShadowRadius: 8,
  },
  letterIndicator: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid' as const,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.white,
    marginTop: -20,
  },
  wordValueText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#DFFF00',
    textShadowColor: 'rgba(223, 255, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  keyboardSection: {
    position: 'absolute' as const,
    left: 20,
    right: 20,
    bottom: 165,
  },
  keyboardContainer: {
    gap: 6,
    marginBottom: 20,
  },
  keyboardRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  keyTile: {
    width: 32,
    height: 44,
    backgroundColor: COLORS.keyBackground,
    borderRadius: 6,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  keyLetter: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  keyLetterDisabled: {
    opacity: 0.5,
  },
  keyPoints: {
    position: 'absolute' as const,
    top: 2,
    right: 4,
    fontSize: 8,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  ghostOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  ghostOverlayImage: {
    width: 40,
    height: 40,
    opacity: 0.7,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 20,
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
    color: '#DFFF00',
    textShadowColor: 'rgba(223, 255, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
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
  wordLettersDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    flexWrap: 'nowrap',
    alignItems: 'center',
    width: '95%',
    maxWidth: '95%',
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
    fontSize: 60,
    fontWeight: '700' as const,
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 0,
    lineHeight: 68,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  wordLetterPoints: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    fontSize: 10,
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
    transform: [{ scaleX: 1.3 }, { scaleY: 0.6 }],
    zIndex: -1,
  },
  explodingParticle: {
    position: 'absolute' as const,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000,
  },
  fragmentBlock: {
    backgroundColor: COLORS.white,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    marginTop: 8,
  },
  indicatorText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.gold,
  },
  challengeIndicator: {
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
  challengeIndicatorTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFD700',
    marginBottom: 2,
  },
  challengeIndicatorSubtitle: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  bombedBanner: {
    backgroundColor: 'rgba(255, 68, 68, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF2222',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bombedBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bombedBannerTextContainer: {
    flex: 1,
  },
  bombedBannerTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: COLORS.white,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bombedBannerSubtitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.95)',
  },
  bombGhostContainer: {
    position: 'absolute' as const,
    width: 100,
    height: 100,
    zIndex: 5000,
  },
  bombGhostImage: {
    width: '100%',
    height: '100%',
  },
  fallingBomb: {
    position: 'absolute' as const,
    zIndex: 4500,
  },
  bombEmoji: {
    fontSize: 40,
  },
  ghostCarriedBomb: {
    position: 'absolute' as const,
    fontSize: 32,
    bottom: -10,
    right: 15,
  },
  iconButtonWrapper: {
    position: 'relative' as const,
  },
  bombCountBadge: {
    position: 'absolute' as const,
    top: -6,
    right: -8,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  bombCountText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: COLORS.white,
  },
  bombIconMirror: {
    transform: [{ scaleX: -1 }],
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
    color: COLORS.gold,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  roundWinnerPoints: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: COLORS.white,
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
