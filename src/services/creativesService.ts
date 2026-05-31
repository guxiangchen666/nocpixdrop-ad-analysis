import { mapFeishuAIAnalysisRecord } from '../adapters/feishuAdapters';
import { mockFeishuAIAnalysisRecords } from '../data/mockFeishuRecords';
import type { AdDailyRecord } from '../types/ads';
import type { AdCreativeRelation } from '../types/feishu';
import type {
  AIAnalysisStatus,
  CreativeAIAnalysis,
  CreativeAssetGroup,
  CreativeAssetGroupRelatedAd,
  CreativeListPerformance,
  CreativePerformance,
  CreativeRecord,
  CreativeSortBy,
  CreativeSortDirection,
  CreativeTrendPoint,
  CreativeTrendRange,
  CreativeType,
} from '../types/creatives';
import { aggregateCreativePerformance, buildCreativeJoinContext, matchesCreative, resolveCreativeForAdWithContext } from './performanceService';
import { loadDataBundle } from './dataStore';
import { shiftDateKey } from '../utils/dateKey';
import { getAudienceKey, getCopyKey, getCopyLabel, isSampleInsufficient, resolveAssetGroupKey } from './assetAnalysisService';

export interface CreativeFilters {
  creativeType?: CreativeType | '';
  aiAnalysisStatus?: AIAnalysisStatus | '';
  product?: string;
  materialType?: string;
  dateFrom?: string;
  dateTo?: string;
  datePreset?: string;
  sortBy?: CreativeSortBy | '';
  sortDirection?: CreativeSortDirection;
}

export interface CreativeAssetGroupFilters {
  dateFrom?: string;
  dateTo?: string;
  creativeType?: CreativeType | '';
  aiAnalysisStatus?: AIAnalysisStatus | '';
  product?: string;
  materialType?: string;
  sortBy?: CreativeSortBy | '';
  sortDirection?: CreativeSortDirection;
}

export async function getCreatives(filters: CreativeFilters = {}): Promise<CreativeRecord[]> {
  const bundle = await loadDataBundle();
  const filteredCreatives = bundle.creativeRecords.filter((creative) => {
    const matchesType = !filters.creativeType || creative.creativeType === filters.creativeType;
    const matchesStatus = !filters.aiAnalysisStatus || creative.aiAnalysisStatus === filters.aiAnalysisStatus;
    const matchesProduct = !filters.product || creative.product === filters.product;
    const matchesMaterialType = !filters.materialType || creative.materialType === filters.materialType;

    return matchesType && matchesStatus && matchesProduct && matchesMaterialType;
  });

  if (!filters.sortBy) return filteredCreatives;

  const performanceById = buildCreativeListPerformanceMap(bundle.adDailyRecords, bundle.creativeRecords, bundle.adCreativeRelations, filters);
  const direction = filters.sortDirection === 'asc' ? 1 : -1;

  return [...filteredCreatives].sort((left, right) => {
    const leftValue = performanceById.get(left.creativeId)?.[filters.sortBy as CreativeSortBy] ?? 0;
    const rightValue = performanceById.get(right.creativeId)?.[filters.sortBy as CreativeSortBy] ?? 0;
    if (leftValue === rightValue) return left.creativeName.localeCompare(right.creativeName);
    return (leftValue - rightValue) * direction;
  });
}

export async function getCreativeById(creativeId: string): Promise<CreativeRecord | undefined> {
  const bundle = await loadDataBundle();
  return bundle.creativeRecords.find((creative) => creative.creativeId === creativeId);
}

export async function getCreativePerformance(creativeId: string): Promise<CreativePerformance | undefined> {
  const performances = await getAllCreativePerformance();
  return performances.find((performance) => performance.creativeId === creativeId);
}

