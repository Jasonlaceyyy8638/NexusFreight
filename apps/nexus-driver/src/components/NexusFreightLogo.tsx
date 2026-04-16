import {
  Image,
  type ImageStyle,
  type StyleProp,
  useWindowDimensions,
  View,
} from "react-native";

const SOURCE = require("../../assets/nexusfreight-logo.png");

type Props = {
  /** Total width; height scales (~4.57:1 wordmark). */
  width?: number;
  style?: StyleProp<ImageStyle>;
};

/**
 * NexusFreight wordmark — same asset as web `public/nexusfreight-logo-v2.svg`
 * (rasterized via `scripts/export-nexusfreight-logo-png.cjs`).
 */
export function NexusFreightLogo({ width = 288, style }: Props) {
  const { width: windowW } = useWindowDimensions();
  const resolvedWidth =
    width === 288 ? Math.min(Math.round(windowW * 0.72), 520) : width;
  const aspect = 256 / 56;
  const height = resolvedWidth / aspect;
  return (
    <View style={{ alignSelf: "center" }}>
      <Image
        source={SOURCE}
        accessibilityLabel="NexusFreight"
        resizeMode="contain"
        style={[{ width: resolvedWidth, height }, style]}
      />
    </View>
  );
}
