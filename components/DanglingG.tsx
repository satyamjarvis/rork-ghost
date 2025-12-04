import { useEffect, useCallback } from 'react';
import { StyleSheet, View, Dimensions, Image, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DanglingGProps {
  size?: number;
}

const INITIAL_SWING_AMPLITUDE = 15;
const MICRO_SWAY_AMPLITUDE = 2;
const SWING_DURATION = 800;
const MICRO_SWAY_DURATION = 2500;

export default function DanglingG({ size = 120 }: DanglingGProps) {
  const rotation = useSharedValue(0);

  const ropeLengthToG = SCREEN_HEIGHT * 0.18;

  const startInitialSwing = useCallback(() => {
    rotation.value = 0;
    rotation.value = withSequence(
      withTiming(INITIAL_SWING_AMPLITUDE, { 
        duration: SWING_DURATION / 2,
        easing: Easing.out(Easing.sin),
      }),
      withTiming(-INITIAL_SWING_AMPLITUDE * 0.8, { 
        duration: SWING_DURATION,
        easing: Easing.inOut(Easing.sin),
      }),
      withTiming(INITIAL_SWING_AMPLITUDE * 0.6, { 
        duration: SWING_DURATION,
        easing: Easing.inOut(Easing.sin),
      }),
      withTiming(-INITIAL_SWING_AMPLITUDE * 0.4, { 
        duration: SWING_DURATION,
        easing: Easing.inOut(Easing.sin),
      }),
      withTiming(INITIAL_SWING_AMPLITUDE * 0.25, { 
        duration: SWING_DURATION,
        easing: Easing.inOut(Easing.sin),
      }),
      withTiming(-INITIAL_SWING_AMPLITUDE * 0.15, { 
        duration: SWING_DURATION,
        easing: Easing.inOut(Easing.sin),
      }),
      withTiming(MICRO_SWAY_AMPLITUDE, { 
        duration: SWING_DURATION / 2,
        easing: Easing.out(Easing.sin),
      }),
      withRepeat(
        withSequence(
          withTiming(-MICRO_SWAY_AMPLITUDE, { 
            duration: MICRO_SWAY_DURATION,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(MICRO_SWAY_AMPLITUDE, { 
            duration: MICRO_SWAY_DURATION,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      )
    );
  }, [rotation]);

  const applyImpulse = useCallback(() => {
    console.log('DanglingG: Tap impulse applied');
    cancelAnimation(rotation);
    startInitialSwing();
  }, [rotation, startInitialSwing]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startInitialSwing();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [startInitialSwing]);

  const animatedPendulumStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  const dynamicStyles = StyleSheet.create({
    container: {
      position: 'absolute' as const,
      top: -SCREEN_HEIGHT * 0.05 + 40,
      right: SCREEN_WIDTH * 0.15,
      width: size,
      alignItems: 'center' as const,
      zIndex: 1,
    },
    gImage: {
      width: size,
      height: size,
    },
    rope: {
      width: 4,
      height: ropeLengthToG,
      backgroundColor: '#1a1a1a',
      borderRadius: 2,
    },
    pendulumWrapper: {
      transformOrigin: '50% 0%',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Animated.View 
        style={[
          styles.pendulumGroup,
          animatedPendulumStyle,
          { transformOrigin: '50% 0%' }
        ]}
      >
        <View style={dynamicStyles.rope} />
        
        <Pressable 
          onPress={applyImpulse}
          style={styles.letterContainer}
        >
          <Image
            source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/mleglfjw2uqb1kadpm5pu' }}
            style={dynamicStyles.gImage}
            resizeMode="contain"
            onError={() => {
              console.log('DanglingG: Image failed to load');
            }}
            onLoad={() => console.log('DanglingG: Image loaded successfully')}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pendulumGroup: {
    alignItems: 'center',
  },
  letterContainer: {
    alignItems: 'center',
    position: 'relative' as const,
  },
  fallbackG: {
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 107, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 60,
    fontWeight: '800' as const,
    color: '#fff',
  },
});
