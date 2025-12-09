import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect } from 'react';
import { PlayerInventory, PlayerWallet, PlayerSettings, PlayerStats, PowerUpType, AIDifficulty } from '@/types/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const GHOST_COINS_KEY = '@ghostGame:ghostCoins';
const INVENTORY_KEY = '@ghostGame:inventory';
const SETTINGS_KEY = '@ghostGame:settings';
const STATS_KEY = '@ghostGame:stats';
const COINS_PER_GAME_WIN = 1;
const SUPABASE_USER_KEY = '@ghostGame:supabaseUserId';

export const [PlayerContext, usePlayer] = createContextHook(() => {
  const [wallet, setWallet] = useState<PlayerWallet>({ ghostCoins: 200 });
  const [inventory, setInventory] = useState<PlayerInventory>({ letterBombs: 0 });
  const [settings, setSettings] = useState<PlayerSettings>({ aiDifficulty: 'medium' });
  const [stats, setStats] = useState<PlayerStats>({
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    roundsWon: 0,
    roundsLost: 0,
    winStreak: 0,
    longestWinStreak: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  const syncCoinsWithSupabase = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('ghost_coins')
        .eq('user_id', userId)
        .single();

      if (!error && profile) {
        const supabaseCoins = profile.ghost_coins || 0;
        console.log('[Player] Synced coins from Supabase:', supabaseCoins);
        setWallet({ ghostCoins: supabaseCoins });
        await AsyncStorage.setItem(GHOST_COINS_KEY, JSON.stringify({ ghostCoins: supabaseCoins }));
      }
    } catch (error) {
      console.error('[Player] Error syncing coins with Supabase:', error);
    }
  }, []);

  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        const [coinsData, inventoryData, settingsData, statsData, savedUserId] = await Promise.all([
          AsyncStorage.getItem(GHOST_COINS_KEY),
          AsyncStorage.getItem(INVENTORY_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(STATS_KEY),
          AsyncStorage.getItem(SUPABASE_USER_KEY),
        ]);

        if (savedUserId) {
          setSupabaseUserId(savedUserId);
          await syncCoinsWithSupabase(savedUserId);
        } else if (coinsData && coinsData !== 'null' && coinsData !== 'undefined') {
          try {
            const parsedWallet = JSON.parse(coinsData);
            if (parsedWallet && typeof parsedWallet.ghostCoins === 'number') {
              if (parsedWallet.ghostCoins < 200) {
                const newWallet = { ghostCoins: 200 };
                await AsyncStorage.setItem(GHOST_COINS_KEY, JSON.stringify(newWallet));
                setWallet(newWallet);
              } else {
                setWallet(parsedWallet);
              }
            } else {
              throw new Error('Invalid wallet data format');
            }
          } catch (parseError) {
            console.error('[Player] Failed to parse wallet data, resetting:', parseError);
            const newWallet = { ghostCoins: 200 };
            await AsyncStorage.setItem(GHOST_COINS_KEY, JSON.stringify(newWallet));
            setWallet(newWallet);
          }
        } else {
          const newWallet = { ghostCoins: 200 };
          await AsyncStorage.setItem(GHOST_COINS_KEY, JSON.stringify(newWallet));
          setWallet(newWallet);
        }

        if (inventoryData && inventoryData !== 'null' && inventoryData !== 'undefined') {
          try {
            const parsedInventory = JSON.parse(inventoryData);
            if (parsedInventory && typeof parsedInventory.letterBombs === 'number') {
              setInventory(parsedInventory);
            } else {
              throw new Error('Invalid inventory data format');
            }
          } catch (parseError) {
            console.error('[Player] Failed to parse inventory data, resetting:', parseError);
            await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify({ letterBombs: 0 }));
          }
        }

        if (settingsData && settingsData !== 'null' && settingsData !== 'undefined') {
          try {
            const parsedSettings = JSON.parse(settingsData);
            if (parsedSettings && parsedSettings.aiDifficulty) {
              setSettings(parsedSettings);
            } else {
              throw new Error('Invalid settings data format');
            }
          } catch (parseError) {
            console.error('[Player] Failed to parse settings data, resetting:', parseError);
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ aiDifficulty: 'medium' }));
          }
        }

        if (statsData && statsData !== 'null' && statsData !== 'undefined') {
          try {
            const parsedStats = JSON.parse(statsData);
            if (parsedStats && typeof parsedStats.gamesPlayed === 'number') {
              setStats(parsedStats);
            } else {
              throw new Error('Invalid stats data format');
            }
          } catch (parseError) {
            console.error('[Player] Failed to parse stats data, resetting:', parseError);
            await AsyncStorage.setItem(STATS_KEY, JSON.stringify({
              gamesPlayed: 0,
              gamesWon: 0,
              gamesLost: 0,
              roundsWon: 0,
              roundsLost: 0,
              winStreak: 0,
              longestWinStreak: 0,
            }));
          }
        }
      } catch (error) {
        console.error('Failed to load player data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlayerData();
  }, [syncCoinsWithSupabase]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          console.log('[Player] Auth state changed, syncing user:', session.user.id);
          setSupabaseUserId(session.user.id);
          await AsyncStorage.setItem(SUPABASE_USER_KEY, session.user.id);
          await syncCoinsWithSupabase(session.user.id);
        } else {
          setSupabaseUserId(null);
          await AsyncStorage.removeItem(SUPABASE_USER_KEY);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [syncCoinsWithSupabase]);

  const saveWallet = useCallback(async (newWallet: PlayerWallet) => {
    try {
      await AsyncStorage.setItem(GHOST_COINS_KEY, JSON.stringify(newWallet));
      setWallet(newWallet);
    } catch (error) {
      console.error('Failed to save wallet:', error);
    }
  }, []);

  const saveInventory = useCallback(async (newInventory: PlayerInventory) => {
    try {
      await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(newInventory));
      setInventory(newInventory);
    } catch (error) {
      console.error('Failed to save inventory:', error);
    }
  }, []);

  const awardCoins = useCallback((amount: number) => {
    const newWallet = { ghostCoins: wallet.ghostCoins + amount };
    saveWallet(newWallet);
  }, [wallet, saveWallet]);

  const awardGameWin = useCallback(() => {
    awardCoins(COINS_PER_GAME_WIN);
  }, [awardCoins]);

  const purchaseItem = useCallback((powerUpType: PowerUpType, price: number) => {
    if (wallet.ghostCoins < price) {
      return false;
    }

    const newWallet = { ghostCoins: wallet.ghostCoins - price };
    saveWallet(newWallet);

    if (powerUpType === 'letter_bomb') {
      const newInventory = { ...inventory, letterBombs: inventory.letterBombs + 1 };
      saveInventory(newInventory);
    }

    return true;
  }, [wallet, inventory, saveWallet, saveInventory]);

  const usePowerUp = useCallback((powerUpType: PowerUpType) => {
    if (powerUpType === 'letter_bomb') {
      if (inventory.letterBombs <= 0) {
        return false;
      }

      const newInventory = { ...inventory, letterBombs: inventory.letterBombs - 1 };
      saveInventory(newInventory);
      return true;
    }

    return false;
  }, [inventory, saveInventory]);

  const addLetterBombs = useCallback((amount: number) => {
    const newInventory = { ...inventory, letterBombs: inventory.letterBombs + amount };
    saveInventory(newInventory);
    console.log('[Player] Added letter bombs:', amount, 'Total:', newInventory.letterBombs);
  }, [inventory, saveInventory]);

  const updateSettings = useCallback(async (newSettings: Partial<PlayerSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings]);

  const setAIDifficulty = useCallback((difficulty: AIDifficulty) => {
    updateSettings({ aiDifficulty: difficulty });
  }, [updateSettings]);

  const saveStats = useCallback(async (newStats: PlayerStats) => {
    try {
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));
      setStats(newStats);
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  }, []);

  const recordGameResult = useCallback((won: boolean, roundsWon: number, roundsLost: number) => {
    const newStats: PlayerStats = {
      gamesPlayed: stats.gamesPlayed + 1,
      gamesWon: won ? stats.gamesWon + 1 : stats.gamesWon,
      gamesLost: won ? stats.gamesLost : stats.gamesLost + 1,
      roundsWon: stats.roundsWon + roundsWon,
      roundsLost: stats.roundsLost + roundsLost,
      winStreak: won ? stats.winStreak + 1 : 0,
      longestWinStreak: won 
        ? Math.max(stats.longestWinStreak, stats.winStreak + 1) 
        : stats.longestWinStreak,
    };
    saveStats(newStats);
  }, [stats, saveStats]);

  const refreshCoins = useCallback(async () => {
    if (supabaseUserId) {
      await syncCoinsWithSupabase(supabaseUserId);
    }
  }, [supabaseUserId, syncCoinsWithSupabase]);

  return {
    wallet,
    inventory,
    settings,
    stats,
    isLoading,
    awardCoins,
    awardGameWin,
    purchaseItem,
    usePowerUp,
    addLetterBombs,
    setAIDifficulty,
    recordGameResult,
    refreshCoins,
  };
});
