import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useGame } from '@/contexts/GameContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { ArrowRight } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import { POINTS_PER_LETTER } from '@/constants/game';
import FloatingGhost from '@/components/FloatingGhost';
import { useAnimatedBackground } from '@/hooks/useAnimatedBackground';


export default function RoundResultScreen() {
  const router = useRouter();
  const { gameState, nextRound } = useGame();
  const { wallet } = usePlayer();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const letterAnims = useRef<Animated.Value[]>([]).current;
  const winLossAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const coinAnim = useRef(new Animated.Value(0)).current;
  const coinRotateAnim = useRef(new Animated.Value(0)).current;
  const coinScaleAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const coinFlyAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const entryBounceAnim = useRef(new Animated.Value(0)).current;
  const [coinPosition, setCoinPosition] = useState<{ x: number; y: number } | null>(null);
  const [profilePosition, setProfilePosition] = useState<{ x: number; y: number } | null>(null);
  const [showFlyingCoin, setShowFlyingCoin] = useState(false);
  const coinContainerRef = useRef<View>(null);
  const profileRef = useRef<View>(null);
  const { topColor, middleColor, bottomColor } = useAnimatedBackground();

  useEffect(() => {
    const currentRound = gameState?.rounds[gameState.currentRound - 1];
    const isPlayer1Winner = currentRound?.loser === 'player2';
    const youWon = gameState?.mode === 'ai' && isPlayer1Winner;
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        youWon ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
      );
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      letterAnims.forEach((anim, index) => {
        Animated.spring(anim, {
          toValue: 1,
          delay: index * 100,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }).start();
      });
    }, 300);

    setTimeout(() => {
      Animated.sequence([
        Animated.spring(winLossAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.spring(bounceAnim, {
              toValue: 1,
              friction: 2,
              tension: 80,
              useNativeDriver: true,
            }),
            Animated.spring(bounceAnim, {
              toValue: 0,
              friction: 2,
              tension: 80,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    }, 600);

    if (youWon) {
      setTimeout(() => {
        // Entry bounce animation
        Animated.sequence([
          Animated.spring(entryBounceAnim, {
            toValue: 1.15,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
          Animated.spring(entryBounceAnim, {
            toValue: 0.95,
            friction: 4,
            tension: 180,
            useNativeDriver: true,
          }),
          Animated.spring(entryBounceAnim, {
            toValue: 1,
            friction: 5,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();

        Animated.parallel([
          Animated.spring(coinAnim, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(coinScaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(coinRotateAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Start pulsing light burst animation
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
              }),
              Animated.timing(pulseAnim, {
                toValue: 0,
                duration: 1200,
                useNativeDriver: true,
              }),
            ])
          ).start();

          Animated.loop(
            Animated.timing(shineAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            })
          ).start();
          
          setTimeout(() => {
            if (coinContainerRef.current && profileRef.current) {
              coinContainerRef.current.measureInWindow((cx, cy, cw, ch) => {
                setCoinPosition({ x: cx + cw / 2, y: cy + ch / 2 });
                profileRef.current?.measureInWindow((px, py, pw, ph) => {
                  setProfilePosition({ x: px + pw / 2, y: py + ph / 2 });
                  setShowFlyingCoin(true);
                  
                  Animated.timing(coinFlyAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                  }).start(() => {
                    setShowFlyingCoin(false);
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                  });
                });
              });
            }
          }, 1500);
        });
      }, 1000);
    }
  }, [fadeAnim, scaleAnim, letterAnims, winLossAnim, bounceAnim, coinAnim, coinRotateAnim, coinScaleAnim, shineAnim, coinFlyAnim, pulseAnim, entryBounceAnim]);

  if (!gameState) {
    router.replace('/');
    return null;
  }

  const currentRound = gameState.rounds[gameState.currentRound - 1];

  const calculateWordValue = (word: string): number => {
    return word.split('').reduce((total, letter) => {
      const upperLetter = letter.toUpperCase() as keyof typeof POINTS_PER_LETTER;
      return total + (POINTS_PER_LETTER[upperLetter] || 0);
    }, 0);
  };

  const getDisplayWord = (): string => {
    if (currentRound.reason === 'challenge_success' || currentRound.reason === 'challenge_failed') {
      const word = currentRound.targetWord || currentRound.currentWord;
      return word.replace(/INVALID$/i, '');
    }
    return currentRound.currentWord.replace(/INVALID$/i, '');
  };

  const getReasonText = (): string => {
    const isPlayer1Winner = currentRound.loser === 'player2';
    const youWon = gameState.mode === 'ai' && isPlayer1Winner;
    
    switch (currentRound.reason) {
      case 'invalid':
        return youWon ? 'Invalid word, you win!' : 'You called an invalid word';
      case 'called_word':
        return youWon ? 'Valid word!' : 'Opponent called a valid word';
      case 'challenge_success':
        return youWon ? 'Challenge successful!' : 'Failed to prove the word';
      case 'challenge_failed':
        return youWon ? 'Opponent proved the word!' : 'Challenge failed!';
      case 'timeout':
        return youWon ? 'Opponent timed out!' : 'Time ran out';
      default:
        return '';
    }
  };

  const displayWord = getDisplayWord();
  const reasonText = getReasonText();
  const wordValue = calculateWordValue(displayWord);

  if (letterAnims.length === 0) {
    for (let i = 0; i < displayWord.length; i++) {
      letterAnims.push(new Animated.Value(0));
    }
  }

  const handleContinue = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (gameState.player1.roundsWon >= 2 || gameState.player2.roundsWon >= 2) {
      router.replace('/game-over');
    } else {
      nextRound();
      router.replace('/game');
    }
  };

  const isPlayer1Winner = currentRound.loser === 'player2';
  const resultText = gameState.mode === 'ai' 
    ? (isPlayer1Winner ? 'You Won' : 'You Lost')
    : (isPlayer1Winner ? 'Player 1 Won' : 'Player 2 Won');

  const winLossTranslateY = winLossAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  const winLossOpacity = winLossAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  const bounceScale = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  const coinOpacity = coinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const coinTranslateY = coinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  const coinRotate = coinRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const coinScale = coinScaleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.3, 1],
  });

  const shineRotate = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shineOpacity = shineAnim.interpolate({
    inputRange: [0, 0.3, 0.5, 0.7, 1],
    outputRange: [0.4, 0.8, 1, 0.8, 0.4],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.9, 0.3],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.2, 0.8],
  });

  const flyingCoinTranslateX = coinFlyAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [
      0,
      profilePosition && coinPosition ? (profilePosition.x - coinPosition.x) * 0.3 : 0,
      profilePosition && coinPosition ? profilePosition.x - coinPosition.x : 0,
    ],
  });

  const flyingCoinTranslateY = coinFlyAnim.interpolate({
    inputRange: [0, 0.3, 0.6, 1],
    outputRange: [
      0,
      -80,
      profilePosition && coinPosition ? (profilePosition.y - coinPosition.y) * 0.5 - 40 : 0,
      profilePosition && coinPosition ? profilePosition.y - coinPosition.y : 0,
    ],
  });

  const flyingCoinScale = coinFlyAnim.interpolate({
    inputRange: [0, 0.2, 0.5, 1],
    outputRange: [1, 1.3, 0.8, 0.4],
  });

  const flyingCoinOpacity = coinFlyAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: middleColor }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: topColor }]} />
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: bottomColor, opacity: 0.7 }]} />
      <FloatingGhost />
      
      <View style={styles.centerContent}>
      <Animated.View style={[
        styles.winLossBanner,
        {
          opacity: winLossOpacity,
          transform: [
            { translateY: winLossTranslateY },
            { scale: bounceScale },
          ],
        },
      ]}>
        <Text style={[
          styles.winLossText,
          isPlayer1Winner ? styles.winText : styles.loseText
        ]}>
          {resultText.toUpperCase()}
        </Text>
      </Animated.View>

      <View style={styles.wordContainer}>
        <Animated.View style={[styles.wordDisplay, { opacity: fadeAnim }]}>
          {displayWord.split('').map((letter, index) => {
            return (
              <Animated.View 
                key={index}
                style={[
                  styles.letterContainer,
                  {
                    transform: [
                      {
                        scale: letterAnims[index] || new Animated.Value(1)
                      },
                      {
                        translateY: (letterAnims[index] || new Animated.Value(1)).interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        })
                      }
                    ],
                    opacity: letterAnims[index] || new Animated.Value(1)
                  }
                ]}
              >
                <Text style={styles.letter}>{letter.toUpperCase()}</Text>
              </Animated.View>
            );
          })}
        </Animated.View>

        {reasonText && (
          <Animated.View style={[styles.reasonContainer, { opacity: fadeAnim }]}>
            <Text style={styles.reasonText}>{reasonText}</Text>
          </Animated.View>
        )}
      </View>

      {isPlayer1Winner && (
        <Animated.View style={[styles.pointsEarnedContainer, { opacity: fadeAnim }]}>
          <Text style={styles.pointsEarnedText}>+{wordValue} points</Text>
          
          <Animated.View 
            ref={coinContainerRef}
            style={[
              styles.goldenCoinContainer,
              {
                opacity: coinOpacity,
                transform: [
                  { translateY: coinTranslateY },
                  { scale: Animated.multiply(coinScale, entryBounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1],
                  })) },
                ],
              },
            ]}
          >
            <Animated.View style={[styles.coinWithShine, { transform: [{ scale: entryBounceAnim }] }]}>
              {/* Pulsing radial light burst */}
              <Animated.View 
                style={[
                  styles.radialBurstOuter,
                  {
                    opacity: pulseOpacity,
                    transform: [{ scale: pulseScale }],
                  },
                ]}
              />
              <Animated.View 
                style={[
                  styles.radialBurstMiddle,
                  {
                    opacity: pulseOpacity,
                    transform: [{ scale: Animated.add(pulseScale, 0.1) }],
                  },
                ]}
              />
              <Animated.View 
                style={[
                  styles.radialBurstInner,
                  {
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.5, 1, 0.5],
                    }),
                  },
                ]}
              />
              {/* Rotating shine rays */}
              <Animated.View 
                style={[
                  styles.shineContainer,
                  {
                    opacity: shineOpacity,
                    transform: [{ rotate: shineRotate }],
                  },
                ]}
              >
                {[...Array(12)].map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.shineRay,
                      { transform: [{ rotate: `${i * 30}deg` }] },
                    ]} 
                  />
                ))}
              </Animated.View>
              {/* 3D Metallic Coin */}
              <View style={styles.goldenCoinShadow} />
              <Animated.View style={[
                styles.goldenCoin3D,
                { transform: [{ rotate: coinRotate }] },
              ]}>
                <View style={styles.coinInnerRing} />
                <View style={styles.coinHighlight} />
                <View style={styles.coinHighlightSmall} />
                <Text style={styles.goldenCoinG}>G</Text>
              </Animated.View>
            </Animated.View>
            <Text style={styles.goldenCoinLabel}>Golden Ghost Coin</Text>
          </Animated.View>
        </Animated.View>
      )}
      </View>

      <View style={styles.footer}>
        <View style={styles.playerInfoContainer}>
          <View ref={profileRef} style={styles.playerInfo}>
            <Text style={styles.playerName} numberOfLines={1}>{gameState.player1.name}...</Text>
            <View style={styles.coinRow}>
              {Array.from({ length: Math.min(wallet.ghostCoins, 5) }).map((_, i) => (
                <View key={i} style={styles.ghostCoin}>
                  <Text style={styles.ghostCoinText}>G</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.playerInfo}>
            <Text style={styles.playerName} numberOfLines={1}>{gameState.player2.name}...</Text>
            <View style={styles.coinRow}>
              {Array.from({ length: Math.min(3, 5) }).map((_, i) => (
                <View key={i} style={styles.ghostCoin}>
                  <Text style={styles.ghostCoinText}>G</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <ArrowRight color="white" size={40} strokeWidth={3} />
          <Text style={styles.nextText}>NEXT</Text>
        </TouchableOpacity>
      </View>
    {showFlyingCoin && coinPosition && (
        <Animated.View
          style={[
            styles.flyingCoinContainer,
            {
              left: coinPosition.x - 40,
              top: coinPosition.y - 40,
              transform: [
                { translateX: flyingCoinTranslateX },
                { translateY: flyingCoinTranslateY },
                { scale: flyingCoinScale },
              ],
              opacity: flyingCoinOpacity,
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.flyingCoinShineContainer}>
            {[...Array(6)].map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.flyingShineRay,
                  { transform: [{ rotate: `${i * 60}deg` }] },
                ]} 
              />
            ))}
          </View>
          <View style={styles.flyingCoin}>
            <Text style={styles.flyingCoinText}>👻</Text>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  winLossBanner: {
    position: 'relative' as const,
    marginBottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  winLossText: {
    fontSize: 72,
    fontWeight: '900' as const,
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 12,
  },
  winText: {
    color: COLORS.gold,
  },
  loseText: {
    color: COLORS.white,
  },
  wordContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  wordDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  reasonContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  reasonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  letterContainer: {
    position: 'relative',
    marginHorizontal: 6,
    alignItems: 'center',
  },
  letter: {
    fontSize: 64,
    fontWeight: '800' as const,
    color: 'rgba(255, 255, 255, 0.95)',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  pointsEarnedContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  pointsEarnedText: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 20,
  },
  goldenCoinContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  coinWithShine: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shineContainer: {
    position: 'absolute' as const,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shineRay: {
    position: 'absolute' as const,
    width: 4,
    height: 60,
    backgroundColor: 'rgba(255, 248, 220, 0.9)',
    borderRadius: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  shineGlow: {
    position: 'absolute' as const,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  goldenCoin3D: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderTopColor: '#FFF4B8',
    borderLeftColor: '#FFE566',
    borderRightColor: '#DAA520',
    borderBottomColor: '#B8860B',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 20,
    overflow: 'hidden' as const,
  },
  coinInnerRing: {
    position: 'absolute' as const,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#DAA520',
    backgroundColor: 'transparent',
  },
  coinHighlight: {
    position: 'absolute' as const,
    top: 8,
    left: 12,
    width: 35,
    height: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    transform: [{ rotate: '-25deg' }],
  },
  coinHighlightSmall: {
    position: 'absolute' as const,
    top: 18,
    left: 55,
    width: 12,
    height: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  goldenCoinG: {
    fontSize: 42,
    fontWeight: '900' as const,
    color: '#FFF8DC',
    textShadowColor: '#B8860B',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 1,
  },
  coinShadow: {
    position: 'absolute' as const,
    bottom: -8,
    width: 70,
    height: 20,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  goldenCoinShadow: {
    position: 'absolute' as const,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(139, 69, 19, 0.4)',
    top: 6,
    left: 3,
  },
  radialBurstOuter: {
    position: 'absolute' as const,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  radialBurstMiddle: {
    position: 'absolute' as const,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 248, 220, 0.25)',
  },
  radialBurstInner: {
    position: 'absolute' as const,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 215, 0, 0.35)',
  },
  goldenCoinLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.gold,
    marginTop: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  flyingCoinContainer: {
    position: 'absolute' as const,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  flyingCoinShineContainer: {
    position: 'absolute' as const,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flyingShineRay: {
    position: 'absolute' as const,
    width: 3,
    height: 40,
    backgroundColor: 'rgba(255, 248, 220, 0.8)',
    borderRadius: 2,
  },
  flyingCoin: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.goldLight,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  flyingCoinText: {
    fontSize: 28,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  playerInfoContainer: {
    flex: 1,
    gap: 16,
  },
  playerInfo: {
    gap: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
    maxWidth: 120,
  },
  coinRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ghostCoin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.coinBackground,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.coinBorder,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  ghostCoinText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: COLORS.coinText,
  },
  nextButton: {
    alignItems: 'center',
    gap: 4,
    marginLeft: 20,
  },

  nextText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: 'white',
    letterSpacing: 1,
  },
});
