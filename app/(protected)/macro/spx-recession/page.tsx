import { PageHeader }        from '@/components/dashboard/PageHeader';
import { StatCard }          from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { SPXPageClient }     from '@/components/charts/SPXPageClient';
import {
  NBER_RECESSIONS,
  slidingMA,
  computeRecessionRiskScore,
  riskLevel,
  RISK_META,
  scoreYieldCurve,
  scoreSahm,
  scoreHYSpread,
  scoreUnemployment,
  scoreISM,
  scoreSPXTrend,
  type SPXPoint,
} from '@/lib/indicators/recessionRisk';

export const dynamic = 'force-dynamic';

// ── FRED fetch helper ─────────────────────────────────────────────────────────

async function fredSince(series: string, start: string): Promise<{ date: string; value: number }[]> {
  const key = process.env.FRED_API_KEY?.trim();
  if (!key) throw new Error('FRED_API_KEY not set');
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${series}&api_key=${key}&file_type=json` +
    `&sort_order=asc&observation_start=${start}`;
  const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`FRED ${series} HTTP ${res.status}`);
  const json = await res.json();
  return (json.observations as Array<{ date: string; value: string }>)
    .filter(o => o.value !== '.' && o.value !== '')
    .map(o => ({ date: o.date, value: Number(o.value) }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUSD(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v: number, dp = 1): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(dp)}%`;
}

function downsample<T>(arr: T[], max = 1200): T[] {
  if (arr.length <= max) return arr;
  const step = Math.floor(arr.length / max);
  return arr.filter((_, i) => i % step === 0 || i === arr.length - 1);
}

// ── Signal card component (inline) ───────────────────────────────────────────

