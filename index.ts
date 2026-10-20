import { registerRootComponent } from 'expo';
import loadSkia from './src/platform/loadSkia';

// App is required lazily so that on web no Skia module evaluates before CanvasKit has loaded.
loadSkia().then(() => {
  registerRootComponent(require('./App').default);
});
