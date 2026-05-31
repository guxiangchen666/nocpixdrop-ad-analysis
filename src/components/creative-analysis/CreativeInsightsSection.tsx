import type { CreativeInsightsDataset } from '../../services/creativeAnalysisService';
import { AudienceInsightCard } from './AudienceInsightCard';
import { CtaInsightCard } from './CtaInsightCard';
import { FormatInsightCard } from './FormatInsightCard';
import { KeywordInsightCard } from './KeywordInsightCard';
import { LifecycleInsightCard } from './LifecycleInsightCard';
import { MaterialTypeInsightCard } from './MaterialTypeInsightCard';

interface CreativeInsightsSectionProps {
  data: CreativeInsightsDataset | null;
  loading: boolean;
  error?: string | null;
}

export function CreativeInsightsSection({ data, loading, error }: CreativeInsightsSectionProps) {
  return (
    <section className="creative-insights-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Creative Insights</p>
          <h2>素材特征拆解</h2>
        </div>
        <span className="soft-tag">{data ? `${data.sampleSize} samples` : loading ? 'Loading' : 'No data'}</span>
      </div>

      {error ? <div className="creative-analysis-state error">{error}</div> : null}
      {loading ? <div className="creative-analysis-state">Loading creative insights...</div> : null}

      {data && !loading ? (
        <div className="creative-insights-grid">
          <FormatInsightCard data={data.format} />
          <MaterialTypeInsightCard data={data.materialType} />
          <CtaInsightCard data={data.cta} />
          <KeywordInsightCard data={data.headlineKeywords} />
          <LifecycleInsightCard data={data.lifecycle} />
          <AudienceInsightCard data={data.audience} />
        </div>
      ) : null}
    </section>
  );
}
