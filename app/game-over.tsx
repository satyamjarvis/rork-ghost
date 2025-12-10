import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '@/contexts/GameContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Home } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import FloatingGhost from '@/components/FloatingGhost';
import { trpc } from '@/lib/trpc';
import { useAnimatedBackground } from '@/hooks/useAnimatedBackground';
import GoldenGhostCoin from '@/components/GoldenGhostCoin';

const FORCE_SHOW_COIN = false;

export default function GameOverScreen() {
  const router = useRouter();
  const { gameState, resetGame } = useGame();
  const { awardGameWin } = usePlayer();
  const { isAuthenticated, recordAIGameResult } = useAuth();
  const recordGameMutation = trpc.user.recordGame.useMutation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const coinAnim = useRef(new Animated.Value(0)).current;
  const coinScaleAnim = useRef(new Animated.Value(0.3)).current;
  const shineRotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const [showCoinReward, setShowCoinReward] = useState(false);
  const coinDismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinAnimationsRef = useRef<Animated.CompositeAnimation[]>([]);
  const hasShownCoinRef = useRef(false);
  const { topColor, middleColor, bottomColor } = useAnimatedBackground();

  // Determine winner based on rounds won (most reliable source)
  const player1Won = gameState ? gameState.player1.roundsWon >= 2 : false;
  const player2Won = gameState ? gameState.player2.roundsWon >= 2 : false;
  
  const hasRecordedRef = useRef(false);

  useEffect(() => {
    if (gameState && gameState.mode === 'ai' && !hasRecordedRef.current) {
      hasRecordedRef.current = true;
      
      console.log('[GameOver] Player1 rounds won:', gameState.player1.roundsWon);
      console.log('[GameOver] Player2 rounds won:', gameState.player2.roundsWon);
      console.log('[GameOver] Player1 won match:', player1Won);
      console.log('[GameOver] Is authenticated:', isAuthenticated);
      
      if (player1Won) {
        awardGameWin();
      }
      
      recordGameMutation.mutate({
        won: player1Won,
        roundsWon: gameState.player1.roundsWon,
        roundsLost: gameState.player2.roundsWon,
      });

      if (isAuthenticated) {
        const pointsEarned = player1Won ? 100 : 25;
        console.log('[GameOver] Recording AI game to profile, points:', pointsEarned);
        recordAIGameResult(player1Won, pointsEarned);
      }
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    if ((FORCE_SHOW_COIN || player1Won) && !hasShownCoinRef.current) {
      hasShownCoinRef.current = true;
      
      setTimeout(() => {
        setShowCoinReward(true);
        
        Animated.parallel([
          Animated.timing(coinAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(coinScaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();

        shineRotateAnim.setValue(0);
        const shineLoop = Animated.loop(
          Animated.timing(shineRotateAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false,
          })
        );
        shineLoop.start();
        coinAnimationsRef.current.push(shineLoop);

        glowAnim.setValue(0.5);
        const glowLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.5,
              duration: 800,
              useNativeDriver: false,
            }),
          ])
        );
        glowLoop.start();
        coinAnimationsRef.current.push(glowLoop);

        coinDismissTimeout.current = setTimeout(() => {
          coinAnimationsRef.current.forEach(anim => anim.stop());
          coinAnimationsRef.current = [];
          
          Animated.timing(coinAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowCoinReward(false);
          });
        }, 3500);
      }, 400);
    }

    return () => {
      if (coinDismissTimeout.current) {
        clearTimeout(coinDismissTimeout.current);
        coinDismissTimeout.current = null;
      }
      coinAnimationsRef.current.forEach(anim => anim.stop());
      coinAnimationsRef.current = [];
    };
  }, [player1Won, isAuthenticated, recordAIGameResult, awardGameWin, recordGameMutation, gameState]);

  useEffect(() => {
    if (!gameState) {
      router.replace('/');
    }
  }, [gameState, router]);

  if (!gameState) {
    return null;
  }

  // Use rounds won to determine winner display (already calculated above)
  const displayPlayer1Won = player1Won;
  const displayPlayer2Won = player2Won;
  
  // Calculate actual rounds won (cap at 2 for best of 3)
  const player1RoundsDisplay = Math.min(gameState.player1.roundsWon, 2);
  const player2RoundsDisplay = Math.min(gameState.player2.roundsWon, 2);

  const shineRotate = shineRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
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
      
      {/* Reward Coin Overlay */}
      {(FORCE_SHOW_COIN || player1Won) && showCoinReward && (
        <View style={styles.coinOverlayContainer} pointerEvents="none">
          <Animated.View style={[
            styles.coinOverlay,
            {
              opacity: coinAnim,
              transform: [{ scale: coinScaleAnim }],
            },
          ]}>
            {/* Light Rays - Rotating */}
            <Animated.View 
              style={[
                styles.raysContainer,
                { 
                  transform: [{ rotate: shineRotate }],
                  opacity: glowAnim,
                },
              ]}
            >
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <View 
                  key={deg} 
                  style={[
                    styles.lightRay, 
                    { transform: [{ rotate: `${deg}deg` }] }
                  ]} 
                />
              ))}
            </Animated.View>
            {/* Secondary shorter rays - Rotating in opposite direction */}
            <Animated.View 
              style={[
                styles.raysContainerInner,
                { 
                  transform: [{ rotate: shineRotate }],
                  opacity: glowAnim,
                },
              ]}
            >
              {[15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map((deg) => (
                <View 
                  key={deg} 
                  style={[
                    styles.lightRayShort, 
                    { transform: [{ rotate: `${deg}deg` }] }
                  ]} 
                />
              ))}
            </Animated.View>
            {/* Static Coin */}
            <View style={styles.coinWrapper}>
              <GoldenGhostCoin size={80} />
            </View>
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardText}>+1 Coin</Text>
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
            {displayPlayer1Won 
              ? (gameState.player1.name === 'You' ? 'You Won!' : `${gameState.player1.name} Wins!`)
              : `${gameState.player2.name} Wins!`}
          </Text>

          <View style={styles.finalScoresContainer}>
            <View style={[
              styles.finalScoreBox,
              displayPlayer1Won && styles.winnerBox,
            ]}>
              <Text style={styles.finalPlayerName}>{gameState.player1.name}</Text>
              <Text style={styles.finalScore}>{player1RoundsDisplay}</Text>
              {displayPlayer1Won && <Text style={styles.winnerLabel}>Winner!</Text>}
            </View>

            <View style={[
              styles.finalScoreBox,
              displayPlayer2Won && styles.winnerBox,
            ]}>
              <Text style={styles.finalPlayerName}>{gameState.player2.name}</Text>
              <Text style={styles.finalScore}>{player2RoundsDisplay}</Text>
              {displayPlayer2Won && <Text style={styles.winnerLabel}>Winner!</Text>}
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
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  raysContainer: {
    position: 'absolute' as const,
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raysContainerInner: {
    position: 'absolute' as const,
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightRay: {
    position: 'absolute' as const,
    width: 6,
    height: 300,
    backgroundColor: 'transparent',
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderLeftColor: 'rgba(255, 215, 0, 0.8)',
    borderRightColor: 'rgba(255, 215, 0, 0.8)',
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  lightRayShort: {
    position: 'absolute' as const,
    width: 4,
    height: 220,
    backgroundColor: 'rgba(255, 235, 100, 0.6)',
  },
  coinWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardBadge: {
    marginTop: 16,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1a1a2e',
  },
});
