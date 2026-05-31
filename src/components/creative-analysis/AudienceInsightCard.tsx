'use client';

import type { InsightGroupSet } from '../../services/creativeAnalysisService';
import { GroupBarChart, InsightCard } from './InsightCard';

export function AudienceInsightCard({ data }: { data: InsightGroupSet }) {
  return (
    <InsightCard title="Audience" subtitle="受众匹配" tone="green" insight={data.insight} suggestion={data.suggestion} sampleEnough={data.sampleEnough}>
      <GroupBarChart groups={data.groups} />
    </InsightCard>
  );
}
