'use client';

import type { AiCreativeRecommendation, AiRecommendationResponse } from '../../types/aiRecommendations';
import { AiRecommendationCard } from './AiRecommendationCard';

interface AiRecommendationsProps {
  data: AiRecommendationResponse | null;
  loading: boolean;
  error?: string | null;
  onRegenerate: () => void;
  onGenerateBrief: (recommendation: AiCreativeRecommendation) => void;
}

const columns: Array<{ key: 'recommended' | 'avoid' | 'experiment'; title: string; subtitle: string }> = [
  { key: 'recommended', title: 'Recommended', subtitle: '继续放大的方向' },
  { key: 'avoid', title: 'Avoid', subtitle: '减少或暂停的方向' },
  { key: 'experiment', title: 'Experiment', subtitle: '小预算测试方向' },
];

export function AiRecommendations({ data, loading, error, onRegenerate, onGenerateBrief }: AiRecommendationsProps) {
  const hasRecommendations = data ? columns.some((column) => data[column.key].length > 0) : false;

  return (
    <section className="ai-recommendations-section">
      <div className="section-heading ai-section-heading">
        <div>
          <p className="eyebrow">Creative Direction by AI</p>
          <h2>AI 素材方向建议</h2>
        </div>
        <div className="ai-section-actions">
          <span className="soft-tag">{data?.model ?? 'mock-ai'}</span>
          <button type="button" className="ai-action-button primary clickable" disabled={loading || !data} onClick={onRegenerate}>
            重新生成
          </button>
        </div>
      </div>

      <p className="ai-mode-note">当前为 Mock AI 模式，后续可接入真实 LLM</p>
      {error ? <div className="creative-analysis-state error">{error}</div> : null}
      {loading ? <div className="creative-analysis-state">Generating creative direction...</div> : null}

      {data && !loading && hasRecommendations ? (
        <div className="ai-recommendation-grid">
          {columns.map((column) => (
            <div key={column.key} className={`ai-recommendation-column ${column.key}`}>
              <div className="ai-column-title">
                <strong>{column.title}</strong>
                <span>{column.subtitle}</span>
              </div>
              <div className="ai-column-cards">
                {data[column.key].map((recommendation) => (
                  <AiRecommendationCard key={recommendation.id} recommendation={recommendation} onGenerateBrief={onGenerateBrief} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {data && !loading && !hasRecommendations ? (
        <div className="creative-analysis-state">当前产品和时间范围暂无可生成的素材方向建议</div>
      ) : null}
    </section>
  );
}
