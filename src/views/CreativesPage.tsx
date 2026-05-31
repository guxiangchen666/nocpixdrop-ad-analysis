'use client';

import { useEffect, useState } from 'react';
import { CreativeFilters } from '../components/creatives/CreativeFilters';
import { CreativeGrid } from '../components/creatives/CreativeGrid';
import { ExportViewButton } from '../components/layout/ExportViewButton';
import { RefreshDataButton } from '../components/layout/RefreshDataButton';
import { EmptyState } from '../components/common/EmptyState';
import { getCreativeAssetGroups, getCreativeDateBounds } from '../services/creativesService';
import { getCreatives, type CreativeFilters as CreativeFiltersState } from '../services/creativesService';
import type { CreativeAssetGroup, CreativeRecord } from '../types/creatives';
import { unique } from '../utils/format';

export function CreativesPage() {
  const [filters, setFilters] = useState<CreativeFiltersState>({});
  const [allCreatives, setAllCreatives] = useState<CreativeRecord[]>([]);
  const [groups, setGroups] = useState<CreativeAssetGroup[]>([]);
  const [dateBounds, setDateBounds] = useState({ minDate: '', maxDate: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCreatives = async () => {
      setLoading(true);
      setError(null);
      try {
        const [nextAllCreatives, nextGroups] = await Promise.all([
          getCreatives(),
          getCreativeAssetGroups(filters),
        ]);
        const nextDateBounds = await getCreativeDateBounds();
        if (cancelled) return;
        setAllCreatives(nextAllCreatives);
        setGroups(nextGroups);
        setDateBounds(nextDateBounds);
      } catch (requestError: unknown) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : 'Failed to load creatives data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadCreatives();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  const products = unique(allCreatives.map((creative) => creative.product).filter((item): item is string => Boolean(item)));
  const materialTypes = unique(allCreatives.map((creative) => creative.materialType).filter((item): item is string => Boolean(item)));
  const metricLabel = getMetricLabel(filters);

  if (loading && groups.length === 0) {
    return <div className="creative-analysis-state">Loading creatives...</div>;
  }

  if (error && groups.length === 0) {
    return <div className="creative-analysis-state error">{error}</div>;
  }

  return (
    <div className="page-stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Library</p>
          <h2>广告素材库</h2>
        </div>
        <div className="page-title-actions">
          <span className="soft-tag">{groups.length} assets</span>
          <RefreshDataButton />
          <ExportViewButton />
        </div>
      </div>
      {error ? <div className="creative-analysis-state error">{error}</div> : null}
      <CreativeFilters
        filters={filters}
        products={products}
        materialTypes={materialTypes}
        minDate={dateBounds.minDate}
        maxDate={dateBounds.maxDate}
        onChange={setFilters}
        onReset={() => setFilters({})}
      />
      {groups.length > 0 ? (
        <CreativeGrid groups={groups} metricLabel={metricLabel} />
      ) : (
        <EmptyState
          title="当前筛选下暂无素材"
          description="可能是素材类型、日期范围、产品或素材标签筛选过窄。系统会按真实素材资产聚合展示。"
          actionLabel="Reset filters"
          onAction={() => setFilters({})}
        />
      )}
    </div>
  );
}

function getMetricLabel(filters: CreativeFiltersState) {
  if (!filters.dateFrom || !filters.dateTo) return '30D';
  if (filters.datePreset === '7d') return '7D';
  if (filters.datePreset === '14d') return '14D';
  if (filters.datePreset === '30d') return '30D';
  return 'Range';
}
