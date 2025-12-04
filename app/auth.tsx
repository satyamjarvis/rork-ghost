import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { COLORS, COLOR_SCHEMES } from '@/constants/colors';
import FloatingGhost from '@/components/FloatingGhost';

export default function AuthScreen() {
  const router = useRouter();
  const { signInWithApple, isAuthenticated, needsUsername, isLoading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState<boolean>(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
    }
  }, [fadeAnim]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    } else if (needsUsername) {
      router.replace('/username-setup');
    }
  }, [isAuthenticated, needsUsername, router]);

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSigningIn(true);
    const { error } = await signInWithApple();
    
    if (error) {
      console.error('[Auth] Sign in error:', error);
    }
    
    setIsSigningIn(false);
  };

  const handleSkip = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace('/');
  };

  const createPressAnimation = () => ({
    onPressIn: () => {
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    },
    onPressOut: () => {
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    },
  });

  if (isLoading) {
    return (
      <LinearGradient
        colors={[COLOR_SCHEMES.peachy.top, COLOR_SCHEMES.peachy.middle, COLOR_SCHEMES.peachy.bottom]}
        style={styles.container}
        locations={[0, 0.5, 1]}
      >
        <ActivityIndicator size="large" color={COLORS.white} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[COLOR_SCHEMES.peachy.top, COLOR_SCHEMES.peachy.middle, COLOR_SCHEMES.peachy.bottom]}
      style={styles.container}
      locations={[0, 0.5, 1]}
    >
      <FloatingGhost />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.title}>GHOST</Text>
          <Text style={styles.subtitle}>Word Game</Text>
        </View>

        <View style={styles.messageContainer}>
          <Text style={styles.welcomeText}>Welcome!</Text>
          <Text style={styles.descriptionText}>
            Sign in to play against friends and other players online
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          {Platform.OS === 'ios' && appleAuthAvailable && (
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={styles.appleButton}
                onPress={handleAppleSignIn}
                activeOpacity={0.9}
                disabled={isSigningIn}
                {...createPressAnimation()}
              >
                <View style={styles.appleButtonInner}>
                  {isSigningIn ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.appleIcon}></Text>
                      <Text style={styles.appleButtonText}>Sign in with Apple</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {Platform.OS === 'web' && (
            <View style={styles.webNotice}>
              <Text style={styles.webNoticeText}>
                Apple Sign In is available on iOS devices only.
                {'\n'}Download the app to access multiplayer features.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Play Offline Only</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By signing in, you agree to our Terms of Service
          </Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 64,
    fontWeight: '800' as const,
    color: COLORS.white,
    marginBottom: 8,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    letterSpacing: 3,
  },
  messageContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: COLORS.white,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonsContainer: {
    gap: 16,
    alignItems: 'center',
  },
  appleButton: {
    width: 280,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appleButtonInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  appleIcon: {
    fontSize: 20,
    color: COLORS.white,
  },
  appleButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  webNotice: {
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
  },
  webNoticeText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 20,
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});
