import type { AdDailyRecord } from '../types/ads';
import type { AdCreativeRelation } from '../types/feishu';
import type { CreativePerformance, CreativeRecord, FatigueSignal } from '../types/creatives';
import { shiftDateKey } from '../utils/dateKey';

interface MetricTotals {
  spend: number;
  purchase: number;
  purchaseValue: number;
  impressions: number;
  clicks: number;
  reach: number;
}

export interface CreativeJoinContext {
  byCreativeId: Map<string, CreativeRecord>;
  byAdId: Map<string, CreativeRecord>;
  relationByAdId: Map<string, AdCreativeRelation>;
  relationByCreativeId: Map<string, AdCreativeRelation>;
}

export function buildCreativeJoinContext(creatives: CreativeRecord[], relations: AdCreativeRelation[] = []): CreativeJoinContext {
  const byCreativeId = new Map<string, CreativeRecord>();
  const byAdId = new Map<string, CreativeRecord>();
  creatives.forEach((creative) => {
    if (creative.creativeId) byCreativeId.set(creative.creativeId, creative);
    // Creative ID is the long-lived creative primary key. Ad ID is only a compatibility fallback for the current phase.
    if (creative.adId) byAdId.set(creative.adId, creative);
  });

  const relationByAdId = new Map<string, AdCreativeRelation>();
  const relationByCreativeId = new Map<string, AdCreativeRelation>();
  relations.forEach((relation) => {
    if (relation.adId) relationByAdId.set(relation.adId, relation);
    if (relation.creativeId) relationByCreativeId.set(relation.creativeId, relation);
  });

  return { byCreativeId, byAdId, relationByAdId, relationByCreativeId };
}

export function resolveCreativeForAd(ad: AdDailyRecord, creatives: CreativeRecord[], relations: AdCreativeRelation[] = []) {
  const context = buildCreativeJoinContext(creatives, relations);
  return resolveCreativeForAdWithContext(ad, context);
}

export function resolveCreativeForAdWithContext(ad: AdDailyRecord, context: CreativeJoinContext) {
  if (ad.creativeId) {
    const directCreative = context.byCreativeId.get(ad.creativeId);
    if (directCreative) {
      return {
        creative: directCreative,
        relation: context.relationByAdId.get(ad.adId) ?? context.relationByCreativeId.get(directCreative.creativeId),
        joinSource: 'creativeId' as const,
      };
    }
  }

  const relation = context.relationByAdId.get(ad.adId);
  if (relation) {
    const relationCreative = context.byCreativeId.get(relation.creativeId);
    if (relationCreative) {
      return {
        creative: relationCreative,
        relation,
        joinSource: 'relation' as const,
      };
    }
  }

  const fallbackCreative = context.byAdId.get(ad.adId);
  if (fallbackCreative) {
    return {
      creative: fallbackCreative,
      relation: context.relationByAdId.get(ad.adId) ?? context.relationByCreativeId.get(fallbackCreative.creativeId),
      joinSource: 'adId' as const,
    };
  }

  return {
    creative: undefined,
    relation,
    joinSource: 'unmatched' as const,
  };
}

export function matchesCreative(ad: AdDailyRecord, creative: CreativeRecord, relations: AdCreativeRelation[] = []) {
  if (ad.creativeId && creative.creativeId && ad.creativeId === creative.creativeId) return true;
  const relation = relations.find((item) => item.adId === ad.adId);
  if (relation && relation.creativeId && creative.creativeId && relation.creativeId === creative.creativeId) return true;
  // Creative ID is the long-lived creative primary key. 02A is the stable mapping table between Ad ID and Creative ID. Ad ID fallback is only the current compatibility path.
  return Boolean(!ad.creativeId && creative.adId && ad.adId === creative.adId);
}

