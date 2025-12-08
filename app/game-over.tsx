import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '@/contexts/GameContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Trophy, Home } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import FloatingGhost from '@/components/FloatingGhost';
import { trpc } from '@/lib/trpc';
import { useAnimatedBackground } from '@/hooks/useAnimatedBackground';
import GoldenGhostCoin from '@/components/GoldenGhostCoin';

export default function GameOverScreen() {
  const router = useRouter();
  const { gameState, resetGame } = useGame();
  const { awardGameWin } = usePlayer();
  const recordGameMutation = trpc.user.recordGame.useMutation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const coinAnim = useRef(new Animated.Value(0)).current;
  const coinRotateAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const entryBounceAnim = useRef(new Animated.Value(1)).current;
  const [showCoinReward, setShowCoinReward] = useState(false);
  const { topColor, middleColor, bottomColor } = useAnimatedBackground();

  useEffect(() => {
    if (gameState && gameState.winner && gameState.mode === 'ai') {
      const playerWon = gameState.winner === 'player1';
      if (playerWon) {
        awardGameWin();
      }
      recordGameMutation.mutate({
        won: playerWon,
        roundsWon: gameState.player1.roundsWon,
        roundsLost: gameState.player2.roundsWon,
      });
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 30,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(confettiAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(confettiAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    const playerWon = gameState?.winner === 'player1';
    if (playerWon) {
      console.log('[GameOver] Player won! Starting coin reward animation...');
      setTimeout(() => {
        setShowCoinReward(true);
        console.log('[GameOver] showCoinReward set to true');
        
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
          Animated.loop(
            Animated.timing(coinRotateAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            })
          ),
          Animated.loop(
            Animated.timing(shineAnim, {
              toValue: 1,
              duration: 2500,
              useNativeDriver: true,
            })
          ),
        ]).start();

        // Start pulsing light burst
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
      }, 600);
    }
  }, [fadeAnim, scaleAnim, confettiAnim, coinAnim, coinRotateAnim, shineAnim, pulseAnim, entryBounceAnim, gameState, awardGameWin, recordGameMutation]);

  useEffect(() => {
    if (!gameState) {
      router.replace('/');
    }
  }, [gameState, router]);

  if (!gameState) {
    return null;
  }

  const player1Won = gameState.winner === 'player1';
  const player2Won = gameState.winner === 'player2';
  
  // Calculate actual rounds won (cap at 2 for best of 3)
  const player1RoundsDisplay = Math.min(gameState.player1.roundsWon, 2);
  const player2RoundsDisplay = Math.min(gameState.player2.roundsWon, 2);

  const coinOpacity = coinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const coinScale = coinAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1.3, 1],
  });

  const coinRotate = coinRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const coinTranslateY = coinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 0],
  });

  const shineRotate = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shineOpacity = shineAnim.interpolate({
    inputRange: [0, 0.3, 0.5, 0.7, 1],
    outputRange: [0.5, 0.9, 1, 0.9, 0.5],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.9, 0.3],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.8, 1.2, 0.8],
  });

  const handlePlayAgain = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    resetGame();
    router.replace('/');
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: middleColor }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: topColor }]} />
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: bottomColor, opacity: 0.7 }]} />
      <FloatingGhost />
      
      {/* Reward Coin Overlay - Full screen overlay on top of everything */}
      {player1Won && showCoinReward && (
        <View style={styles.coinOverlayContainer} pointerEvents="none">
          <Animated.View style={[
            styles.coinOverlay,
            {
              opacity: coinOpacity,
              transform: [
                { translateY: coinTranslateY },
                { scale: coinScale },
              ],
            },
          ]}>
            <View style={styles.coinRewardContent}>
              <Text style={styles.coinRewardText}>+1</Text>
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
                {/* Golden Ghost Coin Reward */}
                <Animated.View style={[
                  styles.coinImageContainer,
                  {
                    transform: [{ rotate: coinRotate }],
                  },
                ]}>
                  <GoldenGhostCoin size={80} />
                </Animated.View>
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      )}
      
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconContainer}>
            <Trophy color={COLORS.gold} size={80} strokeWidth={2} />
          </View>

          <Text style={styles.gameOverText}>Game Over</Text>
          <Text style={styles.winnerText}>
            {player1Won 
              ? (gameState.player1.name === 'You' ? 'You Won!' : `${gameState.player1.name} Wins!`)
              : (gameState.player2.name === 'You' ? 'You Lost!' : `${gameState.player2.name} Wins!`)}
          </Text>

          <View style={styles.finalScoresContainer}>
            <View style={[
              styles.finalScoreBox,
              player1Won && styles.winnerBox,
            ]}>
              <Text style={styles.finalPlayerName}>{gameState.player1.name}</Text>
              <Text style={styles.finalScore}>{player1RoundsDisplay}</Text>
              {player1Won && <Text style={styles.winnerLabel}>Winner!</Text>}
            </View>

            <View style={[
              styles.finalScoreBox,
              player2Won && styles.winnerBox,
            ]}>
              <Text style={styles.finalPlayerName}>{gameState.player2.name}</Text>
              <Text style={styles.finalScore}>{player2RoundsDisplay}</Text>
              {player2Won && <Text style={styles.winnerLabel}>Winner!</Text>}
            </View>
          </View>

          <View style={styles.roundsSummary}>
            <Text style={styles.roundsSummaryTitle}>Round Summary</Text>
            <View style={styles.roundsList}>
              {gameState.rounds.map((round, index) => (
                <View key={index} style={styles.roundItem}>
                  <Text style={styles.roundNumber}>R{round.number}</Text>
                  <Text style={styles.roundWinner}>
                    {round.loser === 'player1' ? gameState.player2.name : gameState.player1.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.playAgainButton}
            onPress={handlePlayAgain}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.gold, COLORS.goldLight]}
              style={styles.playAgainGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Home color={COLORS.white} size={24} />
              <Text style={styles.playAgainText}>Back to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  gameOverText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: COLORS.whiteTransparent,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
  },
  winnerText: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: COLORS.white,
    marginBottom: 32,
    textAlign: 'center',
  },
  finalScoresContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  finalScoreBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  winnerBox: {
    backgroundColor: 'rgba(255, 199, 87, 0.2)',
    borderColor: COLORS.gold,
  },
  finalPlayerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.whiteTransparent,
    marginBottom: 12,
  },
  finalScore: {
    fontSize: 48,
    fontWeight: '800' as const,
    color: COLORS.white,
  },
  winnerLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: COLORS.gold,
    marginTop: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  roundsSummary: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  roundsSummaryTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.whiteTransparent,
    marginBottom: 16,
    textAlign: 'center',
  },
  roundsList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  roundItem: {
    alignItems: 'center',
    gap: 8,
  },
  roundNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.whiteTransparent,
  },
  roundWinner: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: COLORS.gold,
  },
  playAgainButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  playAgainGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  playAgainText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  coinOverlayContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinRewardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(30, 30, 50, 0.85)',
    paddingHorizontal: 28,
    paddingVertical: 20,
    paddingRight: 40,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 30,
  },
  coinRewardText: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: COLORS.gold,
    textShadowColor: 'rgba(255, 215, 0, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
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
    width: 5,
    height: 80,
    backgroundColor: 'rgba(255, 248, 220, 0.95)',
    borderRadius: 3,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  radialBurstOuter: {
    position: 'absolute' as const,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 15,
  },
  radialBurstMiddle: {
    position: 'absolute' as const,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 248, 220, 0.4)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 20,
    elevation: 12,
  },
  radialBurstInner: {
    position: 'absolute' as const,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  coinImageContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 25,
  },
});
