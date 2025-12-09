import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '@/contexts/GameContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { Cpu, Users, Settings as SettingsIcon, ShoppingBag, Mail, Trophy, User, LogIn } from 'lucide-react-native';
import { useRef, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import FloatingGhost from '@/components/FloatingGhost';
import GoldenGhostCoin from '@/components/GoldenGhostCoin';
import type { AIDifficulty } from '@/types/store';
import { useAnimatedBackground } from '@/hooks/useAnimatedBackground';

export default function HomeScreen() {
  const router = useRouter();
  const { startGame, aiDifficulty, setAIDifficulty } = useGame();
  const { wallet, settings, setAIDifficulty: saveAIDifficulty } = usePlayer();
  const { isAuthenticated, signOut } = useAuth();
  const { pendingInvites, activeGames } = useMultiplayer();
  const scaleAnim1 = useRef(new Animated.Value(1)).current;
  const scaleAnim2 = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const settingsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setAIDifficulty(settings.aiDifficulty);
  }, [settings.aiDifficulty, setAIDifficulty]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleModeSelect = (mode: 'ai') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    startGame(mode);
    router.push('/game');
  };

  const handleMultiplayer = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isAuthenticated) {
      router.push('/multiplayer');
    } else {
      router.push('/auth');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await signOut();
  };



  const handleToggleSettings = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const toValue = showSettings ? 0 : 1;
    setShowSettings(!showSettings);
    Animated.spring(settingsAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const handleSetDifficulty = (difficulty: AIDifficulty) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setAIDifficulty(difficulty);
  };

  const handleSaveSettings = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    saveAIDifficulty(aiDifficulty);
    Alert.alert('Settings Saved', `AI difficulty set to ${aiDifficulty.toUpperCase()}`);
  };

  const createPressAnimation = (scaleAnim: Animated.Value) => {
    return {
      onPressIn: () => {
        Animated.spring(scaleAnim, {
          toValue: 0.95,
          useNativeDriver: true,
        }).start();
      },
      onPressOut: () => {
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }).start();
      },
    };
  };

  const { topColor, middleColor, bottomColor } = useAnimatedBackground();

  return (
    <Animated.View style={[styles.container, {
      backgroundColor: middleColor,
    }]}>
      <Animated.View style={[StyleSheet.absoluteFill, {
        backgroundColor: topColor,
      }]} />
      <Animated.View style={[StyleSheet.absoluteFill, {
        backgroundColor: bottomColor,
        opacity: 0.7,
      }]} />
      <View style={styles.contentWrapper}>
      <FloatingGhost />
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.coinDisplay}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            router.push('/store');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.coinText}>{wallet.ghostCoins}</Text>
          <GoldenGhostCoin size={20} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.leaderboardButton}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            router.push('/leaderboard');
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.5)', 'rgba(255, 215, 0, 0.2)']}
            style={styles.leaderboardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Trophy color={COLORS.white} size={20} />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.storeButton}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            router.push('/store');
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255, 199, 87, 0.5)', 'rgba(255, 199, 87, 0.2)']}
            style={styles.storeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <ShoppingBag color={COLORS.white} size={20} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.leftButtonsContainer}>
        <TouchableOpacity style={styles.settingsButton} onPress={handleToggleSettings}>
          <LinearGradient
            colors={showSettings ? ['rgba(255, 199, 87, 0.5)', 'rgba(255, 199, 87, 0.2)'] : ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
            style={styles.settingsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <SettingsIcon color={showSettings ? COLORS.gold : COLORS.white} size={20} />
          </LinearGradient>
        </TouchableOpacity>
        {isAuthenticated ? (
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              router.push('/profile');
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(100, 181, 246, 0.5)', 'rgba(100, 181, 246, 0.2)']}
              style={styles.profileGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <User color={COLORS.white} size={20} />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.signInWithHint}>
            <TouchableOpacity 
              style={styles.signInButton}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                router.push('/auth');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(76, 175, 80, 0.5)', 'rgba(76, 175, 80, 0.2)']}
                style={styles.signInGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <LogIn color={COLORS.white} size={20} />
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.hintContainer}>
              <Text style={styles.hintArrow}>↖</Text>
              <Text style={styles.hintText}>sign in to track{"\n"}your stats!</Text>
            </View>
          </View>
        )}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.title}>GHOST</Text>
          <Text style={styles.subtitle}>The Word Game</Text>
        </View>

        <View style={styles.modesContainer}>
          <Animated.View style={{ transform: [{ scale: scaleAnim1 }] }}>
            <TouchableOpacity
              style={styles.modeButton}
              onPress={() => handleModeSelect('ai')}
              activeOpacity={0.9}
              {...createPressAnimation(scaleAnim1)}
            >
              <LinearGradient
                colors={[COLORS.gold, COLORS.goldLight]}
                style={styles.modeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.iconContainer}>
                  <Cpu color={COLORS.white} size={48} strokeWidth={2} />
                </View>
                <Text style={styles.modeTitle}>Play vs AI</Text>
                <Text style={styles.modeDescription}>Challenge the computer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Multiplayer button hidden - code preserved for future use
          <Animated.View style={{ transform: [{ scale: scaleAnim2 }] }}>
            <TouchableOpacity
              style={styles.modeButton}
              onPress={handleMultiplayer}
              activeOpacity={0.9}
              {...createPressAnimation(scaleAnim2)}
            >
              <LinearGradient
                colors={['#4A90D9', '#6BB3F0']}
                style={styles.modeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.iconContainer}>
                  <Users color={COLORS.white} size={48} strokeWidth={2} />
                </View>
                <Text style={styles.modeTitle}>Play vs Player</Text>
                <Text style={styles.modeDescription}>
                  {isAuthenticated ? `${activeGames.length} active games` : 'Sign in to play online'}
                </Text>
                {pendingInvites.length > 0 && (
                  <View style={styles.inviteBadge}>
                    <Mail color={COLORS.white} size={12} />
                    <Text style={styles.inviteBadgeText}>{pendingInvites.length}</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          */}
        </View>

        {showSettings && (
          <Animated.View style={[styles.settingsPanel, {
            opacity: settingsAnim,
            transform: [{
              translateY: settingsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            }],
          }]}>
            <Text style={styles.settingsTitle}>AI Difficulty</Text>
            <View style={styles.difficultyButtons}>
              {(['easy', 'medium', 'hard', 'superior'] as AIDifficulty[]).map((difficulty) => (
                <TouchableOpacity
                  key={difficulty}
                  style={[
                    styles.difficultyButton,
                    aiDifficulty === difficulty && styles.difficultyButtonActive,
                  ]}
                  onPress={() => handleSetDifficulty(difficulty)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.difficultyButtonText,
                      aiDifficulty === difficulty && styles.difficultyButtonTextActive,
                    ]}
                  >
                    {difficulty === 'superior' ? 'SUPERIOR' : difficulty.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.difficultyDescription}>
              {aiDifficulty === 'easy' && 'The AI will make safe moves with occasional mistakes'}
              {aiDifficulty === 'medium' && 'The AI will play strategically with good moves'}
              {aiDifficulty === 'hard' && 'The AI will play very strategically and make excellent moves'}
              {aiDifficulty === 'superior' && 'The AI will play at superhuman level with optimal strategy'}
            </Text>
            
            {aiDifficulty !== settings.aiDifficulty && (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveSettings}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.gold, COLORS.goldLight]}
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.saveButtonText}>Save Settings</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {!showSettings && (
          <View style={styles.rulesContainer}>
            <Text style={styles.rulesTitle}>How to Play</Text>
            <Text style={styles.rulesText}>
              • Take turns adding one letter at a time{'\n'}
              • Build toward a word without completing it{'\n'}
              • Don&apos;t complete words of 4+ letters{'\n'}
              • Don&apos;t make an impossible word{'\n'}
              • Best of 3 rounds wins!
            </Text>
          </View>
        )}
      </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
    marginTop: 140,
  },
  title: {
    fontSize: 56,
    fontWeight: '800' as const,
    color: COLORS.white,
    marginBottom: 4,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    letterSpacing: 3,
  },
  modesContainer: {
    gap: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  modeButton: {
    borderRadius: 24,
    overflow: 'hidden' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    height: 120,
    width: 240,
  },
  modeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 6,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.white,
    marginBottom: 2,
    textAlign: 'center' as const,
  },
  modeDescription: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    textAlign: 'center' as const,
  },
  rulesContainer: {
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  rulesTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.white,
    marginBottom: 12,
  },
  rulesText: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    lineHeight: 24,
  },
  topBar: {
    position: 'absolute' as const,
    top: 70,
    right: 24,
    left: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 199, 87, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 199, 87, 0.4)',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  coinText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  coinEmoji: {
    fontSize: 20,
  },
  leftButtonsContainer: {
    position: 'absolute' as const,
    top: 70,
    left: 24,
    flexDirection: 'row',
    gap: 10,
    zIndex: 10,
  },
  settingsButton: {
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileButton: {
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(100, 181, 246, 0.4)',
    borderRadius: 16,
  },
  signInButton: {
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signInGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.4)',
    borderRadius: 16,
  },
  signInWithHint: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    marginLeft: 4,
  },
  hintArrow: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.85)',
    marginRight: 4,
    fontWeight: '300' as const,
    transform: [{ rotate: '-15deg' }],
  },
  hintText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic' as const,
    lineHeight: 14,
    fontWeight: '300' as const,
  },
  settingsGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
  },
  settingsPanel: {
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.white,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  difficultyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
    justifyContent: 'center',
  },
  difficultyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  difficultyButtonActive: {
    backgroundColor: COLORS.goldLight,
    borderColor: COLORS.gold,
  },
  difficultyButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  difficultyButtonTextActive: {
    color: COLORS.white,
    fontWeight: '700' as const,
  },
  difficultyDescription: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  saveButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    overflow: 'hidden' as const,
    marginTop: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  leaderboardButton: {
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  leaderboardGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    borderRadius: 16,
  },
  storeButton: {
    borderRadius: 16,
    overflow: 'hidden' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  storeGradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 199, 87, 0.4)',
    borderRadius: 16,
  },
  inviteBadge: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inviteBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
});
