import { Canvas, LinearGradient, Rect, Skia, Path, vec } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../theme/colors';

/** Full-screen vertical gradient with broad diagonal light stripes. */
function BackgroundImpl({ variant }: { variant: 'menu' | 'game' }) {
  const { width, height } = useWindowDimensions();
  const top = variant === 'menu' ? colors.menuTop : colors.gameTop;
  const bottom = variant === 'menu' ? colors.menuBottom : colors.gameBottom;
  const stripes = useMemo(() => {
    const band = Math.max(width, height) * 0.22;
    let d = '';
    for (let x = -height; x < width + height; x += band * 2.3) {
      d += `M${x} 0L${x + band} 0L${x + band + height * 0.55} ${height}L${x + height * 0.55} ${height}Z`;
    }
    return Skia.Path.MakeFromSVGString(d)!;
  }, [width, height]);
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[top, bottom]} />
      </Rect>
      <Path path={stripes} color={colors.stripe} />
    </Canvas>
  );
}

export const Background = memo(BackgroundImpl);
