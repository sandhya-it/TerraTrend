import { TrendStatusLabel } from '../types/terratrend';

interface TrendStatusIndicatorProps {
  status: TrendStatusLabel;
  compact?: boolean;
}

export function TrendStatusIndicator({ status, compact = false }: TrendStatusIndicatorProps) {
  let colorClass = 'text-[#8FA8C8]';
  let glyph = '●';
  let shortText = 'No significant trend';

  if (status === 'Statistically significant increasing trend') {
    colorClass = 'text-[#39D6A0]';
    glyph = '▲';
    shortText = 'Sig. increasing';
  } else if (status === 'Statistically significant decreasing trend') {
    colorClass = 'text-[#F45B69]';
    glyph = '▼';
    shortText = 'Sig. decreasing';
  } else if (status === 'Insufficient data') {
    colorClass = 'text-[#FFB547]';
    glyph = '◌';
    shortText = 'Insufficient data';
  } else {
    colorClass = 'text-[#36D9E6]';
    glyph = '●';
    shortText = 'Not significant';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs font-medium ${colorClass}`}>
      <span aria-hidden="true">{glyph}</span>
      <span>{compact ? shortText : status}</span>
    </span>
  );
}