export async function getCreativeTrend(creativeId: string, range: CreativeTrendRange = '7d'): Promise<CreativeTrendPoint[]> {
  const bundle = await loadDataBundle();
  const creative = bundle.creativeRecords.find((item) => item.creativeId === creativeId);
  if (!creative) return [];

  const latestDate = bundle.adDailyRecords.reduce((latest, ad) => (ad.date > latest ? ad.date : latest), '');
  if (!latestDate) return [];

  const days = Number(range.replace('d', ''));
  const dates = Array.from({ length: days }, (_, index) => shiftDateKey(latestDate, -(days - 1 - index)));
  const matchedAds = bundle.adDailyRecords.filter((ad) => matchesCreative(ad, creative, bundle.adCreativeRelations));
  const totalsByDate = new Map<string, CreativeTrendPoint>();

  dates.forEach((date) => {
    totalsByDate.set(date, createEmptyTrendPoint(date));
  });

  matchedAds
    .filter((ad) => totalsByDate.has(ad.date))
    .forEach((ad) => {
      const current = totalsByDate.get(ad.date) ?? createEmptyTrendPoint(ad.date);
      current.spend += ad.spend;
      current.purchase += ad.purchase;
      current.purchaseValue += ad.purchaseValue;
      current.impressions += ad.impressions;
      current.clicks += ad.clicks ?? 0;
      totalsByDate.set(ad.date, current);
    });

  return dates.map((date) => finalizeTrendPoint(totalsByDate.get(date) ?? createEmptyTrendPoint(date)));
}

export async function getCreativeAssetGroups(filters: CreativeAssetGroupFilters = {}): Promise<CreativeAssetGroup[]> {
  const bundle = await loadDataBundle();
  const creativeById = new Map(bundle.creativeRecords.map((creative) => [creative.creativeId, creative]));
  const creativeByAdId = new Map(bundle.creativeRecords.filter((creative) => creative.adId).map((creative) => [creative.adId as string, creative]));
  const { dateFrom, dateTo } = resolveAssetGroupDateRange(bundle.adDailyRecords, filters);
  const scopedAds = bundle.adDailyRecords.filter((ad) => (!dateFrom || ad.date >= dateFrom) && (!dateTo || ad.date <= dateTo));
  const adSummaries = aggregateAdsForScope(scopedAds, bundle.creativeRecords, bundle.adCreativeRelations);
  const groupMap = new Map<string, CreativeAssetGroupBuilder>();
  const joinContext = buildCreativeJoinContext(bundle.creativeRecords, bundle.adCreativeRelations);

  const ensureGroup = (assetGroupKey: string) => {
    const existing = groupMap.get(assetGroupKey);
    if (existing) return existing;
    const created: CreativeAssetGroupBuilder = {
      assetGroupKey,
      creativeIds: new Set<string>(),
      adIds: new Set<string>(),
      creativesById: new Map<string, CreativeRecord>(),
      spendByCreativeId: new Map<string, number>(),
      relatedAds: [],
      audienceTotals: new Map<string, MetricTotals>(),
      copyTotals: new Map<string, MetricTotals & { label: string }>(),
      spend: 0,
      purchase: 0,
      purchaseValue: 0,
      impressions: 0,
      clicks: 0,
    };
    groupMap.set(assetGroupKey, created);
    return created;
  };

  bundle.creativeRecords.forEach((creative) => {
    const builder = ensureGroup(getCreativeAssetGroupKey(creative));
    builder.creativeIds.add(creative.creativeId);
    builder.creativesById.set(creative.creativeId, creative);
    if (creative.adId) builder.adIds.add(creative.adId);
  });

  adSummaries.forEach((ad) => {
    const creative = ad.creativeId ? creativeById.get(ad.creativeId) : undefined;
    const adFallbackCreative = ad.adId ? creativeByAdId.get(ad.adId) : undefined;
    const matchedCreative = creative ?? adFallbackCreative;
    const assetGroupKey = resolveAssetGroupKey(matchedCreative ?? { creativeId: ad.creativeId });
    const builder = ensureGroup(assetGroupKey);
    const resolvedCreative = matchedCreative;
    const resolved = resolveCreativeForAdWithContext(ad, joinContext);
    const relation = resolved.relation;
    const audienceKey = getAudienceKey(ad, resolvedCreative, relation);
    const copyKey = getCopyKey(resolvedCreative);
    const copyLabel = getCopyLabel(resolvedCreative);

    if (resolvedCreative) {
      builder.creativeIds.add(resolvedCreative.creativeId);
      builder.creativesById.set(resolvedCreative.creativeId, resolvedCreative);
      builder.spendByCreativeId.set(resolvedCreative.creativeId, (builder.spendByCreativeId.get(resolvedCreative.creativeId) ?? 0) + ad.spend);
    } else if (ad.creativeId) {
      builder.creativeIds.add(ad.creativeId);
    }

    builder.adIds.add(ad.adId);
    builder.relatedAds.push({
      adId: ad.adId,
      adName: ad.adName,
      campaignName: ad.campaignName,
      adsetName: ad.adsetName,
      spend: round(ad.spend, 2),
      purchase: ad.purchase,
      roas: safeDivide(ad.purchaseValue, ad.spend),
      cpa: safeDivide(ad.spend, ad.purchase),
      ctr: ad.impressions > 0 ? round(((ad.clicks ?? 0) / ad.impressions) * 100, 2) : 0,
    });

    builder.spend += ad.spend;
    builder.purchase += ad.purchase;
    builder.purchaseValue += ad.purchaseValue;
    builder.impressions += ad.impressions;
    builder.clicks += ad.clicks ?? 0;
    addTotals(builder.audienceTotals, audienceKey, ad);
    addTotals(builder.copyTotals, copyKey, ad, copyLabel);
  });

  return Array.from(groupMap.values())
    .map((builder) => finalizeCreativeAssetGroup(builder))
    .filter((group) => matchesCreativeAssetGroup(group, filters))
    .sort((left, right) => {
      if (!filters.sortBy) return right.spend - left.spend || left.name.localeCompare(right.name);
      const direction = filters.sortDirection === 'asc' ? 1 : -1;
      const leftValue = left[filters.sortBy];
      const rightValue = right[filters.sortBy];
      if (leftValue === rightValue) return left.name.localeCompare(right.name);
      return (leftValue - rightValue) * direction;
    });
}

