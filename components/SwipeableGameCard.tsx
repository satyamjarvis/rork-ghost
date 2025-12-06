import React, { useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = -80;
const DELETE_BUTTON_WIDTH = 80;

interface SwipeableGameCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onPress: () => void;
  gameId: string;
}

export default function SwipeableGameCard({
  children,
  onDelete,
  onPress,
  gameId,
}: SwipeableGameCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const handleDelete = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      'Leave Game',
      'Are you sure you want to leave this game? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            Animated.timing(translateX, {
              toValue: -SCREEN_WIDTH,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              onDelete();
            });
          },
        },
      ]
    );
  }, [onDelete, translateX]);

  const closeSwipe = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
    isOpen.current = false;
  }, [translateX]);

  const openSwipe = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(translateX, {
      toValue: -DELETE_BUTTON_WIDTH,
      useNativeDriver: true,
      friction: 8,
    }).start();
    isOpen.current = true;
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderGrant: () => {
        translateX.setOffset(isOpen.current ? -DELETE_BUTTON_WIDTH : 0);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const newValue = Math.min(0, Math.max(-DELETE_BUTTON_WIDTH - 20, gestureState.dx));
        translateX.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();
        
        if (gestureState.dx < SWIPE_THRESHOLD) {
          openSwipe();
        } else if (gestureState.dx > 20 || gestureState.vx > 0.5) {
          closeSwipe();
        } else if (isOpen.current && gestureState.dx < 0) {
          openSwipe();
        } else {
          closeSwipe();
        }
      },
    })
  ).current;

  const handlePress = useCallback(() => {
    if (isOpen.current) {
      closeSwipe();
    } else {
      onPress();
    }
  }, [closeSwipe, onPress]);

  const deleteButtonOpacity = translateX.interpolate({
    inputRange: [-DELETE_BUTTON_WIDTH, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.deleteContainer, { opacity: deleteButtonOpacity }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Trash2 color={COLORS.white} size={22} />
          <Text style={styles.deleteText}>Leave</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[styles.cardContainer, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={styles.touchable}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
  },
  deleteContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 12,
    width: DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    borderRadius: 16,
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 4,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.white,
  },
  cardContainer: {
    backgroundColor: 'transparent',
  },
  touchable: {
    width: '100%',
  },
});
