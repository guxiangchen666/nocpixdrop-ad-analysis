import type { AdDailyRecord } from '../types/ads';
import type { AdCreativeRelation } from '../types/feishu';
import type {
  AssetAudienceCopyPerformance,
  AssetBreakdownPerformance,
  AssetDetail,
  AssetMetricSummary,
  AssetPeriodComparison,
  AssetRelatedAd,
  CreativeRecord,
  CreativeTrendPoint,
  CreativeTrendRange,
} from '../types/creatives';
import { loadDataBundle, type DataBundle } from './dataStore';
import { buildCreativeJoinContext, getCutoffDate, resolveCreativeForAdWithContext } from './performanceService';

const SAMPLE_INSUFFICIENT_MESSAGE = '样本不足，继续观察';

type MetricTotals = {
  spend: number;
  purchase: number;
  purchaseValue: number;
  impressions: number;
  clicks: number;
};

type AssetScopedRecord = {
  ad: AdDailyRecord;
  creative?: CreativeRecord;
  relation?: AdCreativeRelation;
  assetGroupKey: string;
  audienceKey: string;
  copyKey: string;
  copyLabel: string;
};

type AssetMetricBuilder = MetricTotals & {
  creativeIds: Set<string>;
  adIds: Set<string>;
};

export function resolveAssetGroupKey(creativeOrFallback: {
  assetGroupKey?: string;
  originalVideoFileUrl?: string;
  videoUrl?: string;
  videoId?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  creativeId?: string;
}) {
  return creativeOrFallback.assetGroupKey
    || creativeOrFallback.originalVideoFileUrl
    || creativeOrFallback.videoUrl
    || creativeOrFallback.videoId
    || creativeOrFallback.thumbnailUrl
    || creativeOrFallback.imageUrl
    || creativeOrFallback.creativeId
    || '';
}

export function getCopyKey(creative?: Pick<CreativeRecord, 'primaryText' | 'headline' | 'cta'>) {
  const rawCopy = [creative?.primaryText, creative?.headline, creative?.cta].filter(Boolean).join(' ');
  return normalizeKey(rawCopy) || '未填写文案';
}

export function getCopyLabel(creative?: Pick<CreativeRecord, 'primaryText' | 'headline' | 'cta'>) {
  return [creative?.primaryText, creative?.headline, creative?.cta].filter(Boolean).join(' / ') || '未填写文案';
}

export function getAudienceKey(ad: AdDailyRecord, creative?: CreativeRecord, relation?: AdCreativeRelation) {
  return relation?.audience || creative?.audience || ad.adsetName || '未标注受众';
}

export function isSampleInsufficient(totals: Pick<MetricTotals, 'spend' | 'purchase' | 'impressions'>) {
  return totals.spend < 100 || totals.purchase < 3 || totals.impressions < 1000;
}

