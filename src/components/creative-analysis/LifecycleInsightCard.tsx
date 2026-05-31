'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { LifecycleInsightSet } from '../../services/creativeAnalysisService';
import { InsightCard } from './InsightCard';

export function LifecycleInsightCard({ data }: { data: LifecycleInsightSet }) {
  return (
    <InsightCard title="Lifecycle" subtitle="素材生命周期" tone="red" insight={data.insight} suggestion={data.suggestion} sampleEnough={data.sampleEnough}>
      <div className="lifecycle-chart">
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={data.days} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}d`} />
            <YAxis tickLine={false} axisLine={false} width={38} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value, name) => [`${Number(value).toFixed(2)}${name === 'ctr' ? '%' : 'x'}`, name]} labelFormatter={(label) => `上线 ${label} 天`} />
            <Line type="monotone" dataKey="ctr" name="ctr" stroke="#4a7c6a" strokeWidth={3} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="roas" name="roas" stroke="#c9a96a" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </InsightCard>
  );
}
