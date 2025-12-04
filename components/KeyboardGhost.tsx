import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Image } from 'react-native';

const GHOST_IMAGE_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/giooeoqlx8wvws1oy6m0k';

interface KeyboardGhostProps {
  visible: boolean;
  targetX: number;
  targetY: number;
  onArrived?: () => void;
}

export default function KeyboardGhost({ visible, targetX, targetY, onArrived }: KeyboardGhostProps) {
  const translateX = useRef(new Animated.Value(-100)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;
  const bobAnim = useRef(new Animated.Value(0)).current;
  const hasArrived = useRef(false);

  useEffect(() => {
    if (visible && targetX > 0 && targetY > 0) {
      hasArrived.current = false;
      
      translateX.setValue(targetX - 200);
      translateY.setValue(targetY - 150);
      opacity.setValue(0);
      scale.setValue(0.3);

      Animated.parallel([
        Animated.timing(translateX, {
          toValue: targetX - 20,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: targetY - 80,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: targetY - 45,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 0.5,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!hasArrived.current) {
          hasArrived.current = true;
          onArrived?.();
        }
        
        Animated.loop(
          Animated.sequence([
            Animated.timing(bobAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(bobAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    } else if (!visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: (translateY as any)._value - 50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, targetX, targetY, translateX, translateY, opacity, scale, bobAnim, onArrived]);

  const bobTranslateY = bobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.ghostContainer,
        {
          transform: [
            { translateX },
            { translateY },
            { translateY: bobTranslateY },
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
    width: 80,
    height: 80,
    zIndex: 3000,
  },
  ghostImage: {
    width: '100%',
    height: '100%',
  },
});
