import type { AdDailyRecord } from '../types/ads';
import type { CreativeRecord, CreativeType } from '../types/creatives';
import type { AdCreativeRelation } from '../types/feishu';
import { generateGroupInsight } from '../utils/insightText';
import { shiftDateKey } from '../utils/dateKey';
import { matchesCreative } from './performanceService';
import { loadDataBundle } from './dataStore';
import { mockFeishuAIAnalysisRecords } from '../data/mockFeishuRecords';
import { mapFeishuAIAnalysisRecord } from '../adapters/feishuAdapters';

export type CreativeAnalysisRange = '7d' | '14d' | '30d' | '90d';

export interface ProductOption {
  sku: string;
  name: string;
  spend: number;
}

export interface CreativeAnalysisDataset {
  productSku: string;
  productName: string;
  range: CreativeAnalysisRange;
  accountAvgRoas: number;
  spendMedian: number;
  totalCreatives: number;
  typeBreakdown: Record<CreativeType, number>;
  creatives: CreativeAnalysisItem[];
}

export interface CreativeAnalysisItem {
  creativeId: string;
  adId?: string;
  name: string;
  thumbnail: string;
  videoUrl?: string;
  originalVideoFileUrl?: string;
  originalImageFileUrl?: string;
  type: CreativeType;
  product?: string;
  audience?: string;
  materialType?: string;
  materialDirection?: string;
  spend: number;
  purchase: number;
  purchaseValue: number;
  roas: number;
  ctr: number;
  cpa: number;
  cpc: number;
  cpm: number;
  frequency?: number;
  impressions: number;
  clicks: number;
  daysSinceLaunch?: number;
  effectiveStatus?: string;
  landingPage?: string;
  headline?: string;
  cta?: string;
  videoDuration?: number;
  aiAnalysisStatus?: string;
  fatigueSignal?: string;
  videoType?: string;
  hookType?: string;
  hasHuman?: boolean;
  hasVoiceover?: boolean;
  hasSubtitles?: boolean;
  mainSellingPoints?: string[];
  scriptStructure?: string[];
}

export interface CreativeInsightsDataset {
  productSku: string;
  productName: string;
  range: CreativeAnalysisRange;
  sampleSize: number;
  format: InsightGroupSet;
  materialType: InsightGroupSet;
  cta: InsightGroupSet;
  headlineKeywords: KeywordInsightSet;
  lifecycle: LifecycleInsightSet;
  audience: InsightGroupSet;
  aiFeatures?: {
    hookType: InsightGroupSet;
    videoType: InsightGroupSet;
    subtitle: InsightGroupSet;
    human: InsightGroupSet;
  };
}

export interface InsightGroupSet {
  groups: InsightGroup[];
  insight: string;
  suggestion: string;
  sampleEnough: boolean;
}

export interface InsightGroup {
  label: string;
  count: number;
  spend: number;
  purchase: number;
  purchaseValue: number;
  roas: number;
  ctr: number;
  cpa: number;
}

export interface KeywordInsightSet {
  groups: {
    word: string;
    count: number;
    spend: number;
    roas: number;
    ctr: number;
  }[];
  insight: string;
  suggestion: string;
  sampleEnough: boolean;
}

export interface LifecycleInsightSet {
  days: {
    day: number;
    ctr: number;
    roas: number;
    count: number;
  }[];
  insight: string;
  suggestion: string;
  sampleEnough: boolean;
}

const aiAnalysisByCreativeId = new Map(mockFeishuAIAnalysisRecords.map((analysis) => [analysis['Creative ID'] as string, mapFeishuAIAnalysisRecord(analysis)]));

export async function getProducts(): Promise<ProductOption[]> {
  const bundle = await loadDataBundle();

  const spendBySku = new Map<string, ProductOption>();
  const relationByCreativeId = new Map<string, AdCreativeRelation>();
  const relationByAdId = new Map<string, AdCreativeRelation>();
  bundle.adCreativeRelations.forEach((relation) => {
    if (relation.creativeId) relationByCreativeId.set(relation.creativeId, relation);
    if (relation.adId) relationByAdId.set(relation.adId, relation);
  });

  bundle.creativeRecords.forEach((creative) => {
    const relation = relationByCreativeId.get(creative.creativeId) ?? (creative.adId ? relationByAdId.get(creative.adId) : undefined);
    const product = resolveProductOption(creative, relation);
    const current = spendBySku.get(product.sku) ?? product;
    const spend = bundle.adDailyRecords
      .filter((ad) => matchesCreative(ad, creative, bundle.adCreativeRelations))
      .reduce((total, ad) => total + ad.spend, 0);
    spendBySku.set(product.sku, { ...current, spend: round(current.spend + spend, 2) });
  });

  const products = Array.from(spendBySku.values()).sort((a, b) => b.spend - a.spend);
  return products;
}

