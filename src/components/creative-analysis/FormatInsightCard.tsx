'use client';

import type { InsightGroupSet } from '../../services/creativeAnalysisService';
import { GroupBarChart, InsightCard } from './InsightCard';

export function FormatInsightCard({ data }: { data: InsightGroupSet }) {
  return (
    <InsightCard title="Format" subtitle="素材形式" tone="gold" insight={data.insight} suggestion={data.suggestion} sampleEnough={data.sampleEnough}>
      <GroupBarChart groups={data.groups} />
    </InsightCard>
  );
}
