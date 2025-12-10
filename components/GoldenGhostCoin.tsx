import { View, Image, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

interface GoldenGhostCoinProps {
  size?: number;
  animated?: boolean;
}

const COIN_IMAGE_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/nsumd31rqusfvatr89zfn';

export default function GoldenGhostCoin({ size = 20, animated = false }: GoldenGhostCoinProps) {
  const ray1Opacity = useRef(new Animated.Value(0.3)).current;
  const ray2Opacity = useRef(new Animated.Value(0.4)).current;
  const ray3Opacity = useRef(new Animated.Value(0.5)).current;
  const ray4Opacity = useRef(new Animated.Value(0.3)).current;
  const ray5Opacity = useRef(new Animated.Value(0.6)).current;
  const ray6Opacity = useRef(new Animated.Value(0.4)).current;
  const ray7Opacity = useRef(new Animated.Value(0.5)).current;
  const ray8Opacity = useRef(new Animated.Value(0.3)).current;

  const ray1Scale = useRef(new Animated.Value(1)).current;
  const ray2Scale = useRef(new Animated.Value(1)).current;
  const ray3Scale = useRef(new Animated.Value(1)).current;
  const ray4Scale = useRef(new Animated.Value(1)).current;
  const ray5Scale = useRef(new Animated.Value(1)).current;
  const ray6Scale = useRef(new Animated.Value(1)).current;
  const ray7Scale = useRef(new Animated.Value(1)).current;
  const ray8Scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;

    const createPulseAnimation = (
      opacityAnim: Animated.Value,
      scaleAnim: Animated.Value,
      delay: number,
      duration: number
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(opacityAnim, {
                toValue: 0.8,
                duration: duration,
                useNativeDriver: true,
              }),
              Animated.timing(opacityAnim, {
                toValue: 0.2,
                duration: duration,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(scaleAnim, {
                toValue: 1.3,
                duration: duration,
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnim, {
                toValue: 1,
                duration: duration,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ])
      );
    };

    const animations = [
      createPulseAnimation(ray1Opacity, ray1Scale, 0, 800),
      createPulseAnimation(ray2Opacity, ray2Scale, 100, 900),
      createPulseAnimation(ray3Opacity, ray3Scale, 200, 700),
      createPulseAnimation(ray4Opacity, ray4Scale, 300, 1000),
      createPulseAnimation(ray5Opacity, ray5Scale, 50, 850),
      createPulseAnimation(ray6Opacity, ray6Scale, 150, 950),
      createPulseAnimation(ray7Opacity, ray7Scale, 250, 750),
      createPulseAnimation(ray8Opacity, ray8Scale, 350, 800),
    ];

    animations.forEach(anim => anim.start());

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [animated, ray1Opacity, ray2Opacity, ray3Opacity, ray4Opacity, ray5Opacity, ray6Opacity, ray7Opacity, ray8Opacity, ray1Scale, ray2Scale, ray3Scale, ray4Scale, ray5Scale, ray6Scale, ray7Scale, ray8Scale]);

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

  const rayConfigs = [
    { opacity: ray1Opacity, scale: ray1Scale, angle: 0 },
    { opacity: ray2Opacity, scale: ray2Scale, angle: 45 },
    { opacity: ray3Opacity, scale: ray3Scale, angle: 90 },
    { opacity: ray4Opacity, scale: ray4Scale, angle: 135 },
    { opacity: ray5Opacity, scale: ray5Scale, angle: 180 },
    { opacity: ray6Opacity, scale: ray6Scale, angle: 225 },
    { opacity: ray7Opacity, scale: ray7Scale, angle: 270 },
    { opacity: ray8Opacity, scale: ray8Scale, angle: 315 },
  ];

  return (
    <View style={[styles.container, { width: size * 3, height: size * 3 }]}>
      <View style={[styles.raysContainer, { width: size * 3, height: size * 3 }]}>
        {rayConfigs.map((config, index) => (
          <Animated.View
            key={index}
            style={[
              styles.rayWrapper,
              {
                transform: [{ rotate: `${config.angle}deg` }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.ray,
                {
                  opacity: config.opacity,
                  transform: [{ scaleY: config.scale }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.rayInner,
                  {
                    borderLeftWidth: size * 0.3,
                    borderRightWidth: size * 0.3,
                    borderBottomWidth: size * 2,
                    borderBottomColor: 'rgba(255, 240, 200, 0.8)',
                  },
                ]}
              />
            </Animated.View>
          </Animated.View>
        ))}
        
        <View style={[styles.glowCircle, { width: size * 2, height: size * 2, borderRadius: size }]} />
      </View>
      <Image
        source={{ uri: COIN_IMAGE_URL }}
        style={[
          styles.coin,
          {
            width: size,
            height: size,
            zIndex: 2,
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
  rayWrapper: {
    position: 'absolute' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  ray: {
    backgroundColor: 'transparent',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopWidth: 0,
  },
  rayInner: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid' as const,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  glowCircle: {
    position: 'absolute' as const,
    backgroundColor: 'rgba(255, 240, 200, 0.25)',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 30,
  },
});
