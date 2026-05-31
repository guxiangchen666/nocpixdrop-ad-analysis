'use client';

import { useState } from 'react';
import { RecommendationCard } from '../components/recommendations/RecommendationCard';
import { RecommendationFilters } from '../components/recommendations/RecommendationFilters';
import { ExportViewButton } from '../components/layout/ExportViewButton';
import { RefreshDataButton } from '../components/layout/RefreshDataButton';
import { EmptyState } from '../components/common/EmptyState';
import { getRecommendations, type RecommendationFilters as RecommendationFiltersState } from '../services/recommendationsService';

export function RecommendationsPage() {
  const [filters, setFilters] = useState<RecommendationFiltersState>({});
  const recommendations = getRecommendations(filters);

  return (
    <div className="page-stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Action queue</p>
          <h2>建议页</h2>
        </div>
        <div className="page-title-actions">
          <span className="soft-tag">{recommendations.length} recommendations</span>
          <RefreshDataButton />
          <ExportViewButton />
        </div>
      </div>
      <RecommendationFilters filters={filters} onChange={setFilters} onReset={() => setFilters({})} />
      {recommendations.length > 0 ? (
        <div className="recommendation-list">
          {recommendations.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="当前筛选下暂无建议"
          description="可以放宽优先级、状态或对象类型筛选后再查看建议列表。"
          actionLabel="Reset filters"
          onAction={() => setFilters({})}
        />
      )}
    </div>
  );
}
