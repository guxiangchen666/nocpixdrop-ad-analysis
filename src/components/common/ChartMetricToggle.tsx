'use client';

export type ChartMetricMode = 'all' | 'spend' | 'roi' | 'purchase';

interface ChartMetricToggleProps {
  value: ChartMetricMode;
  onChange: (value: ChartMetricMode) => void;
}

const options: Array<{ key: ChartMetricMode; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'spend', label: '花费' },
  { key: 'roi', label: 'ROI' },
  { key: 'purchase', label: '转化' },
];

export function ChartMetricToggle({ value, onChange }: ChartMetricToggleProps) {
  return (
    <div className="chart-metric-toggle" role="tablist" aria-label="Chart metric">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="tab"
          aria-selected={value === option.key}
          className={value === option.key ? 'active' : ''}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
