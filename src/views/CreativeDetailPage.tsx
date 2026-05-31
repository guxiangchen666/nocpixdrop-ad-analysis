'use client';

import { Button, Card, Table } from 'animal-island-ui';
import type { TableColumn } from 'animal-island-ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AdDetailModal } from '../components/ads/AdDetailModal';
import { CreativeMetrics } from '../components/creatives/CreativeMetrics';
import { CreativePreviewModal } from '../components/creatives/CreativePreviewModal';
import { CreativeTrendPanel } from '../components/creatives/CreativeTrendPanel';
import { ExportViewButton } from '../components/layout/ExportViewButton';
import { RefreshDataButton } from '../components/layout/RefreshDataButton';
import { useDataRefreshSignal } from '../hooks/useDataRefreshSignal';
import { getAds } from '../services/adsService';
import { getCreativeAssetGroupByCreativeId, getCreativeById, getCreativePerformance, getCreativeTrend } from '../services/creativesService';
import type { AdDailyRecord } from '../types/ads';
import type { CreativeAssetGroup, CreativePerformance, CreativeRecord, CreativeTrendPoint, CreativeTrendRange } from '../types/creatives';
import { buildCreativeNamingInsights } from '../utils/adNaming';
import { money, roas } from '../utils/format';
import type { TrendRange } from '../utils/mockTrend';

type AdTableRecord = Record<string, unknown> & { __ad: AdDailyRecord };

const associatedColumns: TableColumn[] = [
  { title: 'Ad Name', dataIndex: 'adName', width: 260, fixed: 'left' },
  { title: 'Campaign', dataIndex: 'campaignName', width: 240 },
  { title: 'Ad Set', dataIndex: 'adsetName', width: 190 },
  { title: 'Audience', dataIndex: 'audience', width: 160 },
  { title: 'Spend', render: (_, record) => money(readAdTableRecord(record).spend), align: 'right' },
  { title: 'Purchase', dataIndex: 'purchase', align: 'right' },
  { title: 'ROAS', render: (_, record) => roas(readAdTableRecord(record).roas), align: 'right' },
  { title: 'Status', dataIndex: 'effectiveStatus' },
];

