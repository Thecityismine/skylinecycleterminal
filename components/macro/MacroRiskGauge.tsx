import { MacroGaugeSvg, LIVE_GAUGE_PALETTE } from '@/components/macro/MacroGaugeSvg';

type Props = {
  score: number | null;
  color: string;
  size?: number;
};

export function MacroRiskGauge({ score, color, size = 300 }: Props) {
  return (
    <MacroGaugeSvg
      score={score}
      color={color}
      size={size}
      palette={LIVE_GAUGE_PALETTE}
      idSuffix="live"
    />
  );
}
