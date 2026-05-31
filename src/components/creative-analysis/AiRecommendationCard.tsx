'use client';

import { useState } from 'react';
import type { AiCreativeRecommendation } from '../../types/aiRecommendations';
import { copyText } from '../../utils/clipboard';

interface AiRecommendationCardProps {
  recommendation: AiCreativeRecommendation;
  onGenerateBrief: (recommendation: AiCreativeRecommendation) => void;
}

const categoryLabel = {
  recommended: '推荐方向',
  avoid: '规避方向',
  experiment: '待测试方向',
};

export function AiRecommendationCard({ recommendation, onGenerateBrief }: AiRecommendationCardProps) {
  const [copied, setCopied] = useState(false);

  const copyRecommendation = async () => {
    await copyText(`${recommendation.title}\n\n${recommendation.content}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <article className={`ai-recommendation-card ${recommendation.category}`}>
      <header>
        <span>{categoryLabel[recommendation.category]}</span>
        <b>{recommendation.confidence}% confidence</b>
      </header>
      <h3>{recommendation.title}</h3>
      <MarkdownBullets content={recommendation.content} />
      {recommendation.referenceCreativeIds?.length ? (
        <div className="ai-reference-list">
          <small>Reference creatives</small>
          <p>{recommendation.referenceCreativeIds.join(' · ')}</p>
        </div>
      ) : null}
      <footer>
        <button type="button" className="ai-action-button clickable" onClick={copyRecommendation}>
          {copied ? '已复制' : '复制建议'}
        </button>
        <button type="button" className="ai-action-button primary clickable" onClick={() => onGenerateBrief(recommendation)}>
          生成 Brief
        </button>
      </footer>
    </article>
  );
}

function MarkdownBullets({ content }: { content: string }) {
  const lines = content.split('\n').filter(Boolean);
  return (
    <ul className="ai-markdown-list">
      {lines.map((line) => (
        <li key={line}>{line.replace(/^-\s*/, '')}</li>
      ))}
    </ul>
  );
}
