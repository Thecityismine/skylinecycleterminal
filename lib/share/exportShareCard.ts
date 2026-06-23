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
