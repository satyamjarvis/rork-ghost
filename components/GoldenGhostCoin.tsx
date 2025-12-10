import { Animated, StyleSheet } from 'react-native';
import { useEffect, useRef } from 'react';

interface GoldenGhostCoinProps {
  size?: number;
}

const COIN_IMAGE_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/nsumd31rqusfvatr89zfn';

export default function GoldenGhostCoin({ size = 20 }: GoldenGhostCoinProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    rotateLoop.start();
    scaleLoop.start();

    return () => {
      rotateLoop.stop();
      scaleLoop.stop();
    };
  }, [rotateAnim, scaleAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.Image
      source={{ uri: COIN_IMAGE_URL }}
      style={[
        styles.coin,
        {
          width: size,
          height: size,
          transform: [{ rotate }, { scale: scaleAnim }],
        },
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  coin: {
    borderRadius: 0,
  },
});
