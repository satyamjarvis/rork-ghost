import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { LETTER_BOMB_PACKS, LetterBombPack, PurchaseResult } from '@/types/iap';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_BOMBS_KEY = '@ghostGame:pendingBombs';

export const [IAPContext, useIAP] = createContextHook(() => {
  const { user, profile } = useAuth();
  const { addLetterBombs } = usePlayer();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);

  useEffect(() => {
    const checkAvailability = async () => {
      if (Platform.OS === 'web') {
        setIsAvailable(false);
        console.log('[IAP] Not available on web');
      } else {
        setIsAvailable(true);
        console.log('[IAP] IAP available on native platform');
      }
    };

    checkAvailability();
  }, []);

  const syncPendingBombs = useCallback(async () => {
    if (!user || !profile) return;

    try {
      const pending = await AsyncStorage.getItem(PENDING_BOMBS_KEY);
      if (pending) {
        const pendingBombs = parseInt(pending, 10);
        if (pendingBombs > 0) {
          console.log('[IAP] Syncing pending bombs:', pendingBombs);
          addLetterBombs(pendingBombs);
          await AsyncStorage.removeItem(PENDING_BOMBS_KEY);
        }
      }
    } catch (error) {
      console.error('[IAP] Error syncing pending bombs:', error);
    }
  }, [user, profile, addLetterBombs]);

  useEffect(() => {
    syncPendingBombs();
  }, [syncPendingBombs]);

  const addBombsToInventory = useCallback(async (bombs: number): Promise<boolean> => {
    if (!user) {
      console.log('[IAP] No user logged in, storing bombs locally');
      try {
        const pending = await AsyncStorage.getItem(PENDING_BOMBS_KEY);
        const currentPending = pending ? parseInt(pending, 10) : 0;
        await AsyncStorage.setItem(PENDING_BOMBS_KEY, String(currentPending + bombs));
        addLetterBombs(bombs);
        return true;
      } catch (error) {
        console.error('[IAP] Error storing pending bombs:', error);
        return false;
      }
    }

    try {
      addLetterBombs(bombs);
      console.log('[IAP] Letter Bombs added successfully:', bombs);
      return true;
    } catch (error) {
      console.error('[IAP] Exception adding bombs:', error);
      return false;
    }
  }, [user, addLetterBombs]);

  const purchaseBombPack = useCallback(async (pack: LetterBombPack): Promise<PurchaseResult> => {
    console.log('[IAP] Starting purchase for pack:', pack.id);
    setIsPurchasing(true);

    try {
      if (Platform.OS === 'web') {
        Alert.alert(
          'Not Available',
          'In-app purchases are only available on iOS devices. Please use the mobile app to purchase Letter Bombs.'
        );
        return { success: false, error: 'Not available on web' };
      }

      Alert.alert(
        'Purchase Letter Bombs',
        `Purchase ${pack.bombs} Letter Bombs for ${pack.price}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setIsPurchasing(false);
            },
          },
          {
            text: 'Buy',
            onPress: async () => {
              console.log('[IAP] User confirmed purchase');
              
              const success = await addBombsToInventory(pack.bombs);
              
              if (success) {
                Alert.alert(
                  'Purchase Successful! 🎉',
                  `You received ${pack.bombs} Letter Bombs! 💣`,
                  [{ text: 'Awesome!' }]
                );
                setIsPurchasing(false);
              } else {
                Alert.alert(
                  'Purchase Error',
                  'There was an error adding Letter Bombs to your inventory. Please try again or contact support.',
                  [{ text: 'OK' }]
                );
                setIsPurchasing(false);
              }
            },
          },
        ]
      );

      return { success: true, bombs: pack.bombs };
    } catch (error: any) {
      console.error('[IAP] Purchase error:', error);
      setIsPurchasing(false);
      return { success: false, error: error.message || 'Purchase failed' };
    }
  }, [addBombsToInventory]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    console.log('[IAP] Starting restore purchases');
    setIsLoading(true);

    try {
      if (Platform.OS === 'web') {
        Alert.alert(
          'Not Available',
          'Restore purchases is only available on iOS devices.'
        );
        setIsLoading(false);
        return false;
      }

      if (!user) {
        Alert.alert(
          'Sign In Required',
          'Please sign in with Apple to restore your purchases.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return false;
      }

      await syncPendingBombs();

      Alert.alert(
        'Purchases Restored',
        'Your inventory has been synced.',
        [{ text: 'OK' }]
      );

      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('[IAP] Restore error:', error);
      Alert.alert(
        'Restore Failed',
        'There was an error restoring your purchases. Please try again.',
        [{ text: 'OK' }]
      );
      setIsLoading(false);
      return false;
    }
  }, [user, syncPendingBombs]);

  const getProducts = useCallback((): LetterBombPack[] => {
    return LETTER_BOMB_PACKS;
  }, []);

  return {
    isLoading,
    isAvailable,
    isPurchasing,
    products: LETTER_BOMB_PACKS,
    purchaseBombPack,
    restorePurchases,
    getProducts,
  };
});
