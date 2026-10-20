import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

/** Web: CanvasKit (public/canvaskit.wasm) must load before any Skia module is evaluated. */
export default function loadSkia(): Promise<void> {
  return LoadSkiaWeb({ locateFile: (file: string) => `/${file}` });
}
