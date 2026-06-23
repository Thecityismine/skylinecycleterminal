import { toPng } from 'html-to-image';

export const SHARE_CARD_WIDTH  = 1200;
export const SHARE_CARD_HEIGHT = 675;
export const EXPORT_SCALE      = 2;    // final PNG: 2400×1350

export async function exportShareCard(node: HTMLElement): Promise<string> {
  return toPng(node, {
    cacheBust:       true,
    pixelRatio:      EXPORT_SCALE,
    backgroundColor: '#0D1117',
    width:           SHARE_CARD_WIDTH,
    height:          SHARE_CARD_HEIGHT,
  });
}

// Composites a pre-processed logo (transparent white pixels) onto a captured
// card PNG via plain canvas drawImage — works identically on all browsers
// including mobile Safari, where <img> inside SVG foreignObject is unreliable.
export function compositeWatermark(
  cardDataUrl: string,
  logoDataUrl: string,
): Promise<string> {
  const W = SHARE_CARD_WIDTH  * EXPORT_SCALE;
  const H = SHARE_CARD_HEIGHT * EXPORT_SCALE;

  return new Promise((resolve) => {
    const canvas  = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const card = new Image();
    card.onload = () => {
      ctx.drawImage(card, 0, 0, W, H);

      const logo = new Image();
      logo.onload = () => {
        const logoW = 320 * EXPORT_SCALE;
        const logoH = Math.round((logo.naturalHeight / logo.naturalWidth) * logoW);
        ctx.globalAlpha = 0.13;
        ctx.drawImage(
          logo,
          Math.round((W - logoW) / 2),
          Math.round((H - logoH) / 2),
          logoW,
          logoH,
        );
        ctx.globalAlpha = 1;
        resolve(canvas.toDataURL('image/png'));
      };
      logo.onerror = () => resolve(cardDataUrl);
      logo.src = logoDataUrl;
    };
    card.onerror = () => resolve(cardDataUrl);
    card.src = cardDataUrl;
  });
}

export function downloadPng(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href     = dataUrl;
  link.download = fileName;
  link.click();
}

export function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, data] = dataUrl.split(',');
  const mime  = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const bytes = atob(data);
  const arr   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], fileName, { type: mime });
}