export async function getCreativesByProduct(productSku: string, range: CreativeAnalysisRange): Promise<CreativeAnalysisDataset> {
  const bundle = await loadDataBundle();

  const products = await getProducts();
  const product = products.find((item) => item.sku === productSku) ?? products[0] ?? { sku: 'Uncategorized', name: 'Uncategorized', spend: 0 };
  const rangeDays = parseRangeDays(range);
  const cutoff = getCutoffDate(bundle.adDailyRecords, rangeDays);
  const scopedAds = bundle.adDailyRecords.filter((ad) => ad.date >= cutoff);
  const relationByCreativeId = new Map<string, AdCreativeRelation>();
  const relationByAdId = new Map<string, AdCreativeRelation>();
  bundle.adCreativeRelations.forEach((relation) => {
    if (relation.creativeId) relationByCreativeId.set(relation.creativeId, relation);
    if (relation.adId) relationByAdId.set(relation.adId, relation);
  });
  const scopedCreatives = bundle.creativeRecords.filter((creative) => resolveProductOption(creative, relationByCreativeId.get(creative.creativeId) ?? (creative.adId ? relationByAdId.get(creative.adId) : undefined)).sku === product.sku);
  const items = scopedCreatives.map((creative) => buildAnalysisItem(creative, scopedAds, bundle.adCreativeRelations));
  const filteredAds = scopedAds.filter((ad) => scopedCreatives.some((creative) => matchesCreative(ad, creative, bundle.adCreativeRelations)));
  const spend = filteredAds.reduce((total, ad) => total + ad.spend, 0);
  const purchaseValue = filteredAds.reduce((total, ad) => total + ad.purchaseValue, 0);

  const dataset = {
    productSku: product.sku,
    productName: product.name,
    range,
    accountAvgRoas: safeDivide(purchaseValue, spend),
    spendMedian: median(items.map((item) => item.spend)),
    totalCreatives: items.length,
    typeBreakdown: {
      video: items.filter((item) => item.type === 'video').length,
      image: items.filter((item) => item.type === 'image').length,
      dynamic: items.filter((item) => item.type === 'dynamic').length,
      unknown: items.filter((item) => item.type === 'unknown').length,
    },
    creatives: items,
  };

  return dataset;
}

export async function getCreativeAnalysisDataset(productSku: string, range: CreativeAnalysisRange): Promise<CreativeAnalysisDataset> {
  return getCreativesByProduct(productSku, range);
}

export async function getCreativeInsights(productSku: string, range: CreativeAnalysisRange): Promise<CreativeInsightsDataset> {
  const dataset = await getCreativesByProduct(productSku, range);

  const insights = {
    productSku: dataset.productSku,
    productName: dataset.productName,
    range: dataset.range,
    sampleSize: dataset.creatives.length,
    format: buildGroupSet('Format', dataset.creatives, (creative) => creative.type),
    materialType: buildGroupSet('Material Type', dataset.creatives, (creative) => creative.materialType || creative.type || 'unknown'),
    cta: buildGroupSet('CTA', dataset.creatives, (creative) => creative.cta || 'Unknown CTA'),
    headlineKeywords: buildKeywordSet(dataset.creatives),
    lifecycle: buildLifecycleSet(dataset.creatives),
    audience: buildGroupSet('Audience', dataset.creatives, (creative) => creative.audience || 'Unknown Audience'),
    aiFeatures: {
      hookType: buildGroupSet('Hook Type', dataset.creatives, (creative) => creative.hookType || 'Unknown Hook'),
      videoType: buildGroupSet('Video Type', dataset.creatives, (creative) => creative.videoType || 'Unknown Video Type'),
      subtitle: buildGroupSet('Subtitle', dataset.creatives, (creative) => (creative.hasSubtitles ? '有字幕' : creative.hasSubtitles === false ? '无字幕' : 'Unknown Subtitle')),
      human: buildGroupSet('Human', dataset.creatives, (creative) => (creative.hasHuman ? '真人出镜' : creative.hasHuman === false ? '非真人' : 'Unknown Human')),
    },
  };

  return insights;
}

export function resolveProductOption(creative: CreativeRecord, relation?: AdCreativeRelation): ProductOption {
  const source = relation?.product || creative.product || [creative.adName, creative.creativeName].filter(Boolean).join(' ');
  const sku = detectSku(source);
  return {
    sku,
    name: sku === 'Uncategorized' ? 'Uncategorized' : relation?.product || creative.product || skuToName(sku),
    spend: 0,
  };
}

