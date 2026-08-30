import 'server-only';
import sharp from 'sharp';
import { buildChartCardSvg, CARD_W, CARD_H, type ChartCard } from '@/lib/share/server/chartSvg';

// Rasterises a chart card to PNG, with no browser involved.
//
// sharp is used rather than next/og because next/og runs Satori, which has no
// DOM and therefore cannot draw a chart from a library. Going through plain SVG
// means the drawing is ours and the rasteriser is interchangeable.
//
// density matters: sharp renders SVG through librsvg at 72 DPI by default, so a
// 1200px-wide SVG would come out 1200px but soft on text. Rendering at 144 and
// letting the explicit width win produces crisp glyphs at the same output size.

export async function renderChartCardPng(card: ChartCard): Promise<Buffer> {
  const svg = buildChartCardSvg(card);
  return sharp(Buffer.from(svg), { density: 144 })
    .resize(CARD_W, CARD_H, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export { CARD_W, CARD_H };
export type { ChartCard };
