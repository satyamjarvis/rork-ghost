import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Dimensions, Image } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GHOST_IMAGE_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/giooeoqlx8wvws1oy6m0k';

export default function FloatingGhost() {
  const translateX = useRef(new Animated.Value(-100)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT / 2)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const scheduleNextAppearance = () => {
      const delay = Math.random() * 4000 + 3000;
      
      setTimeout(() => {
        setShouldShow(true);
        animateGhost();
      }, delay);
    };

    const animateGhost = () => {
      const direction = Math.random() > 0.5 ? 'left-to-right' : 'right-to-left';
      const startY = Math.random() * (SCREEN_HEIGHT - 200) + 100;
      const endY = startY + (Math.random() * 150 - 75);
      const duration = (4000 + Math.random() * 2000) * 1.38;

      if (direction === 'left-to-right') {
        translateX.setValue(-100);
      } else {
        translateX.setValue(SCREEN_WIDTH + 100);
      }
      translateY.setValue(startY);
      opacity.setValue(0);
      scale.setValue(0.5 + Math.random() * 0.5);

      const midY1 = startY + (Math.random() * 60 - 30);
      const midY2 = endY + (Math.random() * 60 - 30);

      Animated.parallel([
        Animated.timing(translateX, {
          toValue: direction === 'left-to-right' ? SCREEN_WIDTH + 100 : -100,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: midY1,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: midY2,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: endY,
            duration: duration / 3,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.65,
            duration: 920,
            useNativeDriver: true,
          }),
          Animated.delay(duration - 1840),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 920,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setShouldShow(false);
        scheduleNextAppearance();
      });

      const baseScale = (scale as any)._value;
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: baseScale * 1.08,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: baseScale * 0.98,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    scheduleNextAppearance();
  }, [translateX, translateY, opacity, scale]);

  if (!shouldShow) return null;

  return (
    <Animated.View
      style={[
        styles.ghostContainer,
        {
          transform: [
            { translateX },
            { translateY },
            { scale },
          ],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <Image
        source={{ uri: GHOST_IMAGE_URL }}
        style={styles.ghostImage}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ghostContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    zIndex: 1000,
  },
  ghostImage: {
    width: '100%',
    height: '100%',
  },
});
