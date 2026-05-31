'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdDetailModal } from '../components/ads/AdDetailModal';
import { AdFilters } from '../components/ads/AdFilters';
import { AdsTable } from '../components/ads/AdsTable';
import { getAdDailyRecords, getAds, type AdsFilters } from '../services/adsService';
import { getCreatives } from '../services/creativesService';
import { getAdCreativeRelations } from '../services/adCreativeRelationService';
import { ExportViewButton } from '../components/layout/ExportViewButton';
import { RefreshDataButton } from '../components/layout/RefreshDataButton';
import { EmptyState } from '../components/common/EmptyState';
import { useDataRefreshSignal } from '../hooks/useDataRefreshSignal';
import type { AdDailyRecord } from '../types/ads';
import type { CreativeRecord } from '../types/creatives';
import type { AdCreativeRelation } from '../types/feishu';
import { unique } from '../utils/format';
import type { TrendRange } from '../utils/mockTrend';

export function AdsPage() {
  const [filters, setFilters] = useState<AdsFilters>({});
  const [selectedAd, setSelectedAd] = useState<AdDailyRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [trendRange, setTrendRange] = useState<TrendRange>('7d');
  const [allAds, setAllAds] = useState<AdDailyRecord[]>([]);
  const [allDailyAds, setAllDailyAds] = useState<AdDailyRecord[]>([]);
  const [ads, setAds] = useState<AdDailyRecord[]>([]);
  const [creatives, setCreatives] = useState<CreativeRecord[]>([]);
  const [relations, setRelations] = useState<AdCreativeRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshSignal = useDataRefreshSignal();

  useEffect(() => {
    let cancelled = false;

    const loadAdsPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const [nextAllAds, nextAllDailyAds, nextCreatives, nextAds, nextRelations] = await Promise.all([
          getAds(),
          getAdDailyRecords(),
          getCreatives(),
          getAds(filters),
          getAdCreativeRelations(),
        ]);
        if (cancelled) return;
        setAllAds(nextAllAds);
        setAllDailyAds(nextAllDailyAds);
        setCreatives(nextCreatives);
        setAds(nextAds);
        setRelations(nextRelations);
      } catch (requestError: unknown) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : 'Failed to load ads data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadAdsPage();

    return () => {
      cancelled = true;
    };
  }, [filters, refreshSignal]);

  const creativesById = useMemo(() => {
    const map = new Map<string, (typeof creatives)[number]>();
    creatives.forEach((creative) => {
      map.set(creative.creativeId, creative);
      if (creative.adId) map.set(creative.adId, creative);
    });
    relations.forEach((relation) => {
      const linkedCreative = creatives.find((creative) => creative.creativeId === relation.creativeId || creative.adId === relation.adId);
      if (linkedCreative) map.set(relation.adId, linkedCreative);
    });
    return map;
  }, [creatives, relations]);
  const campaigns = unique(allAds.map((ad) => ad.campaignName));
  const products = unique(allAds.map((ad) => ad.product).filter((item): item is string => Boolean(item)));
  const statuses = unique(allAds.map((ad) => ad.effectiveStatus).filter((item): item is string => Boolean(item)));
  const availableDates = useMemo(() => {
    const dates = allDailyAds.map((ad) => ad.date).sort();
    return { minDate: dates[0] ?? '', maxDate: dates[dates.length - 1] ?? '' };
  }, [allDailyAds]);

  if (loading && ads.length === 0) {
    return <div className="creative-analysis-state">Loading ads...</div>;
  }

  if (error && ads.length === 0) {
    return <div className="creative-analysis-state error">{error}</div>;
  }

  const openAdDetail = (ad: AdDailyRecord) => {
    setSelectedAd(ad);
    setModalOpen(true);
  };

  return (
    <div className="page-stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Delivery</p>
          <h2>运行中的广告表现页</h2>
        </div>
        <div className="page-title-actions">
          <span className="soft-tag">ACTIVE 默认视图，可通过状态筛选切换</span>
          <RefreshDataButton />
          <ExportViewButton />
        </div>
      </div>
      <AdFilters
        filters={filters}
        campaigns={campaigns}
        products={products}
        statuses={statuses}
        minDate={availableDates.minDate}
        maxDate={availableDates.maxDate}
        onChange={setFilters}
        onReset={() => setFilters({})}
      />
      {error ? <div className="creative-analysis-state error">{error}</div> : null}
      {ads.length > 0 ? (
        <AdsTable ads={ads} creativesById={creativesById} selectedAdId={modalOpen ? selectedAd?.adId : undefined} onInspect={openAdDetail} />
      ) : (
        <EmptyState
          title="当前筛选下暂无广告"
          description="可能是日期范围、产品、状态或 ROAS / CPA 条件过窄。清空筛选后可重新查看全部广告。"
          actionLabel="Reset filters"
          onAction={() => setFilters({})}
        />
      )}
      <AdDetailModal
        ad={selectedAd}
        creative={selectedAd ? creativesById.get(selectedAd.creativeId || '') || creativesById.get(selectedAd.adId) : undefined}
        open={modalOpen}
        trendRange={trendRange}
        onRangeChange={setTrendRange}
        onClose={() => setModalOpen(false)}
        onExited={() => setSelectedAd(null)}
      />
    </div>
  );
}
