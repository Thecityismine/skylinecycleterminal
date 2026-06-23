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

// Card coordinates (pre-scale) of the chart plot area — used to match the
// watermark position/size to the live ChartWatermark component.
export type CardChartRect = { x: number; y: number; w: number; h: number };

// Composites a watermark onto a captured card PNG via plain canvas drawImage.
// chartRect (card-pixel coords) scopes the watermark to the chart area so it
// matches the live ChartWatermark position. Falls back to full-card centering.
export function compositeWatermark(
  cardDataUrl: string,
  logoDataUrl: string,
  chartRect?: CardChartRect,
): Promise<string> {
  const W = SHARE_CARD_WIDTH  * EXPORT_SCALE;
  const H = SHARE_CARD_HEIGHT * EXPORT_SCALE;

  // Scale rect to export canvas coordinates
  const rect = chartRect
    ? {
        x: chartRect.x * EXPORT_SCALE,
        y: chartRect.y * EXPORT_SCALE,
        w: chartRect.w * EXPORT_SCALE,
        h: chartRect.h * EXPORT_SCALE,
      }
    : { x: 0, y: 0, w: W, h: H };

  // Logo width: 220/1136 ≈ 19.4% of chart width, matching live ChartWatermark
  const logoW = Math.round(rect.w * 0.194);
  const cxLogo = rect.x + rect.w / 2;
  const cyLogo = rect.y + rect.h / 2;

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
          const logoH = Math.round((logo.naturalHeight / logo.naturalWidth) * logoW);

          // Whiten the logo via source-in compositing — no getImageData needed.
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
            ctx.drawImage(lc, Math.round(cxLogo - logoW / 2), Math.round(cyLogo - logoH / 2), logoW, logoH);
            ctx.globalAlpha = 1;
          } else {
            drawTextWatermark(ctx, rect);
          }

          resolve(canvas.toDataURL('image/png'));
        };
        logo.onerror = () => {
          drawTextWatermark(ctx, rect);
          resolve(canvas.toDataURL('image/png'));
        };
        logo.src = logoDataUrl;
      } else {
        drawTextWatermark(ctx, rect);
        resolve(canvas.toDataURL('image/png'));
      }
    };
    card.onerror = () => resolve(cardDataUrl);
    card.src = cardDataUrl;
  });
}

// ctx.fillText watermark — zero external dependencies, works on every browser.
function drawTextWatermark(ctx: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }): void {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.globalAlpha  = 0.09;
  ctx.fillStyle    = '#FFFFFF';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(rect.w * 0.074)}px Arial, Helvetica, sans-serif`;
  ctx.fillText('SKYLINE', cx, cy - Math.round(rect.h * 0.044));
  ctx.font = `700 ${Math.round(rect.w * 0.019)}px Arial, Helvetica, sans-serif`;
  ctx.fillText('CYCLE  TERMINAL', cx, cy + Math.round(rect.h * 0.055));
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
