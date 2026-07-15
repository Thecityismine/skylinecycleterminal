import { fetchBTCDailyPrice, fetchBTCRiskFactorData } from '@/lib/api/coinmetrics';
import { RiskLevelPageClient } from '@/components/charts/RiskLevelPageClient';

export const revalidate = 86400;

export default async function RiskLevelPage() {
  const [prices, riskFactorData] = await Promise.all([
    fetchBTCDailyPrice('2010-01-01'),
    fetchBTCRiskFactorData('2011-01-01'),
  ]);

  return <RiskLevelPageClient prices={prices} riskFactorData={riskFactorData} />;
}
