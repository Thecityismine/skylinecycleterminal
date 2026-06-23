// Strips the white background from a PNG and converts logo pixels to white,
// returning a transparent data URL suitable for use as a canvas-safe watermark.
export function processLogoForWatermark(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    // No crossOrigin on same-origin assets — setting it can taint the canvas
    // if the CDN doesn't echo CORS headers, silently breaking getImageData.
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum > 240) {
            data[i + 3] = 0;
          } else if (lum > 160) {
            data[i]     = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = Math.round((240 - lum) / 80 * 255);
          } else {
            data[i]     = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }

        const out = document.createElement('canvas');
        out.width  = canvas.width;
        out.height = canvas.height;
        out.getContext('2d')!.putImageData(new ImageData(data, canvas.width, canvas.height), 0, 0);
        resolve(out.toDataURL('image/png'));
      } catch {
        // Canvas tainted or security error — fall back to text watermark
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
}
