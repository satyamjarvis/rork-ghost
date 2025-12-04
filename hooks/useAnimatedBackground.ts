import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { COLOR_SCHEMES } from '@/constants/colors';

export function useAnimatedBackground() {
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = () => {
      return Animated.sequence([
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: 30000,
          useNativeDriver: false,
        }),
        Animated.timing(colorAnim, {
          toValue: 0,
          duration: 30000,
          useNativeDriver: false,
        }),
      ]);
    };

    const loopAnimation = Animated.loop(createAnimation());
    loopAnimation.start();

    return () => {
      loopAnimation.stop();
    };
  }, [colorAnim]);

  const topColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLOR_SCHEMES.peachy.top, COLOR_SCHEMES.orangeRed.top],
  });

  const middleColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLOR_SCHEMES.peachy.middle, COLOR_SCHEMES.orangeRed.middle],
  });

  const bottomColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLOR_SCHEMES.peachy.bottom, COLOR_SCHEMES.orangeRed.bottom],
  });

  return { topColor, middleColor, bottomColor };
}
