'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CreativeTrendPoint, CreativeTrendRange } from '../../types/creatives';
import { money, number, percent, roas } from '../../utils/format';
import { ChartMetricToggle, type ChartMetricMode } from '../common/ChartMetricToggle';

interface CreativeTrendPanelProps {
  data: CreativeTrendPoint[];
  range: CreativeTrendRange;
  eyebrow?: string;
  title?: string;
  onRangeChange: (range: CreativeTrendRange) => void;
}

const ranges: CreativeTrendRange[] = ['7d', '14d', '30d'];

export function CreativeTrendPanel({ data, range, eyebrow = 'Creative trend', title = '近段时间表现', onRangeChange }: CreativeTrendPanelProps) {
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('all');
  const showSpend = metricMode === 'all' || metricMode === 'spend';
  const showRoi = metricMode === 'all' || metricMode === 'roi';
  const showPurchase = metricMode === 'all' || metricMode === 'purchase';
  const totals = data.reduce(
    (acc, point) => ({
      spend: acc.spend + point.spend,
      purchase: acc.purchase + point.purchase,
      purchaseValue: acc.purchaseValue + point.purchaseValue,
      impressions: acc.impressions + point.impressions,
      clicks: acc.clicks + point.clicks,
    }),
    { spend: 0, purchase: 0, purchaseValue: 0, impressions: 0, clicks: 0 },
  );
  const totalRoas = totals.spend > 0 ? totals.purchaseValue / totals.spend : 0;
  const totalCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

  return (
    <section className="creative-trend-panel" aria-labelledby="creative-trend-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id="creative-trend-title">{title}</h2>
        </div>
        <div className="chart-head-controls">
          <ChartMetricToggle value={metricMode} onChange={setMetricMode} />
          <div className="range-segmented" role="tablist" aria-label="Creative trend range">
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

      <div className="creative-trend-summary" aria-label="Selected range summary">
        <span>Spend <strong>{money(totals.spend)}</strong></span>
        <span>Purchase <strong>{number(totals.purchase, 0)}</strong></span>
        <span>ROAS <strong>{roas(totalRoas)}</strong></span>
        <span>CTR <strong>{percent(totalCtr)}</strong></span>
      </div>

      <div className="creative-trend-chart">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="creativeTrendSpend" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#3a8f7a" stopOpacity={0.26} />
                <stop offset="95%" stopColor="#3a8f7a" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(120, 102, 70, 0.18)" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(value) => String(value).slice(5)} />
            {showSpend ? <YAxis yAxisId="spend" tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} width={58} /> : null}
            {showRoi || showPurchase ? <YAxis yAxisId="metric" orientation="right" tickLine={false} axisLine={false} width={48} /> : null}
            <Tooltip
              formatter={(value, name) => {
                if (name === 'Spend') return [money(Number(value), 2), name];
                if (name === 'ROI') return [roas(Number(value)), name];
                if (name === 'Purchase') return [number(Number(value), 0), name];
                return [value, name];
              }}
              labelFormatter={(label) => `Date ${label}`}
            />
            {showSpend ? <Area yAxisId="spend" type="monotone" dataKey="spend" name="Spend" stroke="#3a8f7a" fill="url(#creativeTrendSpend)" strokeWidth={2} /> : null}
            {showRoi ? <Line yAxisId="metric" type="monotone" dataKey="roas" name="ROI" stroke="#4f6edb" strokeWidth={3} dot={false} activeDot={{ r: 5 }} /> : null}
            {showPurchase ? <Line yAxisId="metric" type="monotone" dataKey="purchase" name="Purchase" stroke="#d98b38" strokeWidth={3} dot={false} activeDot={{ r: 5 }} /> : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="creative-trend-table-wrap">
        <table className="creative-trend-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Spend</th>
              <th>Purchase</th>
              <th>ROAS</th>
              <th>CPA</th>
              <th>CTR</th>
              <th>CPC</th>
              <th>CPM</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.date}>
                <td>{point.date}</td>
                <td>{money(point.spend)}</td>
                <td>{number(point.purchase, 0)}</td>
                <td>{roas(point.roas)}</td>
                <td>{money(point.cpa, 2)}</td>
                <td>{percent(point.ctr)}</td>
                <td>{money(point.cpc, 2)}</td>
                <td>{money(point.cpm, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
