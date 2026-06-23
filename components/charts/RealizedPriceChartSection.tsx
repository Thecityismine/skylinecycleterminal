"use client";

import { useState, useMemo, useCallback } from 'react';
import { RealizedPriceChart } from '@/components/charts/RealizedPriceChart';
import { RealizedPriceShareModal } from '@/components/share/RealizedPriceShareModal';
import type { RealizedPriceSharePayload } from '@/components/share/RealizedPriceShareCard';
import type { RealizedPricePoint } from '@/lib/api/coinmetrics';

const PERIODS = [
  { label: 'All', days: Infinity },
  { label: '3Y',  days: 1095 },
  { label: '1Y',  days: 365  },
  { label: '3M',  days: 90   },
];

type Props = {
  data:           RealizedPricePoint[];
  currentPrice:   number;
  ma200w:         number | null;
  ratio:          number | null;
  premium:        number | null;
  zoneLabel:      string;
  zoneColor:      string;
  secondaryLabel: string;
  secondaryColor: string;
  generatedAt:    string;
};

export function RealizedPriceChartSection({
  data, currentPrice, ma200w, ratio, premium, zoneLabel, zoneColor,
  secondaryLabel, secondaryColor, generatedAt,
}: Props) {
  const [period, setPeriod] = useState('3Y');

  const handlePeriodChange = useCallback((p: string) => setPeriod(p), []);

  const filteredData = useMemo(() => {
    const p = PERIODS.find((x) => x.label === period);
    if (!p || p.days === Infinity) return data;
    const cutoff = Date.now() - p.days * 86_400_000;
    return data.filter((d) => new Date(d.time).getTime() >= cutoff);
  }, [data, period]);

  const sharePayload: RealizedPriceSharePayload = {
    data:           filteredData,
    period,
    currentPrice,
    ma200w,
    ratio,
    premium,
    zoneLabel,
    zoneColor,
    secondaryLabel,
    secondaryColor,
    generatedAt,
  };

  return (
    <RealizedPriceChart
      data={data}
      realizedAvailable={true}
      secondaryLabel={secondaryLabel}
      secondaryColor={secondaryColor}
      onPeriodChange={handlePeriodChange}
      shareButton={<RealizedPriceShareModal payload={sharePayload} />}
    />
  );
}
