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
      const canvas  = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx     = canvas.getContext('2d')!;
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

      const out  = document.createElement('canvas');
      out.width  = canvas.width;
      out.height = canvas.height;
      out.getContext('2d')!.putImageData(new ImageData(data, canvas.width, canvas.height), 0, 0);
      resolve(out.toDataURL('image/png'));
    } catch {
      resolve('');
    }
  };
  // data URL is in-memory — loading it into an img never taints the canvas
  img.src = dataUrl;
}
