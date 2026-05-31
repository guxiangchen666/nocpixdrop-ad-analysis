import { Card } from 'animal-island-ui';
import type { CreativeAIAnalysis } from '../../types/creatives';

export function CreativeAIAnalysisPanel({ analysis }: { analysis?: CreativeAIAnalysis }) {
  return (
    <Card className="analysis-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">AI placeholder</p>
          <h2>AI 分析占位</h2>
        </div>
      </div>
      {analysis ? (
        <div className="analysis-grid">
          <div><span>Video Type</span><strong>{analysis.videoType}</strong></div>
          <div><span>Hook Type</span><strong>{analysis.hookType}</strong></div>
          <div><span>First 3s</span><p>{analysis.first3sDescription}</p></div>
          <div><span>Selling Points</span><p>{analysis.mainSellingPoints?.join(' / ') || '-'}</p></div>
          <div><span>Script</span><p>{analysis.scriptStructure?.join(' / ') || '-'}</p></div>
          <div><span>Summary</span><p>{analysis.aiSummary}</p></div>
          <div><span>Confidence</span><strong>{Math.round((analysis.aiConfidence ?? 0) * 100)}%</strong></div>
        </div>
      ) : (
        <p className="placeholder-copy">这里先保留 AI 分析结构，不接真实 AI 接口。后续可由 Make 写入飞书多维表格后在 service 层读取。</p>
      )}
    </Card>
  );
}
