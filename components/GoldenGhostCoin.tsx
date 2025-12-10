import { View, Image, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

interface GoldenGhostCoinProps {
  size?: number;
  animated?: boolean;
}

const COIN_IMAGE_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/nsumd31rqusfvatr89zfn';


interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: Animated.Value;
  color: string;
  size: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

interface Sparkle {
  x: number;
  y: number;
  opacity: Animated.Value;
  scale: Animated.Value;
  delay: number;
}

export default function GoldenGhostCoin({ size = 20, animated = false }: GoldenGhostCoinProps) {
  const coinScale = useRef(new Animated.Value(0)).current;
  const coinRotateY = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const ringScale1 = useRef(new Animated.Value(0)).current;
  const ringScale2 = useRef(new Animated.Value(0)).current;
  const ringScale3 = useRef(new Animated.Value(0)).current;
  const ringOpacity1 = useRef(new Animated.Value(1)).current;
  const ringOpacity2 = useRef(new Animated.Value(1)).current;
  const ringOpacity3 = useRef(new Animated.Value(1)).current;
  const shimmerPosition = useRef(new Animated.Value(-1)).current;

  const particleColors = ['#FFD700', '#FFA500', '#FFEC8B', '#FFE4B5', '#FFFACD', '#F0E68C'];
  
  const particles = useRef<Particle[]>(
    Array.from({ length: 24 }, (_, i) => {
      const angle = (i / 24) * Math.PI * 2;
      const distance = 150 + Math.random() * 100;
      return {
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
        rotation: new Animated.Value(0),
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        size: 4 + Math.random() * 8,
        startX: 0,
        startY: 0,
        targetX: Math.cos(angle) * distance,
        targetY: Math.sin(angle) * distance,
      };
    })
  ).current;

  const sparkles = useRef<Sparkle[]>(
    Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 60 + Math.random() * 40;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
        delay: i * 100,
      };
    })
  ).current;

  useEffect(() => {
    if (!animated) return;

    const coinEntrance = Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(coinScale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(coinRotateY, {
          toValue: 2,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]);

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const ringWave = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 3,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scale, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );

    const particleAnimations = particles.map((particle, index) => {
      return Animated.sequence([
        Animated.delay(200 + index * 30),
        Animated.parallel([
          Animated.timing(particle.opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(particle.x, {
            toValue: particle.targetX,
            duration: 600 + Math.random() * 400,
            useNativeDriver: true,
          }),
          Animated.timing(particle.y, {
            toValue: particle.targetY + 50,
            duration: 600 + Math.random() * 400,
            useNativeDriver: true,
          }),
          Animated.timing(particle.rotation, {
            toValue: Math.random() * 4 - 2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(300),
            Animated.timing(particle.opacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]);
    });

    const sparkleAnimations = sparkles.map((sparkle) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(sparkle.delay),
          Animated.parallel([
            Animated.timing(sparkle.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.spring(sparkle.scale, {
              toValue: 1,
              friction: 3,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(300),
          Animated.parallel([
            Animated.timing(sparkle.opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.scale, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(Math.random() * 500),
        ])
      )
    );

    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerPosition, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    coinEntrance.start();
    glowAnimation.start();
    ringWave(ringScale1, ringOpacity1, 0).start();
    ringWave(ringScale2, ringOpacity2, 500).start();
    ringWave(ringScale3, ringOpacity3, 1000).start();
    particleAnimations.forEach((anim) => anim.start());
    sparkleAnimations.forEach((anim) => anim.start());
    shimmerAnimation.start();

    return () => {
      coinEntrance.stop();
      glowAnimation.stop();
      particleAnimations.forEach((anim) => anim.stop());
      sparkleAnimations.forEach((anim) => anim.stop());
      shimmerAnimation.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated]);

  if (!animated) {
    return (
      <Image
        source={{ uri: COIN_IMAGE_URL }}
        style={[styles.coin, { width: size, height: size }]}
        resizeMode="contain"
      />
    );
  }

  const containerSize = size * 5;
  const coinRotation = coinRotateY.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0deg', '180deg', '360deg'],
  });

  const glowScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 0.8, 0.4],
  });

  return (
    <View style={[styles.container, { width: containerSize, height: containerSize }]}>
      {/* Expanding rings */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size * 1.2,
            height: size * 1.2,
            borderRadius: size * 0.6,
            transform: [{ scale: ringScale1 }],
            opacity: ringOpacity1,
            borderColor: 'rgba(255, 215, 0, 0.5)',
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: size * 1.2,
            height: size * 1.2,
            borderRadius: size * 0.6,
            transform: [{ scale: ringScale2 }],
            opacity: ringOpacity2,
            borderColor: 'rgba(255, 200, 100, 0.4)',
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: size * 1.2,
            height: size * 1.2,
            borderRadius: size * 0.6,
            transform: [{ scale: ringScale3 }],
            opacity: ringOpacity3,
            borderColor: 'rgba(255, 255, 200, 0.3)',
          },
        ]}
      />

      {/* Background glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            transform: [{ scale: glowScale }],
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Particles/Confetti */}
      {particles.map((particle, index) => (
        <Animated.View
          key={`particle-${index}`}
          style={[
            styles.particle,
            {
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: particle.size / 2,
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                { scale: particle.scale },
                {
                  rotate: particle.rotation.interpolate({
                    inputRange: [-2, 2],
                    outputRange: ['-360deg', '360deg'],
                  }),
                },
              ],
              opacity: particle.opacity,
            },
          ]}
        />
      ))}

      {/* Sparkles */}
      {sparkles.map((sparkle, index) => (
        <Animated.View
          key={`sparkle-${index}`}
          style={[
            styles.sparkle,
            {
              left: containerSize / 2 + sparkle.x - 6,
              top: containerSize / 2 + sparkle.y - 6,
              transform: [{ scale: sparkle.scale }],
              opacity: sparkle.opacity,
            },
          ]}
        >
          <View style={styles.sparkleVertical} />
          <View style={styles.sparkleHorizontal} />
        </Animated.View>
      ))}

      {/* The coin itself */}
      <Animated.View
        style={[
          styles.coinWrapper,
          {
            transform: [
              { scale: coinScale },
              { rotateY: coinRotation },
            ],
          },
        ]}
      >
        <Image
          source={{ uri: COIN_IMAGE_URL }}
          style={[styles.coin, { width: size, height: size }]}
          resizeMode="contain"
        />
        
        {/* Shimmer overlay */}
        <Animated.View
          style={[
            styles.shimmer,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [
                {
                  translateX: shimmerPosition.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-size, size],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coin: {
    borderRadius: 0,
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  particle: {
    position: 'absolute',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  sparkle: {
    position: 'absolute',
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleVertical: {
    position: 'absolute',
    width: 2,
    height: 12,
    backgroundColor: '#FFF',
    borderRadius: 1,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  sparkleHorizontal: {
    position: 'absolute',
    width: 12,
    height: 2,
    backgroundColor: '#FFF',
    borderRadius: 1,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  shimmer: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    opacity: 0.5,
  },
});
