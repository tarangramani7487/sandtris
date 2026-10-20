/** Native: Skia is linked natively, nothing to load. */
export default function loadSkia(): Promise<void> {
  return Promise.resolve();
}
