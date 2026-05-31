'use client';

import { Card } from 'animal-island-ui';
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardTrendPoint } from '../../types/dashboard';
import { ChartMetricToggle, type ChartMetricMode } from '../common/ChartMetricToggle';
import { money, number, roas } from '../../utils/format';

export function TrendChart({ data, rangeLabel }: { data: DashboardTrendPoint[]; rangeLabel: string }) {
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('all');
  const showSpend = metricMode === 'all' || metricMode === 'spend';
  const showRoi = metricMode === 'all' || metricMode === 'roi';
  const showPurchase = metricMode === 'all' || metricMode === 'purchase';

  return (
    <Card className="chart-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{rangeLabel} pulse</p>
          <h2>{rangeLabel}趋势</h2>
        </div>
        <ChartMetricToggle value={metricMode} onChange={setMetricMode} />
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={310}>
          <AreaChart data={data} margin={{ top: 16, right: 18, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="spendGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#3a8f7a" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#3a8f7a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#eadfc6" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} />
            {showSpend ? <YAxis yAxisId="left" tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} /> : null}
            {showRoi || showPurchase ? <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} /> : null}
            <Tooltip
              formatter={(value, name) => {
                if (name === 'Spend') return [money(Number(value), 2), '花费'];
                if (name === 'ROI') return [roas(Number(value)), 'ROI'];
                if (name === 'Purchase') return [number(Number(value), 0), '转化'];
                return [value, name];
              }}
            />
            {showSpend ? <Area yAxisId="left" type="monotone" dataKey="spend" stroke="#3a8f7a" fill="url(#spendGradient)" name="Spend" /> : null}
            {showPurchase ? <Line yAxisId="right" type="monotone" dataKey="purchase" stroke="#d98b38" strokeWidth={3} name="Purchase" /> : null}
            {showRoi ? <Line yAxisId="right" type="monotone" dataKey="roas" stroke="#4f6edb" strokeWidth={3} name="ROI" /> : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
