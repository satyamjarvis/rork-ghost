import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Platform, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { COLORS, COLOR_SCHEMES } from '@/constants/colors';
import FloatingGhost from '@/components/FloatingGhost';
import SwipeableGameCard from '@/components/SwipeableGameCard';
import { ArrowLeft, Search, Users, Mail, Gamepad2, Trophy, Clock, X, Check, Loader2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'games' | 'find' | 'invites';

export default function MultiplayerScreen() {
  const router = useRouter();
  const { profile, isAuthenticated, user } = useAuth();
  const { 
    activeGames, 
    completedGames,
    pendingInvites,
    sentInvites,
    isInQueue,
    joinMatchmaking,
    leaveMatchmaking,
    searchUserByUsername,
    sendGameInvite,
    acceptInvite,
    declineInvite,
    cancelSentInvite,
    fetchActiveGames,
    fetchPendingInvites,
    loadGame,
    deleteGame,
  } = useMultiplayer();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState<Tab>('games');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchActiveGames(), fetchPendingInvites()]);
    setRefreshing(false);
  }, [fetchActiveGames, fetchPendingInvites]);

  const handleSearch = useCallback(async () => {
    if (searchQuery.length < 2) return;
    
    setIsSearching(true);
    const results = await searchUserByUsername(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  }, [searchQuery, searchUserByUsername]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.back();
  };

  const handleFindMatch = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    const result = await joinMatchmaking();
    if (result.data) {
      router.push({ pathname: '/multiplayer-game', params: { id: result.data.id } });
    }
  };

  const handleCancelQueue = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await leaveMatchmaking();
  };

  const handleSendInvite = async (toUserId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await sendGameInvite(toUserId);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAcceptInvite = async (inviteId: string, fromUserId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const result = await acceptInvite(inviteId, fromUserId);
    if (result.data) {
      router.push({ pathname: '/multiplayer-game', params: { id: result.data.id } });
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await declineInvite(inviteId);
  };

  const handleCancelSentInvite = async (inviteId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await cancelSentInvite(inviteId);
  };

  const handleOpenGame = async (gameId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await loadGame(gameId);
    router.push({ pathname: '/multiplayer-game', params: { id: gameId } });
  };

  const handleDeleteGame = async (gameId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await deleteGame(gameId);
  };

  const renderGamesTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />
      }
    >
      {isInQueue && (
        <View style={styles.queueBanner}>
          <View style={styles.queueContent}>
            <Loader2 color={COLORS.gold} size={24} />
            <View style={styles.queueTextContainer}>
              <Text style={styles.queueTitle}>Finding Match...</Text>
              <Text style={styles.queueSubtitle}>Waiting for an opponent</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.cancelQueueButton} onPress={handleCancelQueue}>
            <X color={COLORS.white} size={20} />
          </TouchableOpacity>
        </View>
      )}

      {!isInQueue && (
        <TouchableOpacity style={styles.findMatchButton} onPress={handleFindMatch} activeOpacity={0.8}>
          <LinearGradient
            colors={[COLORS.gold, COLORS.goldLight]}
            style={styles.findMatchGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Search color={COLORS.white} size={24} />
            <Text style={styles.findMatchText}>Find Random Match</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Active Games ({activeGames.length})</Text>
      {activeGames.length === 0 ? (
        <View style={styles.emptyState}>
          <Gamepad2 color={COLORS.whiteTransparent} size={48} />
          <Text style={styles.emptyStateText}>No active games</Text>
          <Text style={styles.emptyStateSubtext}>Find a match or challenge a friend!</Text>
        </View>
      ) : (
        activeGames.map((game: any) => {
          const isPlayer1 = game.player1_id === user?.id;
          const opponent = isPlayer1 ? game.player2_profile : game.player1_profile;
          const isMyTurn = game.current_turn === user?.id;
          const myScore = isPlayer1 ? game.player1_rounds_won : game.player2_rounds_won;
          const opponentScore = isPlayer1 ? game.player2_rounds_won : game.player1_rounds_won;
          
          return (
            <SwipeableGameCard
              key={game.id}
              gameId={game.id}
              onPress={() => handleOpenGame(game.id)}
              onDelete={() => handleDeleteGame(game.id)}
            >
              <View style={styles.gameCard}>
                <View style={styles.gameCardHeader}>
                  <Text style={styles.opponentName}>
                    vs {opponent?.username || 'Waiting...'}
                  </Text>
                  <View style={[styles.turnBadge, isMyTurn && styles.turnBadgeActive]}>
                    <Text style={[styles.turnBadgeText, isMyTurn && styles.turnBadgeTextActive]}>
                      {isMyTurn ? 'Your Turn' : 'Their Turn'}
                    </Text>
                  </View>
                </View>
                <View style={styles.gameCardContent}>
                  <Text style={styles.gameWord}>{game.current_word || '...'}</Text>
                  <Text style={styles.gameScore}>{myScore} - {opponentScore}</Text>
                </View>
              </View>
            </SwipeableGameCard>
          );
        })
      )}

      {completedGames.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Games</Text>
          {completedGames.slice(0, 5).map((game: any) => {
            const isPlayer1 = game.player1_id === user?.id;
            const opponent = isPlayer1 ? game.player2_profile : game.player1_profile;
            const didWin = game.winner_id === user?.id;
            const myScore = isPlayer1 ? game.player1_rounds_won : game.player2_rounds_won;
            const opponentScore = isPlayer1 ? game.player2_rounds_won : game.player1_rounds_won;
            
            return (
              <View key={game.id} style={[styles.gameCard, styles.completedGameCard]}>
                <View style={styles.gameCardHeader}>
                  <Text style={styles.opponentName}>vs {opponent?.username || 'Unknown'}</Text>
                  <View style={[styles.resultBadge, didWin ? styles.winBadge : styles.loseBadge]}>
                    <Trophy color={COLORS.white} size={14} />
                    <Text style={styles.resultBadgeText}>{didWin ? 'Won' : 'Lost'}</Text>
                  </View>
                </View>
                <Text style={styles.gameScore}>{myScore} - {opponentScore}</Text>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );

  const renderFindTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <Search color={COLORS.whiteTransparent} size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username"
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isSearching && <ActivityIndicator color={COLORS.gold} size="small" />}
      </View>

      <ScrollView style={styles.searchResults}>
        {searchResults.map((result: any) => (
          <View key={result.id} style={styles.searchResultCard}>
            <View style={styles.searchResultInfo}>
              <Text style={styles.searchResultUsername}>{result.username}</Text>
              <Text style={styles.searchResultStats}>
                {result.wins}W - {result.losses}L
              </Text>
            </View>
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={() => handleSendInvite(result.user_id)}
              activeOpacity={0.7}
            >
              <Mail color={COLORS.white} size={18} />
              <Text style={styles.inviteButtonText}>Challenge</Text>
            </TouchableOpacity>
          </View>
        ))}

        {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
          <View style={styles.emptyState}>
            <Users color={COLORS.whiteTransparent} size={48} />
            <Text style={styles.emptyStateText}>No players found</Text>
          </View>
        )}

        {searchQuery.length < 2 && (
          <View style={styles.emptyState}>
            <Search color={COLORS.whiteTransparent} size={48} />
            <Text style={styles.emptyStateText}>Search for players</Text>
            <Text style={styles.emptyStateSubtext}>Enter at least 2 characters</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderInvitesTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />
      }
    >
      <Text style={styles.sectionTitle}>Received ({pendingInvites.length})</Text>
      {pendingInvites.length === 0 ? (
        <View style={styles.emptyState}>
          <Mail color={COLORS.whiteTransparent} size={48} />
          <Text style={styles.emptyStateText}>No pending invites</Text>
        </View>
      ) : (
        pendingInvites.map((invite: any) => (
          <View key={invite.id} style={styles.inviteCard}>
            <View style={styles.inviteInfo}>
              <Text style={styles.inviteUsername}>{invite.from_profile?.username || 'Unknown'}</Text>
              <View style={styles.inviteTimeContainer}>
                <Clock color={COLORS.whiteTransparent} size={14} />
                <Text style={styles.inviteTime}>
                  {new Date(invite.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <View style={styles.inviteActions}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => handleDeclineInvite(invite.id)}
                activeOpacity={0.7}
              >
                <X color="#FF6B6B" size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptInvite(invite.id, invite.from_user_id)}
                activeOpacity={0.7}
              >
                <Check color={COLORS.white} size={20} />
                <Text style={styles.acceptButtonText}>Play</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {sentInvites.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Sent ({sentInvites.length})</Text>
          {sentInvites.map((invite: any) => (
            <View key={invite.id} style={[styles.inviteCard, styles.sentInviteCard]}>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteUsername}>{invite.to_profile?.username || 'Unknown'}</Text>
                <Text style={styles.invitePending}>Pending...</Text>
              </View>
              <TouchableOpacity
                style={styles.cancelInviteButton}
                onPress={() => handleCancelSentInvite(invite.id)}
                activeOpacity={0.7}
              >
                <X color="#FF6B6B" size={18} />
                <Text style={styles.cancelInviteText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );

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
              <Text style={styles.headerTitle}>Multiplayer</Text>
              {profile && <Text style={styles.headerUsername}>@{profile.username}</Text>}
            </View>
            <View style={styles.headerRight} />
          </View>

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'games' && styles.tabActive]}
              onPress={() => setActiveTab('games')}
              activeOpacity={0.7}
            >
              <Gamepad2 color={activeTab === 'games' ? COLORS.gold : COLORS.whiteTransparent} size={20} />
              <Text style={[styles.tabText, activeTab === 'games' && styles.tabTextActive]}>Games</Text>
              {activeGames.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeGames.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'find' && styles.tabActive]}
              onPress={() => setActiveTab('find')}
              activeOpacity={0.7}
            >
              <Users color={activeTab === 'find' ? COLORS.gold : COLORS.whiteTransparent} size={20} />
              <Text style={[styles.tabText, activeTab === 'find' && styles.tabTextActive]}>Find</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'invites' && styles.tabActive]}
              onPress={() => setActiveTab('invites')}
              activeOpacity={0.7}
            >
              <Mail color={activeTab === 'invites' ? COLORS.gold : COLORS.whiteTransparent} size={20} />
              <Text style={[styles.tabText, activeTab === 'invites' && styles.tabTextActive]}>Invites</Text>
              {pendingInvites.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingInvites.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {activeTab === 'games' && renderGamesTab()}
          {activeTab === 'find' && renderFindTab()}
          {activeTab === 'invites' && renderInvitesTab()}
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  headerUsername: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.whiteGlass,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 199, 87, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 199, 87, 0.4)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.whiteTransparent,
  },
  tabTextActive: {
    color: COLORS.gold,
  },
  badge: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 199, 87, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 199, 87, 0.4)',
  },
  queueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  queueTextContainer: {
    gap: 2,
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  queueSubtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
  },
  cancelQueueButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  findMatchButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  findMatchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  findMatchText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.whiteTransparent,
    marginBottom: 12,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.whiteTransparent,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  gameCard: {
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  completedGameCard: {
    opacity: 0.7,
  },
  gameCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  opponentName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  turnBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  turnBadgeActive: {
    backgroundColor: COLORS.gold,
  },
  turnBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.whiteTransparent,
  },
  turnBadgeTextActive: {
    color: COLORS.white,
  },
  gameCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameWord: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.white,
    letterSpacing: 2,
  },
  gameScore: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.gold,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  winBadge: {
    backgroundColor: '#4CAF50',
  },
  loseBadge: {
    backgroundColor: '#FF6B6B',
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.white,
  },
  searchResults: {
    flex: 1,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchResultInfo: {
    gap: 4,
  },
  searchResultUsername: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  searchResultStats: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sentInviteCard: {
    opacity: 1,
  },
  cancelInviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cancelInviteText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FF6B6B',
  },
  inviteInfo: {
    gap: 4,
  },
  inviteUsername: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  inviteTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inviteTime: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
  },
  invitePending: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: COLORS.gold,
  },
  inviteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
});
