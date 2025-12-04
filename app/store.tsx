import { StyleSheet, Text, View, TouchableOpacity, Animated, Platform as RNPlatform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayer } from '@/contexts/PlayerContext';
import { useIAP } from '@/contexts/IAPContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Bomb, ShoppingBag, Sparkles, Crown, RefreshCw } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';
import FloatingGhost from '@/components/FloatingGhost';
import { useAnimatedBackground } from '@/hooks/useAnimatedBackground';
import { LetterBombPack } from '@/types/iap';

const LETTER_BOMB_PRICE = 50;

export default function StoreScreen() {
  const router = useRouter();
  const { wallet, inventory, purchaseItem, refreshCoins } = usePlayer();
  const { products, purchaseBombPack, restorePurchases, isPurchasing, isLoading: iapLoading } = useIAP();
  const { isAuthenticated } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleBack = () => {
    if (RNPlatform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.back();
  };

  const handlePurchase = () => {
    if (wallet.ghostCoins < LETTER_BOMB_PRICE) {
      if (RNPlatform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Not Enough Coins', `You need ${LETTER_BOMB_PRICE} 👻 Ghost Coins to purchase a Letter Bomb.`);
      return;
    }

    if (RNPlatform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const success = purchaseItem('letter_bomb', LETTER_BOMB_PRICE);
    
    if (success) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
      
      Alert.alert('Purchase Successful!', 'You received 1 Letter Bomb 💣');
    } else {
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    }
  };

  const handleBuyBombPack = async (pack: LetterBombPack) => {
    if (RNPlatform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in with Apple to purchase Letter Bombs.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth') },
        ]
      );
      return;
    }
    
    await purchaseBombPack(pack);
  };

  const handleRestorePurchases = async () => {
    if (RNPlatform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await restorePurchases();
    await refreshCoins();
  };

  const { topColor, middleColor, bottomColor } = useAnimatedBackground();

  const getPackIcon = (pack: LetterBombPack) => {
    if (pack.bestValue) {
      return <Crown color={COLORS.gold} size={32} />;
    }
    if (pack.popular) {
      return <Sparkles color={COLORS.gold} size={32} />;
    }
    return <Bomb color="#FF6B6B" size={32} />;
  };

  const getPackGradient = (pack: LetterBombPack): [string, string] => {
    if (pack.bestValue) {
      return ['rgba(255, 199, 87, 0.4)', 'rgba(255, 199, 87, 0.2)'];
    }
    if (pack.popular) {
      return ['rgba(147, 112, 219, 0.3)', 'rgba(147, 112, 219, 0.15)'];
    }
    return ['rgba(255, 107, 107, 0.3)', 'rgba(255, 107, 107, 0.15)'];
  };

  const getPackBorderColor = (pack: LetterBombPack): string => {
    if (pack.bestValue) {
      return 'rgba(255, 199, 87, 0.6)';
    }
    if (pack.popular) {
      return 'rgba(147, 112, 219, 0.5)';
    }
    return 'rgba(255, 107, 107, 0.4)';
  };

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
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <ArrowLeft color={COLORS.white} size={24} />
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <ShoppingBag color={COLORS.white} size={28} />
                <Text style={styles.headerTitle}>STORE</Text>
              </View>
              <View style={styles.coinDisplay}>
                <Text style={styles.coinText}>{wallet.ghostCoins}</Text>
                <Text style={styles.coinEmoji}>👻</Text>
              </View>
            </View>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.buyCoinsSection}>
                <View style={styles.sectionHeader}>
                  <Bomb color="#FF6B6B" size={24} />
                  <Text style={styles.sectionTitle}>Buy Letter Bombs</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Purchase Letter Bombs with real money
                </Text>

                <View style={styles.coinPacksGrid}>
                  {products.map((pack) => (
                    <TouchableOpacity
                      key={pack.id}
                      style={[styles.coinPackCard, { borderColor: getPackBorderColor(pack) }]}
                      onPress={() => handleBuyBombPack(pack)}
                      activeOpacity={0.8}
                      disabled={isPurchasing || iapLoading}
                    >
                      <LinearGradient
                        colors={getPackGradient(pack)}
                        style={styles.coinPackGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {pack.bestValue && (
                          <View style={styles.bestValueBadge}>
                            <Text style={styles.bestValueText}>BEST VALUE</Text>
                          </View>
                        )}
                        {pack.popular && !pack.bestValue && (
                          <View style={styles.popularBadge}>
                            <Text style={styles.popularText}>POPULAR</Text>
                          </View>
                        )}
                        
                        <View style={styles.coinPackIcon}>
                          {getPackIcon(pack)}
                        </View>
                        
                        <View style={styles.coinPackCoins}>
                          <Text style={styles.coinPackAmount}>{pack.bombs}</Text>
                          <Text style={styles.coinPackEmoji}>💣</Text>
                        </View>
                        
                        <Text style={styles.coinPackName}>{pack.name}</Text>
                        
                        <TouchableOpacity
                          style={styles.coinPackBuyButton}
                          onPress={() => handleBuyBombPack(pack)}
                          disabled={isPurchasing || iapLoading}
                        >
                          <LinearGradient
                            colors={[COLORS.gold, COLORS.goldLight]}
                            style={styles.coinPackBuyGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            {isPurchasing ? (
                              <ActivityIndicator size="small" color={COLORS.white} />
                            ) : (
                              <Text style={styles.coinPackPrice}>{pack.price}</Text>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.restoreButton}
                  onPress={handleRestorePurchases}
                  disabled={iapLoading}
                >
                  <RefreshCw color={COLORS.whiteTransparent} size={16} />
                  <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inventorySection}>
                <Text style={styles.sectionTitle}>Your Inventory</Text>
                <View style={styles.inventoryCard}>
                  <View style={styles.inventoryItem}>
                    <View style={styles.inventoryIconContainer}>
                      <Bomb color={COLORS.white} size={32} />
                    </View>
                    <View style={styles.inventoryInfo}>
                      <Text style={styles.inventoryName}>Letter Bombs</Text>
                      <Text style={styles.inventoryDescription}>Replace opponent&apos;s last letter</Text>
                    </View>
                    <View style={styles.inventoryCount}>
                      <Text style={styles.inventoryCountText}>{inventory.letterBombs}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.storeSection}>
                <Text style={styles.sectionTitle}>Buy with Ghost Coins</Text>
                
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <View style={styles.itemCard}>
                    <LinearGradient
                      colors={['rgba(255, 107, 107, 0.2)', 'rgba(255, 107, 107, 0.1)']}
                      style={styles.itemGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.itemHeader}>
                        <View style={styles.itemIconWrapper}>
                          <Bomb color={COLORS.white} size={48} />
                        </View>
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemName}>Letter Bomb</Text>
                          <Text style={styles.itemDescription}>
                            Explode and replace your opponent&apos;s last letter with a letter of your choice
                          </Text>
                        </View>
                      </View>

                      <View style={styles.itemFooter}>
                        <View style={styles.priceContainer}>
                          <Text style={styles.priceText}>{LETTER_BOMB_PRICE}</Text>
                          <Text style={styles.priceEmoji}>👻</Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.buyButton,
                            wallet.ghostCoins < LETTER_BOMB_PRICE && styles.buyButtonDisabled,
                          ]}
                          onPress={handlePurchase}
                          activeOpacity={0.8}
                          disabled={wallet.ghostCoins < LETTER_BOMB_PRICE}
                        >
                          <LinearGradient
                            colors={wallet.ghostCoins >= LETTER_BOMB_PRICE 
                              ? [COLORS.gold, COLORS.goldLight] 
                              : ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']
                            }
                            style={styles.buyButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={[
                              styles.buyButtonText,
                              wallet.ghostCoins < LETTER_BOMB_PRICE && styles.buyButtonTextDisabled,
                            ]}>
                              BUY
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </View>
                </Animated.View>
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>How to Get Letter Bombs</Text>
                <Text style={styles.infoText}>
                  • Win games against the AI to earn 👻 Ghost Coins{'\n'}
                  • Spend Ghost Coins in the shop above{'\n'}
                  • Purchase Letter Bomb packs with real money{'\n'}
                  • Strategic use of bombs can turn the tide!
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        </SafeAreaView>
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
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 199, 87, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 199, 87, 0.4)',
  },
  coinText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  coinEmoji: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  buyCoinsSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    marginBottom: 16,
  },
  coinPacksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  coinPackCard: {
    width: '31%',
    minWidth: 100,
    borderRadius: 16,
    overflow: 'hidden' as const,
    borderWidth: 2,
  },
  coinPackGradient: {
    padding: 12,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'space-between',
  },
  bestValueBadge: {
    position: 'absolute' as const,
    top: -1,
    left: -1,
    right: -1,
    backgroundColor: COLORS.gold,
    paddingVertical: 4,
    alignItems: 'center',
  },
  bestValueText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#1a1a2e',
    letterSpacing: 0.5,
  },
  popularBadge: {
    position: 'absolute' as const,
    top: -1,
    left: -1,
    right: -1,
    backgroundColor: '#9370DB',
    paddingVertical: 4,
    alignItems: 'center',
  },
  popularText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  coinPackIcon: {
    marginTop: 20,
    marginBottom: 8,
  },
  coinPackCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinPackAmount: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: COLORS.white,
  },
  coinPackEmoji: {
    fontSize: 18,
  },
  coinPackName: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
    marginTop: 2,
  },
  coinPackBuyButton: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden' as const,
    marginTop: 8,
  },
  coinPackBuyGradient: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinPackPrice: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 16,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.whiteTransparent,
  },
  inventorySection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.white,
    marginBottom: 16,
  },
  inventoryCard: {
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inventoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  inventoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.white,
    marginBottom: 4,
  },
  inventoryDescription: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
  },
  inventoryCount: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.goldLight,
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryCountText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  storeSection: {
    marginBottom: 32,
  },
  itemCard: {
    borderRadius: 20,
    overflow: 'hidden' as const,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  itemGradient: {
    padding: 20,
  },
  itemHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  itemIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.white,
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    lineHeight: 20,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 199, 87, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 199, 87, 0.4)',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  priceEmoji: {
    fontSize: 20,
  },
  buyButton: {
    borderRadius: 12,
    overflow: 'hidden' as const,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buyButtonDisabled: {
    opacity: 0.6,
  },
  buyButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.white,
  },
  buyButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  infoSection: {
    backgroundColor: COLORS.whiteGlass,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.white,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: COLORS.whiteTransparent,
    lineHeight: 22,
  },
});
