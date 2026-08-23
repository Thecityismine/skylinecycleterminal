import { HyperliquidPositioning } from './HyperliquidPageClient';
import { PageHeader } from '@/components/dashboard/PageHeader';

export const metadata = {
  title: 'Hyperliquid Positioning | Skyline Cycle Terminal',
  description:
    'Hyperliquid perpetuals positioning: open interest, funding rate, mark vs oracle premium and volume for BTC and ETH.',
};

export default function HyperliquidPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Hyperliquid Positioning"
        subtitle="Perpetuals open interest · funding rate · mark vs oracle premium · BTC and ETH"
      />
      <HyperliquidPositioning />
    </div>
  );
}
