'use client';

import type { InsightGroupSet } from '../../services/creativeAnalysisService';
import { GroupBarChart, InsightCard } from './InsightCard';

export function MaterialTypeInsightCard({ data }: { data: InsightGroupSet }) {
  return (
    <InsightCard title="Material Type" subtitle="素材类型" tone="green" insight={data.insight} suggestion={data.suggestion} sampleEnough={data.sampleEnough}>
      <GroupBarChart groups={data.groups} />
    </InsightCard>
  );
}
