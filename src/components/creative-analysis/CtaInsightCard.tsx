'use client';

import type { InsightGroupSet } from '../../services/creativeAnalysisService';
import { GroupBarChart, InsightCard } from './InsightCard';

export function CtaInsightCard({ data }: { data: InsightGroupSet }) {
  return (
    <InsightCard title="CTA" subtitle="行动按钮" tone="sand" insight={data.insight} suggestion={data.suggestion} sampleEnough={data.sampleEnough}>
      <GroupBarChart groups={data.groups} />
    </InsightCard>
  );
}
