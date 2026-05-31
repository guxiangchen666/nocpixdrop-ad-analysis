'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdDetailModal } from '../components/ads/AdDetailModal';
import { AiRecommendations } from '../components/creative-analysis/AiRecommendations';
import { BriefModal } from '../components/creative-analysis/BriefModal';
import { CreativeInsightsSection } from '../components/creative-analysis/CreativeInsightsSection';
import { CreativeMatrix } from '../components/creative-analysis/CreativeMatrix';
import { CreativeTable } from '../components/creative-analysis/CreativeTable';
import { KpiCards } from '../components/creative-analysis/KpiCards';
import { ExportViewButton } from '../components/layout/ExportViewButton';
import { RefreshDataButton } from '../components/layout/RefreshDataButton';
import { ProductSelector } from '../components/creative-analysis/ProductSelector';
import { useDataRefreshSignal } from '../hooks/useDataRefreshSignal';
import { generateCreativeBrief, getAiCreativeRecommendations } from '../services/aiRecommendationService';
import type { CreativeAnalysisDataset, CreativeAnalysisItem, CreativeAnalysisRange, CreativeInsightsDataset, ProductOption } from '../services/creativeAnalysisService';
import { getCreativeAnalysisDataset, getCreativeInsights, getProducts } from '../services/creativeAnalysisService';
import type { AdDailyRecord } from '../types/ads';
import type { AiCreativeRecommendation, AiRecommendationResponse, CreativeBrief } from '../types/aiRecommendations';
import type { CreativeRecord } from '../types/creatives';
import type { TrendRange } from '../utils/mockTrend';

export function CreativeAnalysis() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedSku, setSelectedSku] = useState('');
  const [range, setRange] = useState<CreativeAnalysisRange>('30d');
  const [comparePrevious, setComparePrevious] = useState(false);
  const [data, setData] = useState<CreativeAnalysisDataset | null>(null);
  const [insights, setInsights] = useState<CreativeInsightsDataset | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<AiRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedCreative, setSelectedCreative] = useState<CreativeAnalysisItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [brief, setBrief] = useState<CreativeBrief | null>(null);
  const [trendRange, setTrendRange] = useState<TrendRange>('7d');
  const refreshSignal = useDataRefreshSignal();

  useEffect(() => {
    let cancelled = false;
    const loadProducts = async () => {
      try {
        const nextProducts = await getProducts();
        if (cancelled) return;
        setProducts(nextProducts);
        setSelectedSku((current) => current || nextProducts[0]?.sku || '');
        if (nextProducts.length === 0) {
          setLoading(false);
          setInsightsLoading(false);
          setAiLoading(false);
        }
      } catch (requestError: unknown) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : 'Failed to load products');
        setLoading(false);
        setInsightsLoading(false);
        setAiLoading(false);
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  const currentProduct = products.find((product) => product.sku === selectedSku);
  const modalAd = useMemo(() => (selectedCreative ? toAdDailyRecord(selectedCreative, currentProduct) : null), [currentProduct, selectedCreative]);
  const modalCreative = useMemo(() => (selectedCreative ? toCreativeRecord(selectedCreative, currentProduct) : undefined), [currentProduct, selectedCreative]);

  useEffect(() => {
    if (!selectedSku) return;

    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      setInsightsLoading(true);
      setAiLoading(true);
      setError(null);
      setAiError(null);

      try {
        const [dataset, insightDataset] = await Promise.all([getCreativeAnalysisDataset(selectedSku, range), getCreativeInsights(selectedSku, range)]);
        const aiResponse = await getAiCreativeRecommendations({ productSku: selectedSku, range, dataset, insights: insightDataset });
        if (cancelled) return;
        setData(dataset);
        setInsights(insightDataset);
        setAiRecommendations(aiResponse);
      } catch (requestError: unknown) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : 'Failed to load creative analysis data');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setInsightsLoading(false);
          setAiLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [range, refreshSignal, selectedSku]);

  const openCreativeDetail = (creative: CreativeAnalysisItem) => {
    setSelectedCreative(creative);
    setModalOpen(true);
  };

  const regenerateAiRecommendations = async () => {
    if (!data || !insights) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const aiResponse = await getAiCreativeRecommendations({ productSku: selectedSku, range, dataset: data, insights, forceRefresh: true });
      setAiRecommendations(aiResponse);
    } catch (requestError: unknown) {
      setAiError(requestError instanceof Error ? requestError.message : 'Failed to generate AI recommendations');
    } finally {
      setAiLoading(false);
    }
  };

  const openBrief = (recommendation: AiCreativeRecommendation) => {
    if (!data || !insights) return;
    setBrief(generateCreativeBrief({ recommendation, dataset: data, insights }));
  };

  return (
    <div className="page-stack creative-analysis-page">
      <div className="page-title">
        <div>
          <p className="eyebrow">Creative Analysis</p>
          <h2>素材分析</h2>
        </div>
        <div className="page-title-actions">
          <span className="soft-tag">{currentProduct ? `${currentProduct.sku} · ${currentProduct.name}` : 'Loading products'}</span>
          <RefreshDataButton />
          <ExportViewButton />
        </div>
      </div>

      <ProductSelector
        products={products}
        selectedSku={selectedSku}
        range={range}
        comparePrevious={comparePrevious}
        onSkuChange={setSelectedSku}
        onRangeChange={setRange}
        onCompareChange={setComparePrevious}
      />

      {data ? (
        <>
          <KpiCards creatives={data.creatives} accountAvgRoas={data.accountAvgRoas} comparePrevious={comparePrevious} />
          <CreativeMatrix creatives={data.creatives} accountAvgRoas={data.accountAvgRoas} spendMedian={data.spendMedian} onCreativeSelect={openCreativeDetail} />
          <CreativeInsightsSection data={insights} loading={insightsLoading} error={error} />
          <AiRecommendations data={aiRecommendations} loading={aiLoading} error={aiError} onRegenerate={regenerateAiRecommendations} onGenerateBrief={openBrief} />
          <CreativeTable creatives={data.creatives} selectedCreativeId={modalOpen ? selectedCreative?.creativeId : undefined} onCreativeSelect={openCreativeDetail} />
        </>
      ) : error && !data ? (
        <div className="creative-analysis-state error">{error}</div>
      ) : loading ? (
        <div className="creative-analysis-state">Loading creative analysis...</div>
      ) : (
        <div className="creative-analysis-state">No creative analysis data</div>
      )}

      <BriefModal brief={brief} open={Boolean(brief)} onClose={() => setBrief(null)} />

      <AdDetailModal
        ad={modalAd}
        creative={modalCreative}
        open={modalOpen}
        trendRange={trendRange}
        onRangeChange={setTrendRange}
        onClose={() => setModalOpen(false)}
        onExited={() => setSelectedCreative(null)}
      />
    </div>
  );
}

