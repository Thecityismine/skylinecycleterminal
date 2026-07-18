import { Suspense } from 'react';
import { MarketRotationView } from '@/components/rotation/MarketRotationView';

function MarketRotationFallback() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="rounded-xl border p-10 text-center" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <p className="text-sm" style={{ color: 'var(--sct-muted)' }}>Loading Market Rotation…</p>
      </div>
    </div>
  );
}

export default function MarketRotationPage() {
  return (
    <Suspense fallback={<MarketRotationFallback />}>
      <MarketRotationView />
    </Suspense>
  );
}
