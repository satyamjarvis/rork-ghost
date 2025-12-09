import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, ActivityIndicator, TextInput, Image, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, COLOR_SCHEMES } from '@/constants/colors';
import FloatingGhost from '@/components/FloatingGhost';
import GoldenGhostCoin from '@/components/GoldenGhostCoin';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Edit2, Trophy, Bomb, Check, X, User, Cpu, Users, Flame, Target } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, user, isAuthenticated, refreshProfile, signOut, getAIStats, getPVPStats } = useAuth();
  const { wallet, inventory } = usePlayer();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);

  const aiStats = getAIStats();
  const pvpStats = getPVPStats();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (profile) {
      setNewUsername(profile.username);
    }
  }, [profile]);

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.back();
  };

  const handleStartEditUsername = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsEditingUsername(true);
    setNewUsername(profile?.username || '');
  };

  const handleCancelEdit = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsEditingUsername(false);
    setNewUsername(profile?.username || '');
  };

  const handleSaveUsername = async () => {
    if (!user || !newUsername.trim()) return;
    
    const trimmedUsername = newUsername.trim().toLowerCase();
    
    if (trimmedUsername.length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters');
      return;
    }

    if (trimmedUsername.length > 20) {
      Alert.alert('Invalid Username', 'Username must be 20 characters or less');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
      Alert.alert('Invalid Username', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsUpdating(true);

    try {
      const { data: available } = await supabase
        .rpc('check_username_available', { check_username: trimmedUsername });

      if (!available && trimmedUsername !== profile?.username) {
        Alert.alert('Username Taken', 'This username is already in use');
        setIsUpdating(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ username: trimmedUsername })
        .eq('user_id', user.id);

      if (error) {
        console.error('[Profile] Error updating username:', error);
        Alert.alert('Error', 'Failed to update username');
      } else {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        await refreshProfile();
        setIsEditingUsername(false);
      }
    } catch (err) {
      console.error('[Profile] Exception updating username:', err);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePickImage = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a photo');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user) return;

    setIsUploadingAvatar(true);

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) {
        console.error('[Profile] Upload error:', uploadError);
        Alert.alert('Upload Failed', 'Failed to upload image');
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[Profile] Update avatar URL error:', updateError);
        Alert.alert('Error', 'Failed to update profile');
      } else {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        await refreshProfile();
      }
    } catch (err) {
      console.error('[Profile] Exception uploading avatar:', err);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/');
          }
        },
      ]
    );
  };

  const calculateWinRate = (wins: number, losses: number): number => {
    const total = wins + losses;
    return total > 0 ? Math.round((wins / total) * 100) : 0;
  };

  const aiWinRate = calculateWinRate(aiStats.wins, aiStats.losses);
  const pvpWinRate = calculateWinRate(pvpStats.wins, pvpStats.losses);
  const totalWinRate = calculateWinRate(profile?.wins || 0, profile?.losses || 0);

  return (
    <LinearGradient
      colors={[COLOR_SCHEMES.peachy.top, COLOR_SCHEMES.peachy.middle, COLOR_SCHEMES.peachy.bottom]}
      style={styles.container}
      locations={[0, 0.5, 1]}
    >
      <FloatingGhost />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft color={COLORS.white} size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.avatarSection}>
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={handlePickImage}
                disabled={isUploadingAvatar}
                activeOpacity={0.8}
              >
                {isUploadingAvatar ? (
                  <View style={styles.avatarPlaceholder}>
                    <ActivityIndicator color={COLORS.white} size="large" />
                  </View>
                ) : profile?.avatar_url ? (
                  <Image 
                    source={{ uri: profile.avatar_url }} 
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <User color={COLORS.whiteTransparent} size={48} />
                  </View>
                )}
                <View style={styles.cameraOverlay}>
                  <Camera color={COLORS.white} size={20} />
                </View>
              </TouchableOpacity>

              <View style={styles.usernameSection}>
                {isEditingUsername ? (
                  <View style={styles.editUsernameContainer}>
                    <TextInput
                      style={styles.usernameInput}
                      value={newUsername}
                      onChangeText={setNewUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={20}
                      placeholder="Username"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                    <View style={styles.editActions}>
                      <TouchableOpacity 
                        style={styles.editActionButton}
                        onPress={handleCancelEdit}
                        disabled={isUpdating}
                      >
                        <X color="#FF6B6B" size={20} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.editActionButton, styles.saveButton]}
                        onPress={handleSaveUsername}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                          <Check color={COLORS.white} size={20} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.usernameDisplay}
                    onPress={handleStartEditUsername}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.username}>@{profile?.username}</Text>
                    <Edit2 color={COLORS.whiteTransparent} size={18} />
                  </TouchableOpacity>
                )}
                {profile?.display_name && profile.display_name !== profile.username && (
                  <Text style={styles.displayName}>{profile.display_name}</Text>
                )}
              </View>
            </View>

            <View style={styles.overallStatsCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.overallStatsGradient}
              >
                <View style={styles.overallStatsRow}>
                  <View style={styles.overallStatItem}>
                    <Text style={styles.overallStatValue}>{profile?.wins || 0}</Text>
                    <Text style={styles.overallStatLabel}>Total Wins</Text>
                  </View>
                  <View style={styles.overallStatDivider} />
                  <View style={styles.overallStatItem}>
                    <Text style={styles.overallStatValue}>{profile?.losses || 0}</Text>
                    <Text style={styles.overallStatLabel}>Total Losses</Text>
                  </View>
                  <View style={styles.overallStatDivider} />
                  <View style={styles.overallStatItem}>
                    <Text style={styles.overallStatValue}>{totalWinRate}%</Text>
                    <Text style={styles.overallStatLabel}>Win Rate</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.modeStatsSection}>
              <View style={styles.modeStatsCard}>
                <LinearGradient
                  colors={['rgba(255, 199, 87, 0.25)', 'rgba(255, 199, 87, 0.08)']}
                  style={styles.modeStatsGradient}
                >
                  <View style={styles.modeHeader}>
                    <View style={styles.modeIconContainer}>
                      <Cpu color={COLORS.gold} size={24} />
                    </View>
                    <Text style={styles.modeTitle}>vs AI</Text>
                  </View>
                  
                  <View style={styles.modeStatsGrid}>
                    <View style={styles.modeStatItem}>
                      <Trophy color="#4CAF50" size={20} />
                      <Text style={styles.modeStatValue}>{aiStats.wins}</Text>
                      <Text style={styles.modeStatLabel}>Wins</Text>
                    </View>
                    <View style={styles.modeStatItem}>
                      <X color="#FF6B6B" size={20} />
                      <Text style={styles.modeStatValue}>{aiStats.losses}</Text>
                      <Text style={styles.modeStatLabel}>Losses</Text>
                    </View>
                    <View style={styles.modeStatItem}>
                      <Target color="#64B5F6" size={20} />
                      <Text style={styles.modeStatValue}>{aiWinRate}%</Text>
                      <Text style={styles.modeStatLabel}>Win Rate</Text>
                    </View>
                  </View>

                  <View style={styles.modeExtrasRow}>
                    <View style={styles.modeExtraItem}>
                      <Flame color="#FF9800" size={16} />
                      <Text style={styles.modeExtraText}>Streak: {aiStats.winStreak}</Text>
                    </View>
                    <View style={styles.modeExtraItem}>
                      <Trophy color={COLORS.gold} size={16} />
                      <Text style={styles.modeExtraText}>Best: {aiStats.longestWinStreak}</Text>
                    </View>
                    <View style={styles.modeExtraItem}>
                      <Text style={styles.pointsEmoji}>⭐</Text>
                      <Text style={styles.modeExtraText}>{aiStats.points.toLocaleString()} pts</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.modeStatsCard}>
                <LinearGradient
                  colors={['rgba(100, 181, 246, 0.25)', 'rgba(100, 181, 246, 0.08)']}
                  style={styles.modeStatsGradient}
                >
                  <View style={styles.modeHeader}>
                    <View style={[styles.modeIconContainer, styles.pvpIconContainer]}>
                      <Users color="#64B5F6" size={24} />
                    </View>
                    <Text style={styles.modeTitle}>vs Player</Text>
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Coming Soon</Text>
                    </View>
                  </View>
                  
                  <View style={styles.modeStatsGrid}>
                    <View style={styles.modeStatItem}>
                      <Trophy color="#4CAF50" size={20} />
                      <Text style={styles.modeStatValue}>{pvpStats.wins}</Text>
                      <Text style={styles.modeStatLabel}>Wins</Text>
                    </View>
                    <View style={styles.modeStatItem}>
                      <X color="#FF6B6B" size={20} />
                      <Text style={styles.modeStatValue}>{pvpStats.losses}</Text>
                      <Text style={styles.modeStatLabel}>Losses</Text>
                    </View>
                    <View style={styles.modeStatItem}>
                      <Target color="#64B5F6" size={20} />
                      <Text style={styles.modeStatValue}>{pvpWinRate}%</Text>
                      <Text style={styles.modeStatLabel}>Win Rate</Text>
                    </View>
                  </View>

                  <View style={styles.modeExtrasRow}>
                    <View style={styles.modeExtraItem}>
                      <Flame color="#FF9800" size={16} />
                      <Text style={styles.modeExtraText}>Streak: {pvpStats.winStreak}</Text>
                    </View>
                    <View style={styles.modeExtraItem}>
                      <Trophy color={COLORS.gold} size={16} />
                      <Text style={styles.modeExtraText}>Best: {pvpStats.longestWinStreak}</Text>
                    </View>
                    <View style={styles.modeExtraItem}>
                      <Text style={styles.pointsEmoji}>⭐</Text>
                      <Text style={styles.modeExtraText}>{pvpStats.points.toLocaleString()} pts</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>

            <View style={styles.inventorySection}>
              <Text style={styles.sectionTitle}>Inventory</Text>
              <View style={styles.inventoryCard}>
                <LinearGradient
                  colors={['rgba(255, 199, 87, 0.2)', 'rgba(255, 199, 87, 0.05)']}
                  style={styles.inventoryGradient}
                >
                  <View style={styles.inventoryRow}>
                    <View style={styles.inventoryItem}>
                      <GoldenGhostCoin size={28} />
                      <View style={styles.inventoryInfo}>
                        <Text style={styles.inventoryValue}>{wallet.ghostCoins}</Text>
                        <Text style={styles.inventoryLabel}>Ghost Coins</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.inventoryDivider} />
                  <View style={styles.inventoryRow}>
                    <View style={styles.inventoryItem}>
                      <Bomb color={COLORS.gold} size={28} />
                      <View style={styles.inventoryInfo}>
                        <Text style={styles.inventoryValue}>{inventory.letterBombs}</Text>
                        <Text style={styles.inventoryLabel}>Letter Bombs</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative' as const,
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.whiteGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cameraOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLOR_SCHEMES.peachy.middle,
  },
  usernameSection: {
    alignItems: 'center',
  },
  usernameDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    marginTop: 4,
  },
  editUsernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usernameInput: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.white,
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 160,
    textAlign: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: COLORS.gold,
  },
  overallStatsCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  overallStatsGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  overallStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  overallStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  overallStatValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: COLORS.white,
  },
  overallStatLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
    marginTop: 4,
  },
  overallStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  modeStatsSection: {
    gap: 16,
    marginBottom: 24,
  },
  modeStatsCard: {
    borderRadius: 20,
    overflow: 'hidden' as const,
  },
  modeStatsGradient: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 199, 87, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pvpIconContainer: {
    backgroundColor: 'rgba(100, 181, 246, 0.2)',
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.white,
    flex: 1,
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(100, 181, 246, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#64B5F6',
  },
  modeStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  modeStatItem: {
    alignItems: 'center',
    gap: 6,
  },
  modeStatValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  modeStatLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
  },
  modeExtrasRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeExtraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeExtraText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
  },
  pointsEmoji: {
    fontSize: 14,
  },
  inventorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.whiteTransparent,
    marginBottom: 12,
  },
  inventoryCard: {
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  inventoryGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 199, 87, 0.3)',
  },
  inventoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  inventoryInfo: {
    gap: 2,
  },
  inventoryValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  inventoryLabel: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
  },
  inventoryDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FF6B6B',
  },
  bottomPadding: {
    height: 40,
  },
});