function buildAnalysisItem(creative: CreativeRecord, ads: AdDailyRecord[], relations: AdCreativeRelation[]): CreativeAnalysisItem {
  const matchedAds = ads.filter((ad) => matchesCreative(ad, creative, relations));
  const relation = relations.find((item) => item.creativeId === creative.creativeId || item.adId === creative.adId);
  const aiAnalysis = aiAnalysisByCreativeId.get(creative.creativeId);
  const spend = round(sum(matchedAds.map((ad) => ad.spend)), 2);
  const purchase = sum(matchedAds.map((ad) => ad.purchase));
  const purchaseValue = round(sum(matchedAds.map((ad) => ad.purchaseValue)), 2);
  const impressions = sum(matchedAds.map((ad) => ad.impressions));
  const clicks = sum(matchedAds.map((ad) => ad.clicks ?? 0));
  const reach = sum(matchedAds.map((ad) => ad.reach ?? 0));
  const earliestDate = matchedAds.reduce((earliest, ad) => (!earliest || ad.date < earliest ? ad.date : earliest), '');

  return {
    creativeId: creative.creativeId,
    adId: creative.adId,
    name: creative.creativeName,
    thumbnail: creative.originalImageFileUrl || creative.thumbnailUrl || creative.imageUrl || '',
    videoUrl: creative.videoUrl,
    originalVideoFileUrl: creative.originalVideoFileUrl,
    originalImageFileUrl: creative.originalImageFileUrl,
    type: creative.creativeType,
    product: relation?.product || creative.product,
    audience: relation?.audience || creative.audience,
    materialType: creative.materialType,
    materialDirection: creative.materialDirection,
    spend,
    purchase,
    purchaseValue,
    roas: safeDivide(purchaseValue, spend),
    ctr: safePercent(clicks, impressions),
    cpa: safeDivide(spend, purchase),
    cpc: safeDivide(spend, clicks),
    cpm: impressions > 0 ? round((spend / impressions) * 1000, 2) : 0,
    frequency: reach > 0 ? round(impressions / reach, 2) : undefined,
    impressions,
    clicks,
    daysSinceLaunch: getDaysSinceLaunch(creative.adCreatedTime, earliestDate),
    effectiveStatus: relation?.effectiveStatus || creative.effectiveStatus,
    landingPage: creative.landingPageUrl,
    headline: creative.headline,
    cta: creative.cta,
    videoDuration: creative.creativeType === 'video' ? 24 : undefined,
    aiAnalysisStatus: creative.aiAnalysisStatus,
    fatigueSignal: spend === 0 ? '数据不足' : undefined,
    videoType: aiAnalysis?.videoType,
    hookType: aiAnalysis?.hookType,
    hasHuman: aiAnalysis?.hasHuman,
    hasVoiceover: aiAnalysis?.hasVoiceover,
    hasSubtitles: aiAnalysis?.hasSubtitles,
    mainSellingPoints: aiAnalysis?.mainSellingPoints,
    scriptStructure: aiAnalysis?.scriptStructure,
  };
}

function buildGroupSet(dimensionName: string, creatives: CreativeAnalysisItem[], getLabel: (creative: CreativeAnalysisItem) => string): InsightGroupSet {
  const byLabel = new Map<string, CreativeAnalysisItem[]>();
  creatives.forEach((creative) => {
    const label = getLabel(creative) || 'Unknown';
    byLabel.set(label, [...(byLabel.get(label) ?? []), creative]);
  });

  const groups = Array.from(byLabel.entries())
    .map(([label, items]) => summarizeGroup(label, items))
    .sort((a, b) => b.roas - a.roas);
  const text = generateGroupInsight(dimensionName, groups);

  return { groups, ...text };
}

function summarizeGroup(label: string, items: CreativeAnalysisItem[]): InsightGroup {
  const spend = sum(items.map((item) => item.spend));
  const purchase = sum(items.map((item) => item.purchase));
  const purchaseValue = sum(items.map((item) => item.purchaseValue));
  const clicks = sum(items.map((item) => item.clicks));
  const impressions = sum(items.map((item) => item.impressions));

  return {
    label,
    count: items.length,
    spend: round(spend, 2),
    purchase,
    purchaseValue: round(purchaseValue, 2),
    roas: safeDivide(purchaseValue, spend),
    ctr: safePercent(clicks, impressions),
    cpa: safeDivide(spend, purchase),
  };
}

const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'with', 'your', 'our', 'is', 'are', 'after', 'before']);