export async function getCreativeAssetGroupByCreativeId(creativeId: string): Promise<CreativeAssetGroup | undefined> {
  const groups = await getCreativeAssetGroups();
  return groups.find((group) => group.creativeIds.includes(creativeId));
}

export async function getCreativeListPerformance(filters: CreativeFilters = {}): Promise<CreativeListPerformance[]> {
  const bundle = await loadDataBundle();
  return Array.from(buildCreativeListPerformanceMap(bundle.adDailyRecords, bundle.creativeRecords, bundle.adCreativeRelations, filters).values());
}

export async function getCreativeDateBounds(): Promise<{ minDate: string; maxDate: string }> {
  const bundle = await loadDataBundle();
  const dates = bundle.adDailyRecords.map((ad) => ad.date).filter(Boolean).sort();
  return {
    minDate: dates[0] ?? '',
    maxDate: dates.at(-1) ?? '',
  };
}

export async function getAllCreativePerformance(): Promise<CreativePerformance[]> {
  const bundle = await loadDataBundle();
  return aggregateCreativePerformance(bundle.adDailyRecords, bundle.creativeRecords, 14, bundle.adCreativeRelations);
}

export async function getCreativeAIAnalysis(creativeId: string): Promise<CreativeAIAnalysis | undefined> {
  return getCreativeAIAnalyses().find((analysis) => analysis.creativeId === creativeId);
}

export function getCreativeAIAnalyses(): CreativeAIAnalysis[] {
  return mockFeishuAIAnalysisRecords.map(mapFeishuAIAnalysisRecord);
}

type CreativeAssetGroupBuilder = {
  assetGroupKey: string;
  creativeIds: Set<string>;
  adIds: Set<string>;
  creativesById: Map<string, CreativeRecord>;
  spendByCreativeId: Map<string, number>;
  relatedAds: CreativeAssetGroupRelatedAd[];
  spend: number;
  purchase: number;
  purchaseValue: number;
  impressions: number;
  clicks: number;
  audienceTotals: Map<string, MetricTotals>;
  copyTotals: Map<string, MetricTotals & { label: string }>;
};

type MetricTotals = {
  spend: number;
  purchase: number;
  purchaseValue: number;
  impressions: number;
  clicks: number;
};

