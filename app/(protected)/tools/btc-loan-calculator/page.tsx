import { fetchMarketData } from '@/lib/api/coingecko';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { BtcLoanCalculatorPageClient } from '@/components/loan-calculator/BtcLoanCalculatorPageClient';

export const revalidate = 3600;

export default async function BtcLoanCalculatorPage() {
  const [market, prices] = await Promise.all([
    fetchMarketData().catch(() => null),
    fetchBTCDailyPrice('2010-01-01').catch(() => []),
  ]);

  return (
    <BtcLoanCalculatorPageClient
      livePrice={market?.btc.usd ?? null}
      historicalPrices={prices}
    />
  );
}