export function aggregateCreativePerformance(ads: AdDailyRecord[], creatives: CreativeRecord[], rangeDays: 3 | 7 | 14 | 30, relations: AdCreativeRelation[] = []): CreativePerformance[] {
  const cutoff = getCutoffDate(ads, rangeDays);
  const scopedAds = ads.filter((ad) => ad.date >= cutoff);

  return creatives.map((creative) => {
    const matchedAds = scopedAds.filter((ad) => matchesCreative(ad, creative, relations));
    const totals3d = aggregateWindow(matchedAds, 3, relations, creative);
    const totals7d = aggregateWindow(matchedAds, 7, relations, creative);
    const totals14d = aggregateWindow(matchedAds, 14, relations, creative);

    return {
      creativeId: creative.creativeId,
      spend3d: round(totals3d.spend, 2),
      spend7d: round(totals7d.spend, 2),
      spend14d: round(totals14d.spend, 2),
      purchase3d: totals3d.purchase,
      purchase7d: totals7d.purchase,
      purchase14d: totals14d.purchase,
      purchaseValue3d: round(totals3d.purchaseValue, 2),
      purchaseValue7d: round(totals7d.purchaseValue, 2),
      purchaseValue14d: round(totals14d.purchaseValue, 2),
      roas3d: safeDivide(totals3d.purchaseValue, totals3d.spend),
      roas7d: safeDivide(totals7d.purchaseValue, totals7d.spend),
      roas14d: safeDivide(totals14d.purchaseValue, totals14d.spend),
      cpa3d: safeDivide(totals3d.spend, totals3d.purchase),
      cpa7d: safeDivide(totals7d.spend, totals7d.purchase),
      cpa14d: safeDivide(totals14d.spend, totals14d.purchase),
      ctr3d: safePercent(totals3d.clicks, totals3d.impressions),
      ctr7d: safePercent(totals7d.clicks, totals7d.impressions),
      ctr14d: safePercent(totals14d.clicks, totals14d.impressions),
      frequency7d: totals7d.reach > 0 ? round(totals7d.impressions / totals7d.reach, 2) : undefined,
      fatigueSignal: inferFatigueSignal(totals7d, totals14d),
    };
  });
}

export function aggregateAdRecords(ads: AdDailyRecord[], creatives: CreativeRecord[], rangeDays: 3 | 7 | 14 | 30, relations: AdCreativeRelation[] = []): AdDailyRecord[] {
  const cutoff = getCutoffDate(ads, rangeDays);
  const scopedAds = ads.filter((ad) => ad.date >= cutoff);
  const context = buildCreativeJoinContext(creatives, relations);
  const byAdId = new Map<string, AdDailyRecord[]>();

  scopedAds.forEach((ad) => {
    const current = byAdId.get(ad.adId) ?? [];
    current.push(ad);
    byAdId.set(ad.adId, current);
  });

  return Array.from(byAdId.values()).map((records) => {
    const latest = [...records].sort((a, b) => b.date.localeCompare(a.date))[0];
    const totals = records.reduce<MetricTotals>(
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
      linkClicks: sum(records, 'linkClicks'),
      outboundClicks: sum(records, 'outboundClicks'),
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

export function getCutoffDate(ads: AdDailyRecord[], rangeDays: number) {
  const latestDate = ads.reduce((latest, ad) => (ad.date > latest ? ad.date : latest), '');
  if (!latestDate) return '';
  return shiftDateKey(latestDate, -(rangeDays - 1));
}

function aggregateWindow(ads: AdDailyRecord[], days: 3 | 7 | 14, relations: AdCreativeRelation[], creative: CreativeRecord): MetricTotals {
  const cutoff = getCutoffDate(ads, days);
  return ads
    .filter((ad) => ad.date >= cutoff)
    .filter((ad) => matchesCreative(ad, creative, relations))
    .reduce<MetricTotals>(
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
}

function inferFatigueSignal(totals7d: MetricTotals, totals14d: MetricTotals): FatigueSignal {
  if (totals7d.spend === 0 || totals7d.purchase < 3) return '数据不足';
  const roas7d = safeDivide(totals7d.purchaseValue, totals7d.spend);
  const roas14d = safeDivide(totals14d.purchaseValue, totals14d.spend);
  const frequency = totals7d.reach > 0 ? totals7d.impressions / totals7d.reach : 0;
  if (frequency >= 2.4 && roas7d < roas14d * 0.82) return '明显疲劳';
  if (frequency >= 1.8 || roas7d < roas14d * 0.92) return '轻微疲劳';
  return '正常';
}

function sum(records: AdDailyRecord[], key: 'linkClicks' | 'outboundClicks') {
  const total = records.reduce((value, record) => value + (record[key] ?? 0), 0);
  return total || undefined;
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