function aggregateAdsForScope(ads: AdDailyRecord[], creatives: CreativeRecord[], relations: AdCreativeRelation[] = []): AdDailyRecord[] {
  const context = buildCreativeJoinContext(creatives, relations);
  const byAdId = new Map<string, AdDailyRecord[]>();

  ads.forEach((ad) => {
    const current = byAdId.get(ad.adId) ?? [];
    current.push(ad);
    byAdId.set(ad.adId, current);
  });

  return Array.from(byAdId.values()).map((records) => {
    const latest = [...records].sort((a, b) => b.date.localeCompare(a.date))[0];
    const totals = records.reduce(
      (acc, ad) => ({
        spend: acc.spend + ad.spend,
        purchase: acc.purchase + ad.purchase,
        purchaseValue: acc.purchaseValue + ad.purchaseValue,
        impressions: acc.impressions + ad.impressions,
        clicks: acc.clicks + (ad.clicks ?? 0),
        reach: acc.reach + (ad.reach ?? 0),
      }),
      { spend: 0, purchase: 0, purchaseValue: 0, impressions: 0, clicks: 0, reach: 0 },
    );
    const resolved = resolveCreativeForAdWithContext(latest, context);
    const creative = resolved.creative;

    return {
      ...latest,
      creativeId: creative?.creativeId || resolved.relation?.creativeId || latest.creativeId,
      product: resolved.relation?.product || creative?.product || latest.product,
      audience: resolved.relation?.audience || creative?.audience || latest.audience || latest.adsetName,
      effectiveStatus: resolved.relation?.effectiveStatus || creative?.effectiveStatus || latest.effectiveStatus,
      configuredStatus: resolved.relation?.configuredStatus || creative?.configuredStatus || latest.configuredStatus,
      spend: round(totals.spend, 2),
      impressions: totals.impressions,
      reach: totals.reach || undefined,
      frequency: totals.reach > 0 ? round(totals.impressions / totals.reach, 2) : latest.frequency,
      clicks: totals.clicks,
      linkClicks: totals.clicks > 0 ? sumAdMetric(records, 'linkClicks') : undefined,
      outboundClicks: totals.clicks > 0 ? sumAdMetric(records, 'outboundClicks') : undefined,
      ctr: safePercent(totals.clicks, totals.impressions),
      cpc: safeDivide(totals.spend, totals.clicks),
      cpm: totals.impressions > 0 ? round((totals.spend / totals.impressions) * 1000, 2) : 0,
      purchase: totals.purchase,
      purchaseValue: round(totals.purchaseValue, 2),
      roas: safeDivide(totals.purchaseValue, totals.spend),
      cpa: safeDivide(totals.spend, totals.purchase),
    };
  });
}

function finalizeCreativeAssetGroup(builder: CreativeAssetGroupBuilder): CreativeAssetGroup {
  const creatives = Array.from(builder.creativeIds)
    .map((creativeId) => builder.creativesById.get(creativeId))
    .filter((creative): creative is CreativeRecord => Boolean(creative));
  const representativeCreative = chooseRepresentativeCreative(creatives, builder.spendByCreativeId);
  const fallbackCreative = creatives[0];
  const sourceCreative = representativeCreative ?? fallbackCreative;
  const relatedAds = builder.relatedAds.sort((left, right) => right.spend - left.spend || left.adName.localeCompare(right.adName));
  const spend = round(builder.spend, 2);
  const purchase = builder.purchase;
  const purchaseValue = round(builder.purchaseValue, 2);
  const impressions = builder.impressions;
  const clicks = builder.clicks;

  return {
    assetGroupKey: builder.assetGroupKey,
    representativeCreativeId: sourceCreative?.creativeId || Array.from(builder.creativeIds)[0] || Array.from(builder.adIds)[0] || builder.assetGroupKey,
    creativeIds: Array.from(builder.creativeIds).sort((left, right) => left.localeCompare(right)),
    adIds: Array.from(builder.adIds).sort((left, right) => left.localeCompare(right)),
    name: sourceCreative?.primaryText || sourceCreative?.creativeName || relatedAds[0]?.adName || builder.assetGroupKey,
    product: sourceCreative?.product,
    audience: sourceCreative?.audience,
    creativeType: sourceCreative?.creativeType,
    materialType: sourceCreative?.materialType,
    aiAnalysisStatus: sourceCreative?.aiAnalysisStatus,
    previewUrl: sourceCreative ? getCreativeAssetPreviewUrl(sourceCreative) : undefined,
    originalVideoFileUrl: sourceCreative?.originalVideoFileUrl,
    videoUrl: sourceCreative?.videoUrl,
    thumbnailUrl: sourceCreative?.thumbnailUrl,
    imageUrl: sourceCreative?.imageUrl,
    primaryText: sourceCreative?.primaryText,
    headline: sourceCreative?.headline,
    description: sourceCreative?.description,
    cta: sourceCreative?.cta,
    landingPageUrl: sourceCreative?.landingPageUrl,
    spend,
    purchase,
    purchaseValue,
    impressions,
    clicks,
    roas: safeDivide(builder.purchaseValue, builder.spend),
    cpa: safeDivide(builder.spend, builder.purchase),
    ctr: safePercent(clicks, impressions),
    cpc: safeDivide(builder.spend, builder.clicks),
    cpm: builder.impressions > 0 ? round((builder.spend / builder.impressions) * 1000, 2) : 0,
    isSampleInsufficient: isSampleInsufficient(builder),
    sampleMessage: isSampleInsufficient(builder) ? '样本不足，继续观察' : undefined,
    topAudience: pickTopKey(builder.audienceTotals),
    topCopy: pickTopKey(builder.copyTotals),
    relatedAds,
  };
}