export async function getAssetDetail(assetGroupKey: string, range: CreativeTrendRange = '30d'): Promise<AssetDetail | undefined> {
  const bundle = await loadDataBundle();
  const targetKey = normalizeRouteKey(assetGroupKey);
  const allAssetRecords = getAssetScopedRecords(bundle, targetKey);
  const scopedRecords = getAssetScopedRecords(bundle, targetKey, range);
  const creatives = getCreativesForAsset(bundle.creativeRecords, targetKey, allAssetRecords);

  if (creatives.length === 0 && allAssetRecords.length === 0) return undefined;

  const totals = finalizeMetricTotals(sumScopedRecords(scopedRecords));
  const adGroups = groupScopedRecords(scopedRecords, (record) => record.ad.adId);
  const relatedAds = Array.from(adGroups.entries())
    .map(([, records]) => finalizeRelatedAd(records))
    .sort((left, right) => right.spend - left.spend || left.adName.localeCompare(right.adName));
  const creativeIds = uniqueStrings([
    ...creatives.map((creative) => creative.creativeId),
    ...scopedRecords.map((record) => record.creative?.creativeId || record.relation?.creativeId || record.ad.creativeId),
  ]);
  const adIds = uniqueStrings([
    ...relatedAds.map((ad) => ad.adId),
    ...creatives.map((creative) => creative.adId),
    ...bundle.adCreativeRelations
      .filter((relation) => creativeIds.includes(relation.creativeId))
      .map((relation) => relation.adId),
  ]);
  const representativeCreative = chooseRepresentativeCreative(creatives, scopedRecords);
  const sourceCreative = representativeCreative ?? creatives[0];
  const topAudience = pickTopLabel(buildBreakdown(scopedRecords, (record) => record.audienceKey, (record) => record.audienceKey));
  const topCopy = pickTopLabel(buildBreakdown(scopedRecords, (record) => record.copyKey, (record) => record.copyLabel));

  return {
    assetGroupKey: targetKey,
    representativeCreativeId: sourceCreative?.creativeId || creativeIds[0] || targetKey,
    creativeIds,
    adIds,
    creatives,
    name: sourceCreative?.primaryText || sourceCreative?.creativeName || relatedAds[0]?.adName || targetKey,
    product: sourceCreative?.product,
    audience: sourceCreative?.audience,
    creativeType: sourceCreative?.creativeType,
    materialType: sourceCreative?.materialType,
    previewUrl: sourceCreative ? getCreativeAssetPreviewUrl(sourceCreative) : undefined,
    videoId: sourceCreative?.videoId,
    originalVideoFileUrl: sourceCreative?.originalVideoFileUrl,
    videoUrl: sourceCreative?.videoUrl,
    thumbnailUrl: sourceCreative?.thumbnailUrl,
    imageUrl: sourceCreative?.imageUrl,
    assetSource: sourceCreative?.assetSource,
    manualAssetNote: sourceCreative?.manualAssetNote,
    primaryText: sourceCreative?.primaryText,
    headline: sourceCreative?.headline,
    description: sourceCreative?.description,
    cta: sourceCreative?.cta,
    landingPageUrl: sourceCreative?.landingPageUrl,
    topAudience,
    topCopy,
    relatedAds,
    ...totals,
  };
}

export async function getAssetPeriodComparison(assetGroupKey: string): Promise<AssetPeriodComparison> {
  const bundle = await loadDataBundle();
  const targetKey = normalizeRouteKey(assetGroupKey);
  const scopedRecords = getAssetScopedRecords(bundle, targetKey);
  const latestDate = bundle.adDailyRecords.reduce((latest, ad) => (ad.date > latest ? ad.date : latest), '');
  if (!latestDate) {
    const empty = finalizeMetricTotals(createEmptyMetricBuilder());
    return {
      recent7d: empty,
      previous7d: empty,
      roasChangePct: 0,
      cpaChangePct: 0,
      ctrChangePct: 0,
      trendSignal: '表现稳定',
    };
  }

  const recentStart = shiftDateKey(latestDate, -6);
  const previousStart = shiftDateKey(latestDate, -13);
  const previousEnd = shiftDateKey(latestDate, -7);
  const recent7d = finalizeMetricTotals(sumScopedRecords(scopedRecords.filter((record) => record.ad.date >= recentStart && record.ad.date <= latestDate)));
  const previous7d = finalizeMetricTotals(sumScopedRecords(scopedRecords.filter((record) => record.ad.date >= previousStart && record.ad.date <= previousEnd)));
  const roasChangePct = percentChange(recent7d.roas, previous7d.roas);
  const cpaChangePct = percentChange(recent7d.cpa, previous7d.cpa);
  const ctrChangePct = percentChange(recent7d.ctr, previous7d.ctr);

  return {
    recent7d,
    previous7d,
    roasChangePct,
    cpaChangePct,
    ctrChangePct,
    trendSignal: inferTrendSignal(recent7d, previous7d, roasChangePct, cpaChangePct),
  };
}

export async function getAssetAudiencePerformance(assetGroupKey: string, range: CreativeTrendRange = '30d'): Promise<AssetBreakdownPerformance[]> {
  const bundle = await loadDataBundle();
  const scopedRecords = getAssetScopedRecords(bundle, normalizeRouteKey(assetGroupKey), range);
  return buildBreakdown(scopedRecords, (record) => record.audienceKey, (record) => record.audienceKey);
}

