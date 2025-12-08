import { View, Text, StyleSheet } from 'react-native';

interface GoldenGhostCoinProps {
  size?: number;
}

export default function GoldenGhostCoin({ size = 20 }: GoldenGhostCoinProps) {
  const coinSize = size;
  const fontSize = size * 0.55;
  const borderWidth = Math.max(1.5, size * 0.08);

  return (
    <View
      style={[
        styles.coin,
        {
          width: coinSize,
          height: coinSize,
          borderRadius: coinSize / 2,
          borderWidth: borderWidth,
        },
      ]}
    >
      <Text
        style={[
          styles.coinG,
          {
            fontSize: fontSize,
          },
        ]}
      >
        G
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  coin: {
    backgroundColor: '#F5D89A',
    borderColor: '#E8B85C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  coinG: {
    fontWeight: '700' as const,
    color: '#D4944A',
  },
});