function addTotals(totalsMap: Map<string, MetricTotals>, key: string, ad: AdDailyRecord, label?: string): void;
function addTotals(totalsMap: Map<string, MetricTotals & { label: string }>, key: string, ad: AdDailyRecord, label: string): void;
function addTotals(
  totalsMap: Map<string, MetricTotals | (MetricTotals & { label: string })>,
  key: string,
  ad: AdDailyRecord,
  label?: string,
) {
  const current = totalsMap.get(key) ?? {
    ...(label ? { label } : {}),
    spend: 0,
    purchase: 0,
    purchaseValue: 0,
    impressions: 0,
    clicks: 0,
  };
  current.spend += ad.spend;
  current.purchase += ad.purchase;
  current.purchaseValue += ad.purchaseValue;
  current.impressions += ad.impressions;
  current.clicks += ad.clicks ?? 0;
  totalsMap.set(key, current);
}

function pickTopKey(totalsMap: Map<string, MetricTotals | (MetricTotals & { label: string })>) {
  const rows = Array.from(totalsMap.entries()).map(([key, totals]) => ({
    key,
    label: 'label' in totals ? totals.label : key,
    ...totals,
    roas: safeDivide(totals.purchaseValue, totals.spend),
    isSampleInsufficient: isSampleInsufficient(totals),
  }));
  const candidates = rows.filter((row) => !row.isSampleInsufficient);
  const sorted = (candidates.length > 0 ? candidates : rows).sort((left, right) => {
    if (left.purchaseValue !== right.purchaseValue) return right.purchaseValue - left.purchaseValue;
    if (left.purchase !== right.purchase) return right.purchase - left.purchase;
    if (left.roas !== right.roas) return right.roas - left.roas;
    return right.spend - left.spend;
  });
  return sorted[0]?.label;
}

function sumAdMetric(records: AdDailyRecord[], key: 'linkClicks' | 'outboundClicks') {
  const total = records.reduce((value, record) => value + (record[key] ?? 0), 0);
  return total > 0 ? total : undefined;
}

function chooseRepresentativeCreative(creatives: CreativeRecord[], spendByCreativeId: Map<string, number>) {
  if (creatives.length === 0) return undefined;

  return [...creatives].sort((left, right) => {
    const leftSpend = spendByCreativeId.get(left.creativeId) ?? 0;
    const rightSpend = spendByCreativeId.get(right.creativeId) ?? 0;
    if (leftSpend !== rightSpend) return rightSpend - leftSpend;
    return left.creativeId.localeCompare(right.creativeId);
  })[0];
}

type CreativeAssetKeySource = {
  assetGroupKey?: string;
  originalVideoFileUrl?: string;
  videoUrl?: string;
  videoId?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  creativeId?: string;
};

function getCreativeAssetGroupKey(creativeOrFallback: CreativeAssetKeySource) {
  return resolveAssetGroupKey(creativeOrFallback);
}

function getCreativeAssetPreviewUrl(creative: CreativeRecord) {
  return creative.originalVideoFileUrl || creative.videoUrl || creative.thumbnailUrl || creative.imageUrl || undefined;
}

function matchesCreativeAssetGroup(group: CreativeAssetGroup, filters: CreativeAssetGroupFilters) {
  const matchesType = !filters.creativeType || group.creativeType === filters.creativeType;
  const matchesStatus = !filters.aiAnalysisStatus || group.aiAnalysisStatus === filters.aiAnalysisStatus;
  const matchesProduct = !filters.product || group.product === filters.product;
  const matchesMaterialType = !filters.materialType || group.materialType === filters.materialType;
  return matchesType && matchesStatus && matchesProduct && matchesMaterialType;
}

