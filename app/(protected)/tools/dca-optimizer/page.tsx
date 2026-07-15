import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { DCAOptimizerPageClient } from '@/components/charts/DCAOptimizerPageClient';

export const revalidate = 86400;

export default async function DCAOptimizerPage() {
  const prices = await fetchBTCDailyPrice('2010-01-01');
  return <DCAOptimizerPageClient prices={prices} />;
}
