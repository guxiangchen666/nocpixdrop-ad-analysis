import { Button, Card } from 'animal-island-ui';
import type { Recommendation } from '../../types/recommendations';

const priorityClass: Record<Recommendation['priority'], string> = {
  高: 'priority-high',
  中: 'priority-mid',
  低: 'priority-low',
};

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <Card className="recommendation-card">
      <div className="recommendation-head">
        <div className="recommendation-title-block">
          <span className={`priority-pill ${priorityClass[recommendation.priority]}`}>{recommendation.priority}优先级</span>
          <h3>{recommendation.recommendationType} · {recommendation.objectName}</h3>
        </div>
        <span className="soft-tag">{recommendation.status}</span>
      </div>
      <p>{recommendation.problemDescription}</p>
      <div className="recommendation-metrics">
        <span>Key Metrics<strong>{recommendation.keyMetrics}</strong></span>
      </div>
      <div className="recommendation-body">
        <div>
          <span>Suggested Action</span>
          <p>{recommendation.suggestedAction}</p>
        </div>
        <div>
          <span>Reasoning</span>
          <p>{recommendation.reasoningSummary || '-'}</p>
        </div>
      </div>
      <div className="recommendation-foot">
        <small>{recommendation.objectType} / {recommendation.objectId} / confidence {Math.round((recommendation.confidence ?? 0) * 100)}%</small>
        <Button type="primary" size="small">Mark Review</Button>
      </div>
    </Card>
  );
}
