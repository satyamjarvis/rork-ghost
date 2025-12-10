import { Image, StyleSheet } from 'react-native';

interface GoldenGhostCoinProps {
  size?: number;
}

const COIN_IMAGE_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/nsumd31rqusfvatr89zfn';

export default function GoldenGhostCoin({ size = 20 }: GoldenGhostCoinProps) {
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

const styles = StyleSheet.create({
  coin: {
    borderRadius: 0,
  },
});