function toAdDailyRecord(creative: CreativeAnalysisItem, product?: ProductOption): AdDailyRecord {
  return {
    date: '2026-05-20',
    accountId: 'act_creative_analysis',
    campaignId: `cmp_${product?.sku || 'sku'}`,
    campaignName: `${product?.sku || 'SKU'} Creative Analysis`,
    adsetId: `as_${creative.creativeId}`,
    adsetName: creative.audience || 'Product creative rollup',
    adId: creative.adId || `ad_${creative.creativeId}`,
    adName: creative.name,
    creativeId: creative.creativeId,
    product: product ? `${product.sku} · ${product.name}` : 'Selected SKU',
    audience: creative.audience || 'All active product audiences',
    objective: 'Sales',
    optimizationGoal: 'Purchase',
    spend: creative.spend,
    impressions: creative.impressions,
    reach: creative.frequency ? Math.round(creative.impressions / creative.frequency) : undefined,
    frequency: creative.frequency,
    clicks: creative.clicks,
    linkClicks: Math.round(creative.clicks * 0.74),
    outboundClicks: Math.round(creative.clicks * 0.62),
    ctr: creative.ctr,
    cpc: creative.cpc,
    cpm: creative.cpm,
    purchase: creative.purchase,
    purchaseValue: creative.purchaseValue,
    roas: creative.roas,
    cpa: creative.cpa,
    effectiveStatus: creative.effectiveStatus,
    lastRefreshedAt: '2026-05-20T09:00:00+08:00',
  };
}

function toCreativeRecord(creative: CreativeAnalysisItem, product?: ProductOption): CreativeRecord {
  return {
    creativeId: creative.creativeId,
    adId: creative.adId || `ad_${creative.creativeId}`,
    adName: creative.name,
    campaignId: `cmp_${product?.sku || 'sku'}`,
    adsetId: `as_${creative.creativeId}`,
    creativeName: creative.name,
    creativeType: creative.type,
    videoId: creative.type === 'video' ? `vid_${creative.creativeId}` : undefined,
    videoUrl: creative.videoUrl,
    originalVideoFileUrl: creative.originalVideoFileUrl,
    originalImageFileUrl: creative.originalImageFileUrl,
    thumbnailUrl: creative.thumbnail,
    imageUrl: creative.type === 'image' ? creative.thumbnail : undefined,
    primaryText: creative.headline || creative.name,
    headline: creative.headline || creative.name,
    description: `${creative.type} creative for ${product?.sku || 'SKU'} analysis.`,
    cta: creative.cta || 'Shop Now',
    landingPageUrl: creative.landingPage || `https://example.com/products/${product?.sku.toLowerCase() || 'sku'}`,
    product: product ? `${product.sku} · ${product.name}` : 'Selected SKU',
    materialDirection: creative.roas > 4 ? 'scale candidate' : 'testing direction',
    materialName: creative.name,
    materialType: creative.type,
    aiAnalysisStatus: '已分析',
    lastSyncedAt: '2026-05-20T09:00:00+08:00',
  };
}
