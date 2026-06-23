// Fetches the logo as a blob → base64 data URL, then strips its white
// background and converts logo pixels to white via canvas pixel manipulation.
//
// Using fetch+FileReader before loading into the canvas guarantees the img.src
// is always an in-memory data URL (never a network URL), so getImageData can
// never be blocked by canvas taint — even on mobile Safari with strict CDN rules.
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
        reader.onload  = () => {
          const dataUrl = reader.result as string;
          processDataUrl(dataUrl, resolve);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => resolve(''));
  });
}

function processDataUrl(dataUrl: string, resolve: (v: string) => void): void {
  const img = new Image();
  img.onerror = () => resolve('');
  img.onload  = () => {
    try {
      // Cap at 800px wide — prevents iOS Safari canvas memory exhaustion on
      // high-res logos while still producing enough detail for the watermark.
      const MAX_W = 800;
      const scale = Math.min(1, MAX_W / (img.naturalWidth || MAX_W));
      const w     = Math.max(1, Math.round(img.naturalWidth  * scale));
      const h     = Math.max(1, Math.round(img.naturalHeight * scale));

      const canvas  = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx     = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      const { data } = ctx.getImageData(0, 0, w, h);

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

      const out  = document.createElement('canvas');
      out.width  = w;
      out.height = h;
      out.getContext('2d')!.putImageData(new ImageData(data, w, h), 0, 0);
      resolve(out.toDataURL('image/png'));
    } catch {
      resolve('');
    }
  };
  // data URL is in-memory — loading it into an img never taints the canvas
  img.src = dataUrl;
}
