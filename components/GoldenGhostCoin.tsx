import { View, Image, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

interface GoldenGhostCoinProps {
  size?: number;
  animated?: boolean;
}

const COIN_IMAGE_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/nsumd31rqusfvatr89zfn';

export default function GoldenGhostCoin({ size = 20, animated = false }: GoldenGhostCoinProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;

    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    rotateLoop.start();
    pulseLoop.start();

    return () => {
      rotateLoop.stop();
      pulseLoop.stop();
    };
  }, [animated, rotateAnim, pulseAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!animated) {
    return (
      <Image
        source={{ uri: COIN_IMAGE_URL }}
        style={[
          styles.coin,
          {
            width: size,
            height: size,
          },
        ]}
        resizeMode="contain"
      />
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.raysContainer,
          {
            width: size * 2,
            height: size * 2,
            transform: [{ rotate }, { scale: pulseAnim }],
          },
        ]}
      >
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
          <View
            key={deg}
            style={[
              styles.ray,
              {
                width: size * 0.1,
                height: size * 2,
                transform: [{ rotate: `${deg}deg` }],
              },
            ]}
          />
        ))}
      </Animated.View>
      <Image
        source={{ uri: COIN_IMAGE_URL }}
        style={[
          styles.coin,
          {
            width: size,
            height: size,
            zIndex: 1,
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coin: {
    borderRadius: 0,
  },
  raysContainer: {
    position: 'absolute' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute' as const,
    backgroundColor: 'rgba(255, 215, 0, 0.6)',
  },
});
