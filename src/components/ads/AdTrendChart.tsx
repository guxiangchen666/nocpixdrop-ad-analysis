'use client';

import { memo, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AdDailyRecord } from '../../types/ads';
import { buildTrendData, type TrendRange } from '../../utils/mockTrend';
import { money, number, roas } from '../../utils/format';
import { ChartMetricToggle, type ChartMetricMode } from '../common/ChartMetricToggle';

interface AdTrendChartProps {
  ad: AdDailyRecord;
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
}

const ranges: TrendRange[] = ['3d', '7d', '14d', '30d'];

export const AdTrendChart = memo(function AdTrendChart({ ad, range, onRangeChange }: AdTrendChartProps) {
  const data = useMemo(() => buildTrendData(ad, range), [ad, range]);
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('all');
  const showSpend = metricMode === 'all' || metricMode === 'spend';
  const showRoi = metricMode === 'all' || metricMode === 'roi';
  const showPurchase = metricMode === 'all' || metricMode === 'purchase';

  return (
    <section className="ad-trend-section" aria-labelledby="ad-trend-title">
      <div className="ad-trend-head">
        <h3 id="ad-trend-title">Performance Trend</h3>
        <div className="chart-head-controls">
          <ChartMetricToggle value={metricMode} onChange={setMetricMode} />
          <div className="range-segmented" role="tablist" aria-label="Trend range">
            {ranges.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={item === range}
                className={item === range ? 'active' : ''}
                onClick={() => onRangeChange(item)}
              >
                {item.replace('d', 'D')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ad-trend-chart">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(120, 102, 70, 0.18)" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            {showSpend ? <YAxis yAxisId="spend" tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} width={58} /> : null}
            {showRoi || showPurchase ? <YAxis yAxisId="metric" orientation="right" tickLine={false} axisLine={false} width={44} /> : null}
            <Tooltip
              formatter={(value, name) => {
                if (name === 'Spend') return [money(Number(value), 2), name];
                if (name === 'ROI') return [roas(Number(value)), name];
                if (name === 'Purchase') return [number(Number(value), 0), name];
                return [value, name];
              }}
              labelFormatter={(label) => `Date ${label}`}
            />
            {showSpend ? <Line yAxisId="spend" type="monotone" dataKey="spend" name="Spend" stroke="#c9a96a" strokeWidth={3} dot={false} activeDot={{ r: 5 }} /> : null}
            {showRoi ? <Line yAxisId="metric" type="monotone" dataKey="roas" name="ROI" stroke="#4a7c6a" strokeWidth={3} dot={false} activeDot={{ r: 5 }} /> : null}
            {showPurchase ? <Line yAxisId="metric" type="monotone" dataKey="purchase" name="Purchase" stroke="#4f6edb" strokeWidth={3} dot={false} activeDot={{ r: 5 }} /> : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
});
