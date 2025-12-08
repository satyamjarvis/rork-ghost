import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useGame } from '@/contexts/GameContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { ArrowRight } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
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
  }, [fadeAnim, scaleAnim, letterAnims, winLossAnim, bounceAnim]);

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
      nextRound();
      setTimeout(() => {
        router.replace('/game-over');
      }, 100);
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
