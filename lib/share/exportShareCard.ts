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

// Composites a watermark onto a captured card PNG via plain canvas drawImage.
// Always produces SOME watermark: logo if available, ctx.fillText otherwise.
// Canvas 2D ops work identically on all browsers including mobile Safari.
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

      if (logoDataUrl) {
        const logo = new Image();
        logo.onload = () => {
          const logoW = 320 * EXPORT_SCALE;
          const logoH = Math.round((logo.naturalHeight / logo.naturalWidth) * logoW);

          // Whiten the logo on a small temp canvas using source-in compositing.
          // This avoids getImageData entirely — no per-pixel CPU work, no taint
          // security check, no large-buffer allocation. Works on all browsers.
          const lc   = document.createElement('canvas');
          lc.width   = logoW;
          lc.height  = logoH;
          const lCtx = lc.getContext('2d');

          if (lCtx) {
            lCtx.drawImage(logo, 0, 0, logoW, logoH);
            lCtx.globalCompositeOperation = 'source-in';
            lCtx.fillStyle = '#FFFFFF';
            lCtx.fillRect(0, 0, logoW, logoH);

            ctx.globalAlpha = 0.13;
            ctx.drawImage(lc, Math.round((W - logoW) / 2), Math.round((H - logoH) / 2), logoW, logoH);
            ctx.globalAlpha = 1;
          } else {
            drawTextWatermark(ctx, W, H);
          }

          resolve(canvas.toDataURL('image/png'));
        };
        logo.onerror = () => {
          drawTextWatermark(ctx, W, H);
          resolve(canvas.toDataURL('image/png'));
        };
        logo.src = logoDataUrl;
      } else {
        drawTextWatermark(ctx, W, H);
        resolve(canvas.toDataURL('image/png'));
      }
    };
    card.onerror = () => resolve(cardDataUrl);
    card.src = cardDataUrl;
  });
}

// ctx.fillText watermark — zero external dependencies, works on every browser.
function drawTextWatermark(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle   = '#FFFFFF';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(W * 0.074)}px Arial, Helvetica, sans-serif`;
  ctx.fillText('SKYLINE', W / 2, H / 2 - Math.round(H * 0.044));
  ctx.font = `700 ${Math.round(W * 0.019)}px Arial, Helvetica, sans-serif`;
  ctx.fillText('CYCLE  TERMINAL', W / 2, H / 2 + Math.round(H * 0.055));
  ctx.restore();
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
