import { fetchBTCDailyPrice, fetchBTCRiskFactorData } from '@/lib/api/coinmetrics';
import { SmartDcaEnginePageClient } from '@/components/charts/SmartDcaEnginePageClient';

export const revalidate = 86400;

export default async function SmartDcaEnginePage() {
  const [prices, riskFactorData] = await Promise.all([
    fetchBTCDailyPrice('2010-01-01'),
    fetchBTCRiskFactorData('2011-01-01'),
  ]);

  return <SmartDcaEnginePageClient prices={prices} riskFactorData={riskFactorData} />;
}
