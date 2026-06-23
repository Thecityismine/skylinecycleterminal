// Fetches the logo as a blob → base64 data URL.
// No canvas manipulation here — whitening is done in compositeWatermark via
// source-in compositing, which avoids getImageData (the call that silently
// throws on iOS Safari for large or context-limited canvases).
export function processLogoForWatermark(src: string): Promise<string> {
  return new Promise((resolve) => {
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.blob();
      })
      .then((blob) => {
        const reader = new FileReader();
        reader.onerror = () => resolve('');
        reader.onload  = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch(() => resolve(''));
  });
}