export async function getAssetCopyPerformance(assetGroupKey: string, range: CreativeTrendRange = '30d'): Promise<AssetBreakdownPerformance[]> {
  const bundle = await loadDataBundle();
  const scopedRecords = getAssetScopedRecords(bundle, normalizeRouteKey(assetGroupKey), range);
  return buildBreakdown(scopedRecords, (record) => record.copyKey, (record) => record.copyLabel);
}

export async function getAssetAudienceCopyMatrix(assetGroupKey: string, range: CreativeTrendRange = '30d'): Promise<AssetAudienceCopyPerformance[]> {
  const bundle = await loadDataBundle();
  const scopedRecords = getAssetScopedRecords(bundle, normalizeRouteKey(assetGroupKey), range);
  const builders = new Map<string, AssetMetricBuilder & { audienceKey: string; copyKey: string; copyLabel: string }>();

  scopedRecords.forEach((record) => {
    const key = `${record.audienceKey}__${record.copyKey}`;
    const builder = builders.get(key) ?? {
      audienceKey: record.audienceKey,
      copyKey: record.copyKey,
      copyLabel: record.copyLabel,
      creativeIds: new Set<string>(),
      adIds: new Set<string>(),
      spend: 0,
      purchase: 0,
      purchaseValue: 0,
      impressions: 0,
      clicks: 0,
    };
    addRecordToBuilder(builder, record);
    builders.set(key, builder);
  });

  return Array.from(builders.values())
    .map((builder) => ({
      audienceKey: builder.audienceKey,
      copyKey: builder.copyKey,
      copyLabel: builder.copyLabel,
      creativeIds: Array.from(builder.creativeIds).sort((left, right) => left.localeCompare(right)),
      adIds: Array.from(builder.adIds).sort((left, right) => left.localeCompare(right)),
      ...finalizeMetricTotals(builder),
    }))
    .sort(sortMetricRows);
}

export async function getAssetPerformanceTrend(assetGroupKey: string, range: CreativeTrendRange = '30d'): Promise<CreativeTrendPoint[]> {
  const bundle = await loadDataBundle();
  const scopedRecords = getAssetScopedRecords(bundle, normalizeRouteKey(assetGroupKey), range);
  const latestDate = bundle.adDailyRecords.reduce((latest, ad) => (ad.date > latest ? ad.date : latest), '');
  if (!latestDate) return [];

  const days = Number(range.replace('d', ''));
  const dates = Array.from({ length: days }, (_, index) => shiftDateKey(latestDate, -(days - 1 - index)));
  const builders = new Map(dates.map((date) => [date, createEmptyMetricBuilder()]));

  scopedRecords.forEach((record) => {
    const builder = builders.get(record.ad.date);
    if (!builder) return;
    addRecordToBuilder(builder, record);
  });

  return dates.map((date) => ({
    date,
    ...finalizeMetricTotals(builders.get(date) ?? createEmptyMetricBuilder()),
  }));
}

function getAssetScopedRecords(bundle: DataBundle, assetGroupKey: string, range?: CreativeTrendRange): AssetScopedRecord[] {
  const context = buildCreativeJoinContext(bundle.creativeRecords, bundle.adCreativeRelations);
  const cutoff = range ? getCutoffDate(bundle.adDailyRecords, Number(range.replace('d', ''))) : '';

  return bundle.adDailyRecords
    .filter((ad) => !cutoff || ad.date >= cutoff)
    .map((ad) => {
      const resolved = resolveCreativeForAdWithContext(ad, context);
      const creative = resolved.creative;
      const relation = resolved.relation;
      const key = resolveAssetGroupKey(creative ?? { creativeId: relation?.creativeId || ad.creativeId });
      return {
        ad,
        creative,
        relation,
        assetGroupKey: key,
        audienceKey: getAudienceKey(ad, creative, relation),
        copyKey: getCopyKey(creative),
        copyLabel: getCopyLabel(creative),
      };
    })
    .filter((record) => record.assetGroupKey === assetGroupKey);
}

