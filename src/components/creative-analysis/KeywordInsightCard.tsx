import type { KeywordInsightSet } from '../../services/creativeAnalysisService';
import { roas } from '../../utils/format';
import { InsightCard } from './InsightCard';

export function KeywordInsightCard({ data }: { data: KeywordInsightSet }) {
  const maxRoas = Math.max(...data.groups.map((group) => group.roas), 0.01);

  return (
    <InsightCard title="Headline Keywords" subtitle="标题关键词" tone="gold" insight={data.insight} suggestion={data.suggestion} sampleEnough={data.sampleEnough}>
      <div className="keyword-bar-list">
        {data.groups.map((group) => (
          <div key={group.word} className="keyword-bar">
            <span>{group.word}</span>
            <i style={{ width: `${Math.max(8, (group.roas / maxRoas) * 100)}%` }} />
            <b>{roas(group.roas)} · {group.count}</b>
          </div>
        ))}
      </div>
    </InsightCard>
  );
}
