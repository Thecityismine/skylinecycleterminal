import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';

export type RotationStatRow = { label: string; value: string; color?: string };

export function RotationStatsTable({ rows, title = 'Stats' }: { rows: RotationStatRow[]; title?: string }) {
  return (
    <InsightPanel title={title}>
      {rows.map((r) => (
        <InsightRow key={r.label} label={r.label} value={r.value} valueColor={r.color} />
      ))}
    </InsightPanel>
  );
}