function getCreativesForAsset(creatives: CreativeRecord[], assetGroupKey: string, scopedRecords: AssetScopedRecord[]) {
  const creativeIdsFromAds = new Set(scopedRecords.map((record) => record.creative?.creativeId || record.relation?.creativeId || record.ad.creativeId).filter((item): item is string => Boolean(item)));

  return creatives
    .filter((creative) => resolveAssetGroupKey(creative) === assetGroupKey || creativeIdsFromAds.has(creative.creativeId))
    .sort((left, right) => left.creativeId.localeCompare(right.creativeId));
}

function buildBreakdown(scopedRecords: AssetScopedRecord[], getKey: (record: AssetScopedRecord) => string, getLabel: (record: AssetScopedRecord) => string): AssetBreakdownPerformance[] {
  const builders = new Map<string, AssetMetricBuilder & { label: string }>();

  scopedRecords.forEach((record) => {
    const key = getKey(record);
    const builder = builders.get(key) ?? {
      label: getLabel(record),
      creativeIds: new Set<string>(),
      adIds: new Set<string>(),
      spend: 0,
      purchase: 0,
      purchaseValue: 0,
      impressions: 0,
      clicks: 0,
    };
    addRecordToBuilder(builder, record);
    builders.set(key, builder);
  });

  return Array.from(builders.entries())
    .map(([key, builder]) => ({
      key,
      label: builder.label,
      creativeIds: Array.from(builder.creativeIds).sort((left, right) => left.localeCompare(right)),
      adIds: Array.from(builder.adIds).sort((left, right) => left.localeCompare(right)),
      ...finalizeMetricTotals(builder),
    }))
    .sort(sortMetricRows);
}

function finalizeRelatedAd(records: AssetScopedRecord[]): AssetRelatedAd {
  const latest = [...records].sort((left, right) => right.ad.date.localeCompare(left.ad.date))[0];
  const totals = finalizeMetricTotals(sumScopedRecords(records));

  return {
    adId: latest.ad.adId,
    adName: latest.ad.adName,
    campaignName: latest.ad.campaignName,
    adsetName: latest.ad.adsetName,
    creativeId: latest.creative?.creativeId || latest.relation?.creativeId || latest.ad.creativeId,
    audienceKey: latest.audienceKey,
    copyKey: latest.copyKey,
    copyLabel: latest.copyLabel,
    ...totals,
  };
}

function sumScopedRecords(records: AssetScopedRecord[]): MetricTotals {
  return records.reduce<MetricTotals>(
    (acc, record) => ({
      spend: acc.spend + record.ad.spend,
      purchase: acc.purchase + record.ad.purchase,
      purchaseValue: acc.purchaseValue + record.ad.purchaseValue,
      impressions: acc.impressions + record.ad.impressions,
      clicks: acc.clicks + (record.ad.clicks ?? 0),
    }),
    { spend: 0, purchase: 0, purchaseValue: 0, impressions: 0, clicks: 0 },
  );
}

function addRecordToBuilder(builder: AssetMetricBuilder, record: AssetScopedRecord) {
  builder.spend += record.ad.spend;
  builder.purchase += record.ad.purchase;
  builder.purchaseValue += record.ad.purchaseValue;
  builder.impressions += record.ad.impressions;
  builder.clicks += record.ad.clicks ?? 0;
  const creativeId = record.creative?.creativeId || record.relation?.creativeId || record.ad.creativeId;
  if (creativeId) builder.creativeIds.add(creativeId);
  builder.adIds.add(record.ad.adId);
}

