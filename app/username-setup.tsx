import { StyleSheet, Text, View, TouchableOpacity, TextInput, Animated, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { COLORS, COLOR_SCHEMES } from '@/constants/colors';
import FloatingGhost from '@/components/FloatingGhost';
import { Check, AlertCircle } from 'lucide-react-native';

export default function UsernameSetupScreen() {
  const router = useRouter();
  const { createProfile, isAuthenticated, needsUsername } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [username, setUsername] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    } else if (!needsUsername) {
      router.replace('/auth');
    }
  }, [isAuthenticated, needsUsername, router]);

  const validateUsername = (value: string): string | null => {
    if (value.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (value.length > 20) {
      return 'Username must be 20 characters or less';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    return null;
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setError('');
  };

  const handleSubmit = async () => {
    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSubmitting(true);
    const { error: createError } = await createProfile(username);
    setIsSubmitting(false);

    if (createError) {
      setError(createError.message || 'Failed to create profile');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const isValid = username.length >= 3 && !validateUsername(username);

  return (
    <LinearGradient
      colors={[COLOR_SCHEMES.peachy.top, COLOR_SCHEMES.peachy.middle, COLOR_SCHEMES.peachy.bottom]}
      style={styles.container}
      locations={[0, 0.5, 1]}
    >
      <FloatingGhost />
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose Your</Text>
            <Text style={styles.titleHighlight}>Username</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>This is how other players will see you</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder="Enter username"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
              {isValid && !error && (
                <View style={styles.validIcon}>
                  <Check color={COLORS.gold} size={20} />
                </View>
              )}
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <AlertCircle color="#FF6B6B" size={16} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <Text style={styles.hintText}>
                3-20 characters, letters, numbers, and underscores only
              </Text>
            )}

            <TouchableOpacity
              style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={!isValid || isSubmitting}
            >
              <LinearGradient
                colors={isValid ? [COLORS.gold, COLORS.goldLight] : ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={[styles.submitButtonText, !isValid && styles.submitButtonTextDisabled]}>
                    Continue
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    marginBottom: 4,
  },
  titleHighlight: {
    fontSize: 42,
    fontWeight: '800' as const,
    color: COLORS.white,
    letterSpacing: 2,
  },
  formContainer: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
    textAlign: 'center',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative' as const,
  },
  input: {
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.white,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    textAlign: 'center',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  validIcon: {
    position: 'absolute' as const,
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#FF6B6B',
  },
  hintText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  submitButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
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
});
