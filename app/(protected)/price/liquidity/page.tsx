import { LiquidityHeatmap } from './LiquidityPageClient';
import { PageHeader } from '@/components/dashboard/PageHeader';

export const metadata = {
  title: 'BTC Liquidity Heatmap | Skyline Cycle Terminal',
  description: 'Real-time Bitcoin order book depth heatmap — live bid/ask walls, support and resistance zones.',
};

export default function LiquidityPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="BTC Liquidity Heatmap"
        subtitle="Real-time Binance order book depth · bid/ask walls · support and resistance zones"
      />
      <LiquidityHeatmap />
    </div>
  );
}