function buildKeywordSet(creatives: CreativeAnalysisItem[]): KeywordInsightSet {
  const byWord = new Map<string, CreativeAnalysisItem[]>();
  creatives.forEach((creative) => {
    const words = extractHeadlineWords(creative.headline);
    words.forEach((word) => byWord.set(word, [...(byWord.get(word) ?? []), creative]));
  });

  const groups = Array.from(byWord.entries())
    .map(([word, items]) => {
      const group = summarizeGroup(word, items);
      return { word, count: group.count, spend: group.spend, roas: group.roas, ctr: group.ctr };
    })
    .sort((a, b) => b.count - a.count || b.roas - a.roas)
    .slice(0, 10);
  const sampleEnough = creatives.length >= 8 && groups.length > 0;
  const best = [...groups].sort((a, b) => b.roas - a.roas)[0];

  return {
    groups,
    sampleEnough,
    insight: sampleEnough && best ? `${best.word} 关键词对应素材 ROAS ${best.roas.toFixed(1)}x` : '样本不足，暂不生成结论',
    suggestion: sampleEnough && best ? `Headline 建议强化 ${best.word} 等高效关键词` : '继续积累素材数据后再判断',
  };
}

function extractHeadlineWords(headline?: string) {
  if (!headline) return [];
  return Array.from(
    new Set(
      headline
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.replace(/[^a-z0-9-]/g, ''))
        .filter((word) => word.length > 2 && !stopWords.has(word)),
    ),
  );
}

function buildLifecycleSet(creatives: CreativeAnalysisItem[]): LifecycleInsightSet {
  const byDay = new Map<number, CreativeAnalysisItem[]>();
  creatives.forEach((creative) => {
    const day = creative.daysSinceLaunch;
    if (!day || day < 1 || day > 30) return;
    byDay.set(day, [...(byDay.get(day) ?? []), creative]);
  });

  const days = Array.from(byDay.entries())
    .map(([day, items]) => {
      const spend = sum(items.map((item) => item.spend));
      const purchaseValue = sum(items.map((item) => item.purchaseValue));
      const clicks = sum(items.map((item) => item.clicks));
      const impressions = sum(items.map((item) => item.impressions));

      return {
        day,
        ctr: safePercent(clicks, impressions),
        roas: safeDivide(purchaseValue, spend),
        count: items.length,
      };
    })
    .sort((a, b) => a.day - b.day);
  const sampleEnough = creatives.length >= 8 && days.length >= 3;
  const decayDay = findDecayDay(days);

  return {
    days,
    sampleEnough,
    insight: sampleEnough && decayDay ? `素材上线 ${decayDay} 天后 CTR 开始明显下降` : '当前样本不足，暂不判断衰减周期',
    suggestion: sampleEnough && decayDay ? `建议在上线 ${Math.max(1, decayDay - 2)}-${decayDay} 天准备替换素材` : '继续积累素材数据后再判断',
  };
}

function findDecayDay(days: LifecycleInsightSet['days']) {
  if (days.length < 3) return undefined;
  const peak = days.reduce((best, day) => (day.ctr > best.ctr ? day : best), days[0]);
  return days.find((day) => day.day > peak.day && day.ctr <= peak.ctr * 0.85)?.day;
}

function detectSku(value?: string) {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('fmp13')) return 'FMP13';
  if (text.includes('fml19')) return 'FML19';
  if (text.includes('iop13')) return 'IOP13';
  if (text.includes('dnvs-14') || text.includes('dnvs14')) return 'DNVS-14';
  if (text.includes('infiray') || text.includes('infitac')) return 'INFITAC';
  if (text.includes('thermal sight')) return 'Thermal sight';
  if (text.includes('night vision')) return 'Night vision';
  return 'Uncategorized';
}

function skuToName(sku: string) {
  if (sku === 'FMP13') return 'INFITAC FMP13';
  if (sku === 'FML19') return 'INFITAC FML19';
  if (sku === 'IOP13') return 'INFITAC IOP13';
  if (sku === 'DNVS-14') return 'DNVS-14 Pro Bundle';
  return sku;
}

function parseRangeDays(range: CreativeAnalysisRange) {
  return Number(range.replace('d', '')) as 7 | 14 | 30 | 90;
}

function getDaysSinceLaunch(createdTime?: string, earliestDate?: string) {
  const source = createdTime || earliestDate;
  if (!source) return undefined;
  const start = source.length === 10 ? new Date(`${source}T00:00:00+08:00`) : new Date(source);
  const end = new Date('2026-05-20T00:00:00+08:00');
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? round((sorted[middle - 1] + sorted[middle]) / 2, 2) : round(sorted[middle], 2);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function safePercent(numerator: number, denominator: number) {
  return denominator > 0 ? round((numerator / denominator) * 100, 2) : 0;
}

function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? round(numerator / denominator, 2) : 0;
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function getCutoffDate(ads: AdDailyRecord[], rangeDays: number) {
  const latestDate = ads.reduce((latest, ad) => (ad.date > latest ? ad.date : latest), '');
  if (!latestDate) return '';
  return shiftDateKey(latestDate, -(rangeDays - 1));
}