function SignalCard({
  label, value, status, statusColor, sub,
}: {
  label: string; value: string; status: string;
  statusColor: string; sub?: string;
}) {
  return (
    <div
      className="rounded-xl border p-4 space-y-2"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>
        {label}
      </p>
      <p className="text-xl font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>{value}</p>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
        <span className="text-xs font-mono" style={{ color: statusColor }}>{status}</span>
      </div>
      {sub && <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>{sub}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SPXRecessionPage() {
  // Fetch all FRED series in parallel — FRED SP500 is weekly (from 2011-01-07)
  const [spxRaw, t10y2yRaw, sahmRaw, unrateRaw, hyRaw, ismRaw] = await Promise.allSettled([
    fredSince('SP500',         '2010-01-01'),
    fredSince('T10Y2Y',        '2000-01-01'),
    fredSince('SAHMREALTIME',  '2000-01-01'),
    fredSince('UNRATE',        '1999-01-01'),
    fredSince('BAMLH0A0HYM2',  '2000-01-01'),
    fredSince('NAPM',          '2000-01-01'),
  ]);

  const spx     = spxRaw.status     === 'fulfilled' ? spxRaw.value     : [];
  const t10y2y  = t10y2yRaw.status  === 'fulfilled' ? t10y2yRaw.value  : [];
  const sahmSer = sahmRaw.status    === 'fulfilled' ? sahmRaw.value    : [];
  const unrate  = unrateRaw.status  === 'fulfilled' ? unrateRaw.value  : [];
  const hySer   = hyRaw.status      === 'fulfilled' ? hyRaw.value      : [];
  const ismSer  = ismRaw.status     === 'fulfilled' ? ismRaw.value     : [];

  // ── Build SPX chart data ──────────────────────────────────────────────────
  // FRED SP500 is weekly — use 50-period and 200-period MAs (not daily 250/1000)
  const prices  = spx.map(d => d.value);
  const ma50w   = slidingMA(prices, 50);
  const ma200w  = slidingMA(prices, 200);

  const allPoints: SPXPoint[] = spx.map((d, i) => ({
    time:   d.date,
    ts:     new Date(d.date + 'T00:00:00Z').getTime(),
    price:  d.value,
    ma50w:  ma50w[i],
    ma200w: ma200w[i],
  }));

  // Only show chart from 2000 onwards but keep full array for MA warmup
  const chartPoints = downsample(allPoints.filter(d => d.time >= '2000-01-01'));

  // ── Current stats ─────────────────────────────────────────────────────────
  const lastSPX   = spx.at(-1);
  const spxPrice  = lastSPX?.value ?? 0;
  const last200w  = allPoints.at(-1)?.ma200w ?? null;
  const last50w   = allPoints.at(-1)?.ma50w  ?? null;
  const ath       = Math.max(...prices);
  const athDrawdown = spxPrice > 0 ? ((spxPrice - ath) / ath) * 100 : 0;
  const pctVs200w = last200w ? ((spxPrice - last200w) / last200w) * 100 : null;
  const pctVs50w  = last50w  ? ((spxPrice - last50w)  / last50w)  * 100 : null;

  // ── Latest signal values ──────────────────────────────────────────────────
  const latestT10y2y  = t10y2y.at(-1)?.value  ?? 0;
  const latestSahm    = sahmSer.at(-1)?.value  ?? 0;
  const latestHY      = hySer.at(-1)?.value    ?? 0;
  const latestUnrate  = unrate.at(-1)?.value   ?? 0;
  const unrate12mAgo  = unrate.length > 12 ? unrate[unrate.length - 13].value : latestUnrate;
  const latestISM     = ismSer.at(-1)?.value   ?? 50;
  const latestISMDate = ismSer.at(-1)?.date    ?? '';

  // ── Recession risk score ──────────────────────────────────────────────────
  const riskScore = computeRecessionRiskScore({
    t10y2y:       latestT10y2y,
    sahm:         latestSahm,
    hyOas:        latestHY,
    unrate:       latestUnrate,
    unrate12mAgo,
    ism:          latestISM,
    spxPrice,
    spx200wma:    last200w,
  });

  const level    = riskLevel(riskScore);
  const regimeMeta = RISK_META[level];

  // ── Signal interpretations ────────────────────────────────────────────────
  const ycScore  = scoreYieldCurve(latestT10y2y);
  const yieldCurveStatus = latestT10y2y > 1   ? { label: 'Normal — Healthy', color: '#35D07F' }
    : latestT10y2y > 0.5                       ? { label: 'Flattening', color: '#E6B450' }
    : latestT10y2y > 0                         ? { label: 'Near Flat — Caution', color: '#F97316' }
    : latestT10y2y > -0.5                      ? { label: 'Inverted — Warning', color: '#FF5C5C' }
    :                                            { label: 'Deeply Inverted', color: '#FF5C5C' };

  const sahmStatus = latestSahm >= 0.50 ? { label: 'Triggered ⚠︎', color: '#FF5C5C' }
    : latestSahm >= 0.35                ? { label: 'Approaching Trigger', color: '#F97316' }
    : latestSahm >= 0.20                ? { label: 'Watch', color: '#E6B450' }
    :                                    { label: 'Not Triggered', color: '#35D07F' };

  const hyStatus = latestHY < 3.5  ? { label: 'Tight — Risk-On', color: '#35D07F' }
    : latestHY < 5.0               ? { label: 'Normal', color: '#E6B450' }
    : latestHY < 7.0               ? { label: 'Widening — Stress', color: '#F97316' }
    :                                { label: 'Distressed', color: '#FF5C5C' };

  const unrateDelta = latestUnrate - unrate12mAgo;
  const unrateStatus = unrateDelta > 0.5  ? { label: 'Rising — Caution', color: '#F97316' }
    : unrateDelta > 0.2                   ? { label: 'Ticking Up', color: '#E6B450' }
    :                                       { label: 'Stable', color: '#35D07F' };

  const ismStatus = latestISM > 55  ? { label: 'Strong Expansion', color: '#35D07F' }
    : latestISM > 50                ? { label: 'Expansion', color: '#35D07F' }
    : latestISM > 48                ? { label: 'Contraction — Mild', color: '#E6B450' }
    : latestISM > 45                ? { label: 'Contraction', color: '#F97316' }
    :                                 { label: 'Deep Contraction', color: '#FF5C5C' };

  const spxTrendStatus = last200w && spxPrice > last200w * 1.10 ? { label: 'Above 200W — Strong', color: '#35D07F' }
    : last200w && spxPrice > last200w                           ? { label: 'Above 200W MA', color: '#35D07F' }
    : last200w && spxPrice > last200w * 0.90                    ? { label: 'Near 200W MA', color: '#E6B450' }
    :                                                              { label: 'Below 200W MA', color: '#FF5C5C' };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="S&P 500 & Recession Risk"
        subtitle="Equity trend, NBER recession history, and early-warning macro signals"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="S&P 500"
          value={spxPrice > 0 ? spxPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'}
          sub="Latest close"
          accent="var(--sct-text)"
          freshness="daily"
        />
        <StatCard
          label="vs 200W MA"
          value={pctVs200w != null ? fmtPct(pctVs200w) : '—'}
          sub={last200w ? `200W MA: ${last200w.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
          accent={pctVs200w != null && pctVs200w > 0 ? '#35D07F' : '#FF5C5C'}
        />
        <StatCard
          label="ATH Drawdown"
          value={athDrawdown < -0.1 ? fmtPct(athDrawdown) : 'At ATH'}
          sub={`ATH: ${ath.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          accent={athDrawdown > -5 ? '#35D07F' : athDrawdown > -15 ? '#E6B450' : '#FF5C5C'}
        />
        <StatCard
          label="Recession Risk"
          value={`${riskScore} / 100`}
          sub={regimeMeta.label.split('—')[0].trim()}
          accent={regimeMeta.color}
        />
      </div>

      {/* Regime badge */}
      <div
        className="flex items-center gap-3 rounded-xl border px-5 py-3"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: regimeMeta.color }}
      >
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: regimeMeta.color }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: regimeMeta.color }}>{regimeMeta.label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>{regimeMeta.desc}</p>
        </div>
      </div>

      {/* Main chart */}
      <SPXPageClient
        data={chartPoints}
        ath={ath}
        sharePayload={{
          spxPrice:    spxPrice,
          pctVs200w:   pctVs200w,
          athDrawdown: athDrawdown,
          ath:         ath,
          riskScore:   riskScore,
          riskLabel:   regimeMeta.label.split('—')[0].trim(),
          riskColor:   regimeMeta.color,
        }}
      />

      {/* Signal grid */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--sct-muted)' }}>
          Early-Warning Signals
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <SignalCard
            label="Yield Curve (10Y−2Y)"
            value={`${latestT10y2y >= 0 ? '+' : ''}${latestT10y2y.toFixed(2)}%`}
            status={yieldCurveStatus.label}
            statusColor={yieldCurveStatus.color}
            sub="Inversion → re-steepening historically precedes recessions by 6–18 months"
          />
          <SignalCard
            label="Sahm Rule"
            value={latestSahm.toFixed(2)}
            status={sahmStatus.label}
            statusColor={sahmStatus.color}
            sub="Trigger at ≥ 0.50 — 3-month avg unemployment rise above 12-month low"
          />
          <SignalCard
            label="HY Credit Spreads"
            value={`${latestHY.toFixed(2)}%`}
            status={hyStatus.label}
            statusColor={hyStatus.color}
            sub="ICE BofA US HY OAS — widening signals deteriorating credit conditions"
          />
          <SignalCard
            label="Unemployment Rate"
            value={`${latestUnrate.toFixed(1)}%`}
            status={unrateStatus.label}
            statusColor={unrateStatus.color}
            sub={`12-month change: ${fmtPct(unrateDelta)} · 12m ago: ${unrate12mAgo.toFixed(1)}%`}
          />
          <SignalCard
            label={`ISM Manufacturing${latestISMDate ? ` · ${latestISMDate.slice(0, 7)}` : ''}`}
            value={latestISM.toFixed(1)}
            status={ismStatus.label}
            statusColor={ismStatus.color}
            sub="Above 50 = expansion · below 48 = meaningful contraction"
          />
          <SignalCard
            label="SPX Trend"
            value={pctVs200w != null ? fmtPct(pctVs200w) + ' vs 200W' : '—'}
            status={spxTrendStatus.label}
            statusColor={spxTrendStatus.color}
            sub={pctVs50w != null ? `vs 50W MA: ${fmtPct(pctVs50w)}` : undefined}
          />
        </div>
      </div>

      {/* Recession Risk Score breakdown */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
          Recession Risk Score Breakdown — {riskScore} / 100
        </p>
        <div className="space-y-3">
          {[
            { label: 'Yield Curve (20%)',       score: scoreYieldCurve(latestT10y2y),                           weight: 0.20 },
            { label: 'Sahm Rule (20%)',          score: scoreSahm(latestSahm),                                  weight: 0.20 },
            { label: 'Credit Spreads (20%)',     score: scoreHYSpread(latestHY),                                 weight: 0.20 },
            { label: 'Unemployment (15%)',       score: scoreUnemployment(latestUnrate, unrate12mAgo),           weight: 0.15 },
            { label: 'ISM Manufacturing (15%)', score: scoreISM(latestISM),                                      weight: 0.15 },
            { label: 'SPX Trend (10%)',          score: scoreSPXTrend(spxPrice, last200w),                       weight: 0.10 },
          ].map(({ label, score, weight }) => {
            const contrib = score * weight;
            const color   = score < 25 ? '#35D07F' : score < 50 ? '#E6B450' : score < 75 ? '#F97316' : '#FF5C5C';
            return (
              <div key={label}>
                <div className="flex justify-between items-center mb-1 text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
                  <span>{label}</span>
                  <span style={{ color }}>{score} pts · contributes {contrib.toFixed(1)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${score}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Risk level legend */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 pt-4 border-t text-xs font-mono" style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}>
          {[['0–24', 'Low Risk', '#35D07F'], ['25–49', 'Watch', '#E6B450'], ['50–74', 'Elevated', '#F97316'], ['75–100', 'Severe', '#FF5C5C']].map(([range, label, color]) => (
            <span key={range} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              {range}: {label}
            </span>
          ))}
        </div>
      </div>

      {/* Historical recession drawdown table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: 'var(--sct-border)' }}
      >
        <div className="px-5 py-4 border-b" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>Historical Recession Drawdowns</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Peak-to-trough measured from S&P 500 cycle high, not NBER start date
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ backgroundColor: 'var(--sct-panel)', color: 'var(--sct-muted)' }}>
                {['Recession', 'SPX Drawdown', 'Months to Trough', 'Months to Recovery'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-medium tracking-wider uppercase text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NBER_RECESSIONS.map((r, i) => (
                <tr
                  key={r.label}
                  style={{
                    backgroundColor: i % 2 === 0 ? 'var(--sct-card)' : 'var(--sct-panel)',
                    borderTop: `1px solid var(--sct-border)`,
                  }}
                >
                  <td className="px-5 py-3" style={{ color: 'var(--sct-text)' }}>{r.label}</td>
                  <td className="px-5 py-3" style={{ color: '#FF5C5C' }}>{r.spxDrawdown.toFixed(1)}%</td>
                  <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>{r.monthsTrough} mo</td>
                  <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>{r.monthsRecovery} mo</td>
                </tr>
              ))}
              {/* Current row */}
              {athDrawdown < -1 && (
                <tr style={{ backgroundColor: 'var(--sct-card)', borderTop: `1px solid var(--sct-border)` }}>
                  <td className="px-5 py-3 font-semibold" style={{ color: '#E6B450' }}>Current Drawdown</td>
                  <td className="px-5 py-3" style={{ color: athDrawdown < -20 ? '#FF5C5C' : '#E6B450' }}>
                    {fmtPct(athDrawdown)}
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>—</td>
                  <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>—</td>
                </tr>
              )}
              <tr style={{ backgroundColor: 'var(--sct-panel)', borderTop: `1px solid var(--sct-border)` }}>
                <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>Median (historical)</td>
                <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>−46.5%</td>
                <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>9 mo</td>
                <td className="px-5 py-3" style={{ color: 'var(--sct-muted)' }}>27 mo</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div
        className="rounded-xl border px-5 py-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--sct-muted)' }}>
          Methodology Note
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          NBER recession dates are <strong style={{ color: 'var(--sct-text)' }}>backward-looking official classifications</strong> based on a broad review of economic activity across multiple sectors.
          The NBER Business Cycle Dating Committee typically declares recessions months or years after they begin.
          This page measures recession risk and historical context — <strong style={{ color: 'var(--sct-text)' }}>not a prediction of the next recession.</strong>
          The composite risk score is a simplified heuristic combining publicly available macro signals and should not be used as a sole investment decision tool.
        </p>
      </div>

      <InsightPanel title="Signal Definitions">
        <InsightRow label="Yield Curve (10Y−2Y)" value="Spread between 10-year and 2-year Treasury yields. Inversion (negative) has preceded every US recession since 1955. The key signal is re-steepening after inversion — especially when unemployment is also rising." stack />
        <InsightRow label="Sahm Rule" value="Triggers when the 3-month average unemployment rate rises ≥ 0.50 percentage points above its 12-month low. Created by Fed economist Claudia Sahm. Has correctly identified every recession in real time since 1970." valueColor="#E6B450" stack />
        <InsightRow label="HY Credit Spreads" value="ICE BofA US High Yield OAS (BAMLH0A0HYM2). Credit spreads widen when markets price in higher default risk. Typically widened 200–600 bps before and during recessions." stack />
        <InsightRow label="ISM Manufacturing PMI" value="Institute for Supply Management Manufacturing Index (NAPM on FRED). Above 50 = expansion. A sustained move below 48 has historically signaled broader economic weakness within 2–4 quarters." stack />
        <InsightRow label="Source" value="S&P 500: FRED SP500 · Yield Curve: FRED T10Y2Y · Sahm Rule: FRED SAHMREALTIME · HY Spread: FRED BAMLH0A0HYM2 · Unemployment: FRED UNRATE · ISM: FRED NAPM" stack />
      </InsightPanel>
    </div>
  );
}