export function CreativeDetailPage({ creativeId }: { creativeId: string }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [creative, setCreative] = useState<CreativeRecord | null>(null);
  const [assetGroup, setAssetGroup] = useState<CreativeAssetGroup | null>(null);
  const [performance, setPerformance] = useState<CreativePerformance | undefined>();
  const [trendRange, setTrendRange] = useState<CreativeTrendRange>('7d');
  const [adTrendRange, setAdTrendRange] = useState<TrendRange>('7d');
  const [trendData, setTrendData] = useState<CreativeTrendPoint[]>([]);
  const [associatedAds, setAssociatedAds] = useState<AdDailyRecord[]>([]);
  const [selectedAd, setSelectedAd] = useState<AdDailyRecord | null>(null);
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshSignal = useDataRefreshSignal();

  useEffect(() => {
    let cancelled = false;

    const loadCreativeDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const [nextCreative, nextAssetGroup, nextPerformance, nextTrendData, nextAds] = await Promise.all([
          getCreativeById(creativeId),
          getCreativeAssetGroupByCreativeId(creativeId),
          getCreativePerformance(creativeId),
          getCreativeTrend(creativeId, trendRange),
          getAds(),
        ]);
        if (cancelled) return;
        setCreative(nextCreative ?? null);
        setAssetGroup(nextAssetGroup ?? null);
        setPerformance(nextPerformance);
        setTrendData(nextTrendData);
        const relatedAdIds = new Set(nextAssetGroup?.adIds?.length ? nextAssetGroup.adIds : nextCreative?.adId ? [nextCreative.adId] : []);
        setAssociatedAds(nextAds.filter((ad) => relatedAdIds.has(ad.adId)));
      } catch (requestError: unknown) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : 'Failed to load creative detail');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadCreativeDetail();

    return () => {
      cancelled = true;
    };
  }, [creativeId, refreshSignal, trendRange]);

  if (loading && !creative) {
    return <div className="creative-analysis-state">Loading creative detail...</div>;
  }

  if (error && !creative) {
    return <div className="creative-analysis-state error">{error}</div>;
  }

  if (!creative) {
    return (
      <Card className="empty-state">
        <h2>Creative not found</h2>
        <Link href="/creatives"><Button type="primary">Back to Creatives</Button></Link>
      </Card>
    );
  }

  const playableVideoUrl = creative.originalVideoFileUrl || creative.videoUrl;
  const stillPreviewUrl = creative.thumbnailUrl || creative.imageUrl;
  const fallbackMediaUrl = playableVideoUrl || stillPreviewUrl;
  const showVideoMissingNote = creative.creativeType === 'video' && !playableVideoUrl;
  const namingInsights = buildCreativeNamingInsights(creative, associatedAds);
  const openAdDetail = (ad: AdDailyRecord) => {
    setSelectedAd(ad);
    setAdModalOpen(true);
  };

  return (
    <div className="page-stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Creative asset</p>
          <h2>素材 {creative.creativeId}</h2>
        </div>
        <div className="page-title-actions">
          <RefreshDataButton />
          <ExportViewButton />
          <Link className="page-title-action-link" href="/creatives"><Button className="page-action-button" type="dashed" size="small">返回素材库</Button></Link>
        </div>
      </div>

      <div className="detail-layout">
        <Card className="preview-card">
          {playableVideoUrl ? (
            <video className="creative-detail-video" src={playableVideoUrl} poster={stillPreviewUrl} controls playsInline />
          ) : stillPreviewUrl ? (
            <>
              <button type="button" className="creative-preview-trigger clickable" aria-label={`Preview ${creative.creativeName}`} onClick={() => setPreviewOpen(true)}>
                <img src={stillPreviewUrl} alt={creative.creativeName} />
                <span className="creative-preview-trigger-icon" aria-hidden="true">▶</span>
              </button>
              {showVideoMissingNote ? <p className="creative-preview-note inline-note">当前暂无可播放视频源，仅展示缩略图和广告内容。</p> : null}
            </>
          ) : (
            <>
              <div className="ad-modal-thumb-placeholder creative-thumb">暂无素材预览</div>
              {showVideoMissingNote ? <p className="creative-preview-note inline-note">当前暂无可播放视频源，仅展示缩略图和广告内容。</p> : null}
            </>
          )}
          <CreativeMetrics performance={performance} />
        </Card>
        <Card className="copy-card naming-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Naming breakdown</p>
              <h2>命名解析信息</h2>
            </div>
            <span className="soft-tag">完整度 {namingInsights.completeness}</span>
          </div>
          <dl className="detail-list two-col">
            <DetailItem label="Source Ad Name">{namingInsights.sourceAdName || '-'}</DetailItem>
            <DetailItem label="Source Campaign">{namingInsights.sourceCampaignName || '-'}</DetailItem>
            <DetailItem label="Source Ad Set">{namingInsights.sourceAdsetName || '-'}</DetailItem>
            <DetailItem label="Product Model">{namingInsights.inferred.product || '-'}</DetailItem>
            <DetailItem label="Series Type">{formatCampaignType(namingInsights)}</DetailItem>
            <DetailItem label="Audience">{namingInsights.inferred.audienceType || '-'}</DetailItem>
            <DetailItem label="Targeting">{namingInsights.inferred.targetingDescription || '-'}</DetailItem>
            <DetailItem label="Launch Date">{namingInsights.inferred.launchDate || '-'}</DetailItem>
            <DetailItem label="Material Direction">{namingInsights.inferred.materialDirection || '-'}</DetailItem>
            <DetailItem label="Material Name">{namingInsights.inferred.materialName || '-'}</DetailItem>
            <DetailItem label="Version">{namingInsights.inferred.version || '-'}</DetailItem>
            <DetailItem label="Material Type">{namingInsights.inferred.materialType || '-'}</DetailItem>
            <DetailItem label="Hook">{namingInsights.inferred.hook || '-'}</DetailItem>
            <DetailItem label="BGM">{namingInsights.inferred.bgm || '-'}</DetailItem>
            <DetailItem label="Duration">{namingInsights.inferred.duration || '-'}</DetailItem>
            <DetailItem label="Missing Fields">{namingInsights.missingFields.length ? namingInsights.missingFields.join('、') : '命名完整'}</DetailItem>
          </dl>
        </Card>
      </div>

      <Card className="copy-card asset-group-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Asset group</p>
            <h2>真实素材分组</h2>
          </div>
          <span className="soft-tag">{assetGroup ? `关联 ${assetGroup.creativeIds.length} 个 Creative / ${assetGroup.adIds.length} 个 Ads` : '未找到分组'}</span>
        </div>
        {assetGroup ? (
          <dl className="detail-list two-col">
            <DetailItem label="Asset Group Key">{assetGroup.assetGroupKey}</DetailItem>
            <DetailItem label="Representative Creative ID">{assetGroup.representativeCreativeId}</DetailItem>
            <DetailItem label="Creative IDs">{assetGroup.creativeIds.join('、') || '-'}</DetailItem>
            <DetailItem label="Ad IDs">{assetGroup.adIds.join('、') || '-'}</DetailItem>
            <DetailItem label="Product">{assetGroup.product || '-'}</DetailItem>
            <DetailItem label="Creative Type">{assetGroup.creativeType || '-'}</DetailItem>
          </dl>
        ) : (
          <p className="placeholder-copy">当前素材还没有可用的分组信息。</p>
        )}
      </Card>

      <Card className="table-card linked-ads-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Linked ads</p>
            <h2>关联广告列表</h2>
          </div>
          <span className="soft-tag">点击行预览广告效果</span>
        </div>
        <Table
          columns={associatedColumns}
          dataSource={associatedAds.map(toAdTableRecord)}
          rowKey="adId"
          scroll={{ x: 1080 }}
          striped
          emptyText="当前素材暂无关联广告。"
          rowClassName={(record) => {
            const ad = readAdTableRecord(record);
            return `ads-row-clickable ${selectedAd?.adId === ad.adId && adModalOpen ? 'ads-row-selected' : ''}`;
          }}
          onRow={(record) => {
            const ad = readAdTableRecord(record);
            return {
              tabIndex: 0,
              onClick: () => openAdDetail(ad),
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openAdDetail(ad);
                }
              },
            };
          }}
        />
      </Card>

      <Card className="performance-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">3D / 7D / 14D</p>
            <h2>表现汇总</h2>
          </div>
          <span className="soft-tag">{performance?.fatigueSignal || 'No signal'}</span>
        </div>
        {performance ? (
          <div className="performance-grid">
            <span>Spend 3D <strong>{money(performance.spend3d)}</strong></span>
            <span>Spend 7D <strong>{money(performance.spend7d)}</strong></span>
            <span>Spend 14D <strong>{money(performance.spend14d)}</strong></span>
            <span>Purchase 3D <strong>{performance.purchase3d}</strong></span>
            <span>Purchase 7D <strong>{performance.purchase7d}</strong></span>
            <span>Purchase 14D <strong>{performance.purchase14d}</strong></span>
            <span>ROAS 3D <strong>{roas(performance.roas3d)}</strong></span>
            <span>ROAS 7D <strong>{roas(performance.roas7d)}</strong></span>
            <span>ROAS 14D <strong>{roas(performance.roas14d)}</strong></span>
          </div>
        ) : (
          <div className="creative-analysis-state">暂无表现数据</div>
        )}
      </Card>

      <Card className="performance-card">
        <CreativeTrendPanel data={trendData} range={trendRange} onRangeChange={setTrendRange} />
      </Card>

      <CreativePreviewModal
        open={previewOpen}
        title={`素材 ${creative.creativeId}`}
        subtitle={[creative.product, creative.materialType || creative.creativeType].filter(Boolean).join(' / ')}
        mediaUrl={fallbackMediaUrl}
        posterUrl={stillPreviewUrl}
        mediaType={playableVideoUrl ? 'video' : creative.creativeType}
        onClose={() => setPreviewOpen(false)}
      />
      <AdDetailModal
        ad={selectedAd}
        creative={creative}
        open={adModalOpen}
        trendRange={adTrendRange}
        onRangeChange={setAdTrendRange}
        onClose={() => setAdModalOpen(false)}
        onExited={() => setSelectedAd(null)}
      />
    </div>
  );
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children || '-'}</dd>
    </div>
  );
}

function formatCampaignType(insights: ReturnType<typeof buildCreativeNamingInsights>) {
  const type = insights.inferred.seriesType;
  const note = insights.campaign.objectiveNote;
  if (!type && !note) return '-';
  return [type, note].filter(Boolean).join(' · ');
}

function toAdTableRecord(ad: AdDailyRecord): AdTableRecord {
  return { ...ad, __ad: ad };
}

function readAdTableRecord(record: Record<string, unknown>): AdDailyRecord {
  const ad = record.__ad;
  if (isAdDailyRecord(ad)) return ad;
  throw new Error('Invalid ad table record');
}

function isAdDailyRecord(value: unknown): value is AdDailyRecord {
  return typeof value === 'object' && value !== null && 'adId' in value && 'spend' in value && 'purchase' in value && 'roas' in value;
}
