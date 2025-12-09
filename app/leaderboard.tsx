import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform, ActivityIndicator, FlatList, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { COLORS, COLOR_SCHEMES } from '@/constants/colors';
import FloatingGhost from '@/components/FloatingGhost';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trophy, Medal, Crown, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  all_time_points: number;
  wins: number;
  losses: number;
  rank: number;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [userRank, setUserRank] = useState<number | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    console.log('[Leaderboard] Fetching top 100 players');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, all_time_points, wins, losses')
        .order('all_time_points', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[Leaderboard] Error fetching:', JSON.stringify(error, null, 2));
        console.error('[Leaderboard] Error message:', error.message);
        console.error('[Leaderboard] Error details:', error.details);
        return;
      }

      const rankedData = (data || []).map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

      setLeaderboard(rankedData);

      if (user) {
        const userEntry = rankedData.find(e => e.user_id === user.id);
        if (userEntry) {
          setUserRank(userEntry.rank);
        } else {
          try {
            const { data: rankData, error: rankError } = await supabase
              .rpc('get_user_leaderboard_rank', { target_user_id: user.id });
            if (rankError) {
              console.log('[Leaderboard] User rank RPC not available:', rankError.message);
              setUserRank(null);
            } else {
              setUserRank(rankData || null);
            }
          } catch (err) {
            console.log('[Leaderboard] User rank calculation skipped');
            setUserRank(null);
          }
        }
      }
    } catch (err) {
      console.error('[Leaderboard] Exception:', JSON.stringify(err, null, 2));
      console.error('[Leaderboard] Exception details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  }, [fetchLeaderboard]);

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.back();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown color="#FFD700" size={24} />;
      case 2:
        return <Medal color="#C0C0C0" size={22} />;
      case 3:
        return <Medal color="#CD7F32" size={22} />;
      default:
        return <Text style={styles.rankNumber}>{rank}</Text>;
    }
  };

  const getRankBackground = (rank: number) => {
    switch (rank) {
      case 1:
        return ['rgba(255, 215, 0, 0.3)', 'rgba(255, 215, 0, 0.1)'];
      case 2:
        return ['rgba(192, 192, 192, 0.3)', 'rgba(192, 192, 192, 0.1)'];
      case 3:
        return ['rgba(205, 127, 50, 0.3)', 'rgba(205, 127, 50, 0.1)'];
      default:
        return ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'];
    }
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = item.user_id === user?.id;
    
    return (
      <Animated.View
        style={[
          styles.leaderboardItem,
          isCurrentUser && styles.currentUserItem,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }
        ]}
      >
        <LinearGradient
          colors={getRankBackground(item.rank) as [string, string]}
          style={styles.itemGradient}
        >
          <View style={styles.rankContainer}>
            {getRankIcon(item.rank)}
          </View>

          <View style={styles.avatarContainer}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User color={COLORS.whiteTransparent} size={20} />
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.username, isCurrentUser && styles.currentUserText]}>
              {item.username}
              {isCurrentUser && ' (You)'}
            </Text>
            <Text style={styles.winLoss}>
              {item.wins}W - {item.losses}L
            </Text>
          </View>

          <View style={styles.pointsContainer}>
            <Text style={styles.pointsValue}>{item.all_time_points.toLocaleString()}</Text>
            <Text style={styles.pointsLabel}>pts</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

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
            <View style={styles.headerCenter}>
              <Trophy color={COLORS.gold} size={24} />
              <Text style={styles.headerTitle}>Leaderboard</Text>
            </View>
            <View style={styles.headerRight} />
          </View>

          {userRank && userRank > 100 && (
            <View style={styles.userRankBanner}>
              <Text style={styles.userRankText}>Your Rank: #{userRank}</Text>
            </View>
          )}

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.gold} />
              <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
          ) : leaderboard.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Trophy color={COLORS.whiteTransparent} size={64} />
              <Text style={styles.emptyText}>No players yet</Text>
              <Text style={styles.emptySubtext}>Be the first to climb the ranks!</Text>
            </View>
          ) : (
            <FlatList
              data={leaderboard}
              renderItem={renderLeaderboardItem}
              keyExtractor={(item) => item.user_id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh} 
                  tintColor={COLORS.white} 
                />
              }
              ListHeaderComponent={
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderText}>Top 100 Players</Text>
                  <Text style={styles.listHeaderSubtext}>Ranked by all-time points</Text>
                </View>
              }
            />
          )}
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  headerRight: {
    width: 40,
  },
  userRankBanner: {
    backgroundColor: 'rgba(255, 199, 87, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 199, 87, 0.4)',
  },
  userRankText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.gold,
    textAlign: 'center' as const,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    textAlign: 'center' as const,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  listHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  listHeaderText: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: COLORS.white,
  },
  listHeaderSubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    marginTop: 4,
  },
  leaderboardItem: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden' as const,
  },
  currentUserItem: {
    borderWidth: 2,
    borderColor: COLORS.gold,
    borderRadius: 16,
  },
  itemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.whiteTransparent,
  },
  avatarContainer: {
    marginLeft: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.whiteGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  username: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  currentUserText: {
    color: COLORS.gold,
  },
  winLoss: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    marginTop: 2,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: COLORS.gold,
  },
  pointsLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
    marginTop: 1,
  },
});