function finalizeMetricTotals(totals: MetricTotals): AssetMetricSummary {
  const spend = round(totals.spend, 2);
  const purchaseValue = round(totals.purchaseValue, 2);
  const sampleLow = isSampleInsufficient(totals);

  return {
    spend,
    purchase: totals.purchase,
    purchaseValue,
    impressions: totals.impressions,
    clicks: totals.clicks,
    roas: safeDivide(totals.purchaseValue, totals.spend),
    cpa: safeDivide(totals.spend, totals.purchase),
    ctr: safePercent(totals.clicks, totals.impressions),
    cpc: safeDivide(totals.spend, totals.clicks),
    cpm: totals.impressions > 0 ? round((totals.spend / totals.impressions) * 1000, 2) : 0,
    isSampleInsufficient: sampleLow,
    sampleMessage: sampleLow ? SAMPLE_INSUFFICIENT_MESSAGE : undefined,
  };
}

function chooseRepresentativeCreative(creatives: CreativeRecord[], scopedRecords: AssetScopedRecord[]) {
  if (creatives.length === 0) return undefined;
  const spendByCreativeId = scopedRecords.reduce((map, record) => {
    const creativeId = record.creative?.creativeId || record.relation?.creativeId || record.ad.creativeId;
    if (!creativeId) return map;
    map.set(creativeId, (map.get(creativeId) ?? 0) + record.ad.spend);
    return map;
  }, new Map<string, number>());

  return [...creatives].sort((left, right) => {
    const leftSpend = spendByCreativeId.get(left.creativeId) ?? 0;
    const rightSpend = spendByCreativeId.get(right.creativeId) ?? 0;
    if (leftSpend !== rightSpend) return rightSpend - leftSpend;
    return left.creativeId.localeCompare(right.creativeId);
  })[0];
}

function pickTopLabel(rows: AssetBreakdownPerformance[]) {
  const sufficientRows = rows.filter((row) => !row.isSampleInsufficient);
  const candidates = sufficientRows.length > 0 ? sufficientRows : rows;
  return candidates[0]?.label;
}

function sortMetricRows<T extends Pick<AssetMetricSummary, 'spend' | 'purchase' | 'purchaseValue' | 'roas'>>(left: T, right: T) {
  if (left.purchaseValue !== right.purchaseValue) return right.purchaseValue - left.purchaseValue;
  if (left.purchase !== right.purchase) return right.purchase - left.purchase;
  if (left.roas !== right.roas) return right.roas - left.roas;
  return right.spend - left.spend;
}

function inferTrendSignal(recent7d: AssetMetricSummary, previous7d: AssetMetricSummary, roasChangePct: number, cpaChangePct: number): AssetPeriodComparison['trendSignal'] {
  if (recent7d.isSampleInsufficient || previous7d.spend === 0) return '表现稳定';
  if (roasChangePct <= -25 && cpaChangePct >= 20) return '疲劳风险';
  if (roasChangePct <= -15 || cpaChangePct >= 20) return '表现下降';
  if (roasChangePct >= 15 || cpaChangePct <= -15) return '表现上升';
  return '表现稳定';
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return round(((current - previous) / previous) * 100, 2);
}

function groupScopedRecords(records: AssetScopedRecord[], getKey: (record: AssetScopedRecord) => string) {
  return records.reduce((map, record) => {
    const key = getKey(record);
    const current = map.get(key) ?? [];
    current.push(record);
    map.set(key, current);
    return map;
  }, new Map<string, AssetScopedRecord[]>());
}

function normalizeKey(value: string) {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeRouteKey(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getCreativeAssetPreviewUrl(creative: CreativeRecord) {
  return creative.originalVideoFileUrl || creative.videoUrl || creative.thumbnailUrl || creative.imageUrl || undefined;
}

function createEmptyMetricBuilder(): AssetMetricBuilder {
  return {
    creativeIds: new Set<string>(),
    adIds: new Set<string>(),
    spend: 0,
    purchase: 0,
    purchaseValue: 0,
    impressions: 0,
    clicks: 0,
  };
}

function uniqueStrings(items: Array<string | undefined>) {
  return Array.from(new Set(items.filter((item): item is string => Boolean(item)))).sort((left, right) => left.localeCompare(right));
}

function shiftDateKey(dateKey: string, offsetDays: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
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