function resolveAssetGroupDateRange(
  ads: AdDailyRecord[],
  filters: Pick<CreativeAssetGroupFilters, 'dateFrom' | 'dateTo'>,
) {
  if (filters.dateFrom && filters.dateTo) {
    return filters.dateFrom <= filters.dateTo
      ? { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
      : { dateFrom: filters.dateTo, dateTo: filters.dateFrom };
  }

  const dates = ads.map((ad) => ad.date).filter(Boolean).sort();
  const maxDate = dates.at(-1) ?? '';
  const minDate = dates[0] ?? '';
  if (!maxDate) return { dateFrom: '', dateTo: '' };

  const defaultFrom = shiftDateKey(maxDate, -29);
  return {
    dateFrom: defaultFrom >= minDate ? defaultFrom : minDate,
    dateTo: maxDate,
  };
}

function createEmptyTrendPoint(date: string): CreativeTrendPoint {
  return {
    date,
    spend: 0,
    purchase: 0,
    purchaseValue: 0,
    impressions: 0,
    clicks: 0,
    roas: 0,
    cpa: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
  };
}

function buildCreativeListPerformanceMap(
  ads: Awaited<ReturnType<typeof loadDataBundle>>['adDailyRecords'],
  creatives: CreativeRecord[],
  relations: Awaited<ReturnType<typeof loadDataBundle>>['adCreativeRelations'],
  filters: CreativeFilters,
) {
  const { dateFrom, dateTo } = resolveDateRange(ads, filters);
  const scopedAds = ads.filter((ad) => (!dateFrom || ad.date >= dateFrom) && (!dateTo || ad.date <= dateTo));
  const performanceById = new Map<string, CreativeListPerformance>();

  creatives.forEach((creative) => {
    const totals = scopedAds
      .filter((ad) => matchesCreative(ad, creative, relations))
      .reduce(
        (acc, ad) => ({
          spend: acc.spend + ad.spend,
          purchase: acc.purchase + ad.purchase,
          purchaseValue: acc.purchaseValue + ad.purchaseValue,
          impressions: acc.impressions + ad.impressions,
          clicks: acc.clicks + (ad.clicks ?? 0),
        }),
        { spend: 0, purchase: 0, purchaseValue: 0, impressions: 0, clicks: 0 },
      );

    performanceById.set(creative.creativeId, {
      creativeId: creative.creativeId,
      spend: round(totals.spend, 2),
      purchase: totals.purchase,
      purchaseValue: round(totals.purchaseValue, 2),
      impressions: totals.impressions,
      clicks: totals.clicks,
      roas: safeDivide(totals.purchaseValue, totals.spend),
      cpa: safeDivide(totals.spend, totals.purchase),
      ctr: totals.impressions > 0 ? round((totals.clicks / totals.impressions) * 100, 2) : 0,
      cpc: safeDivide(totals.spend, totals.clicks),
      cpm: totals.impressions > 0 ? round((totals.spend / totals.impressions) * 1000, 2) : 0,
    });
  });

  return performanceById;
}

function resolveDateRange(
  ads: Awaited<ReturnType<typeof loadDataBundle>>['adDailyRecords'],
  filters: Pick<CreativeFilters, 'dateFrom' | 'dateTo'>,
) {
  if (filters.dateFrom && filters.dateTo) {
    return filters.dateFrom <= filters.dateTo
      ? { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
      : { dateFrom: filters.dateTo, dateTo: filters.dateFrom };
  }

  const dates = ads.map((ad) => ad.date).filter(Boolean).sort();
  const maxDate = dates.at(-1) ?? '';
  const minDate = dates[0] ?? '';
  if (!maxDate) return { dateFrom: '', dateTo: '' };

  const defaultFrom = shiftDateKey(maxDate, -6);
  return {
    dateFrom: defaultFrom >= minDate ? defaultFrom : minDate,
    dateTo: maxDate,
  };
}

function finalizeTrendPoint(point: CreativeTrendPoint): CreativeTrendPoint {
  return {
    ...point,
    spend: round(point.spend, 2),
    purchaseValue: round(point.purchaseValue, 2),
    roas: safeDivide(point.purchaseValue, point.spend),
    cpa: safeDivide(point.spend, point.purchase),
    ctr: point.impressions > 0 ? round((point.clicks / point.impressions) * 100, 2) : 0,
    cpc: safeDivide(point.spend, point.clicks),
    cpm: point.impressions > 0 ? round((point.spend / point.impressions) * 1000, 2) : 0,
  };
}

function safeDivide(numerator: number, denominator: number) {
  return denominator > 0 ? round(numerator / denominator, 2) : 0;
}

function safePercent(numerator: number, denominator: number) {
  return denominator > 0 ? round((numerator / denominator) * 100, 2) : 0;
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
