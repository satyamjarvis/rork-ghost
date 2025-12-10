import { View, Image, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

interface GoldenGhostCoinProps {
  size?: number;
  animated?: boolean;
}

const COIN_IMAGE_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/nsumd31rqusfvatr89zfn';

export default function GoldenGhostCoin({ size = 20, animated = false }: GoldenGhostCoinProps) {
  const rayAnims = useRef(
    Array.from({ length: 16 }, () => new Animated.Value(0.15 + Math.random() * 0.25))
  ).current;

  useEffect(() => {
    if (!animated) return;

    const animations = rayAnims.map((anim, index) => {
      const baseOpacity = 0.1 + Math.random() * 0.2;
      const peakOpacity = 0.4 + Math.random() * 0.3;
      const duration = 600 + Math.random() * 800;
      const delay = index * 80;

      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: peakOpacity,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: baseOpacity,
            duration: duration * 1.2,
            useNativeDriver: true,
          }),
        ])
      );
    });

    animations.forEach(anim => anim.start());

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [animated, rayAnims]);

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
    { angle: 0, length: 2.2, width: 3 },
    { angle: 22, length: 1.6, width: 2 },
    { angle: 45, length: 2.4, width: 4 },
    { angle: 68, length: 1.4, width: 2 },
    { angle: 90, length: 2.0, width: 3 },
    { angle: 112, length: 1.5, width: 2 },
    { angle: 135, length: 2.3, width: 4 },
    { angle: 158, length: 1.3, width: 2 },
    { angle: 180, length: 2.1, width: 3 },
    { angle: 202, length: 1.5, width: 2 },
    { angle: 225, length: 2.5, width: 4 },
    { angle: 248, length: 1.4, width: 2 },
    { angle: 270, length: 2.2, width: 3 },
    { angle: 292, length: 1.6, width: 2 },
    { angle: 315, length: 2.3, width: 4 },
    { angle: 338, length: 1.3, width: 2 },
  ];

  const containerSize = size * 5;
  const rayStartOffset = size * 0.4;

  return (
    <View style={[styles.container, { width: containerSize, height: containerSize }]}>
      <View style={[styles.raysContainer, { width: containerSize, height: containerSize }]}>
        <View style={[styles.softGlow, { 
          width: size * 2.5, 
          height: size * 2.5, 
          borderRadius: size * 1.25,
        }]} />
        
        {rayConfigs.map((config, index) => {
          const rayLength = size * config.length;
          const rayWidth = size * 0.08 * config.width;
          const angleRad = (config.angle * Math.PI) / 180;
          
          const startX = containerSize / 2 + Math.cos(angleRad) * rayStartOffset - rayWidth / 2;
          const startY = containerSize / 2 + Math.sin(angleRad) * rayStartOffset - rayLength;
          
          return (
            <Animated.View
              key={index}
              style={[
                styles.softRay,
                {
                  width: rayWidth,
                  height: rayLength,
                  left: startX,
                  top: startY,
                  opacity: rayAnims[index],
                  transform: [
                    { translateX: rayWidth / 2 },
                    { translateY: rayLength },
                    { rotate: `${config.angle + 90}deg` },
                    { translateX: -rayWidth / 2 },
                    { translateY: -rayLength },
                  ],
                  borderRadius: rayWidth / 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  shadowColor: '#fff',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: rayWidth,
                },
              ]}
            />
          );
        })}
      </View>
      
      <Image
        source={{ uri: COIN_IMAGE_URL }}
        style={[
          styles.coin,
          {
            width: size,
            height: size,
            zIndex: 10,
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
  softGlow: {
    position: 'absolute' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  softRay: {
    position: 'absolute' as const,
  },
});
