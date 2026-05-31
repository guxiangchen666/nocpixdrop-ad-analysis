import type { AdDailyRecord } from '../types/ads';
import type { CreativeRecord } from '../types/creatives';
import type { DashboardDateRange, DashboardSummary, DashboardTrendPoint } from '../types/dashboard';
import { aggregateAdRecords, resolveCreativeForAd } from './performanceService';
import { loadDataBundle } from './dataStore';
import { shiftDateKey } from '../utils/dateKey';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

interface ResolvedDateRange {
  dateFrom: string;
  dateTo: string;
  label: string;
}

interface TrendAccumulator extends DashboardTrendPoint {
  purchaseValue: number;
  sortDate: string;
}

export async function getDashboardSummary(range: DashboardDateRange = { preset: '7d' }): Promise<DashboardSummary> {
  const bundle = await loadDataBundle();
  const resolvedRange = resolveDashboardDateRange(range, bundle.adDailyRecords);
  const scopedDailyRecords = bundle.adDailyRecords.filter((ad) => ad.date >= resolvedRange.dateFrom && ad.date <= resolvedRange.dateTo);
  const ads = aggregateAdRecords(scopedDailyRecords, bundle.creativeRecords, 30, bundle.adCreativeRelations);
  const spend = ads.reduce((sum, ad) => sum + ad.spend, 0);
  const purchase = ads.reduce((sum, ad) => sum + ad.purchase, 0);
  const purchaseValue = ads.reduce((sum, ad) => sum + ad.purchaseValue, 0);
  const impressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
  const clicks = ads.reduce((sum, ad) => sum + (ad.clicks ?? 0), 0);

  const roas = spend > 0 ? purchaseValue / spend : 0;
  const cpa = purchase > 0 ? spend / purchase : 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const topAds = [...ads].sort((a, b) => b.roas - a.roas).slice(0, 5);

  return {
    metrics: [
      { label: 'Spend', value: currency.format(spend), helper: `${resolvedRange.label}总花费`, tone: 'blue' },
      { label: 'Purchase', value: decimal.format(purchase), helper: '购买数', tone: 'green' },
      { label: 'Purchase Value', value: currency.format(purchaseValue), helper: '购买金额', tone: 'yellow' },
      { label: 'ROAS', value: `${decimal.format(roas)}x`, helper: '整体回收', tone: 'green' },
      { label: 'CPA', value: currency.format(cpa), helper: '单次购买成本', tone: 'orange' },
      { label: 'CTR', value: `${decimal.format(ctr)}%`, helper: '点击率', tone: 'blue' },
      { label: 'CPC', value: currency.format(cpc), helper: '单次点击成本', tone: 'default' },
      { label: 'CPM', value: currency.format(cpm), helper: '千次展示成本', tone: 'default' },
    ],
    trend: buildTrend(scopedDailyRecords),
    topAds,
    topAdCreatives: topAds.map((ad) => resolveCreativeForAd(ad, bundle.creativeRecords, bundle.adCreativeRelations).creative).filter(isCreativeRecord),
    topCreatives: bundle.creativeRecords.slice(0, 4),
    focusRecommendations: [
      'INFITAC broad scaling winner 可小幅加预算，保持 15%-20% 的温和扩量。',
      'Thermal Sight Objection Crusher 出现明显疲劳，建议替换前三秒 Hook。',
      'FMP13 testimonial 表现稳定，下一批素材可前置产品特写镜头。',
    ],
    rangeLabel: resolvedRange.label,
    dateFrom: resolvedRange.dateFrom,
    dateTo: resolvedRange.dateTo,
  };
}

function isCreativeRecord(creative: CreativeRecord | undefined): creative is CreativeRecord {
  return Boolean(creative);
}

export async function getDashboardAvailableDateRange() {
  const bundle = await loadDataBundle();
  const dates = bundle.adDailyRecords.map((ad) => ad.date).sort();
  return {
    minDate: dates[0] ?? '',
    maxDate: dates[dates.length - 1] ?? '',
  };
}

function resolveDashboardDateRange(range: DashboardDateRange, ads: AdDailyRecord[]): ResolvedDateRange {
  const latestDate = ads.reduce((latest, ad) => (ad.date > latest ? ad.date : latest), '');
  const earliestDate = ads.reduce((earliest, ad) => (!earliest || ad.date < earliest ? ad.date : earliest), '');
  if (!latestDate) return { dateFrom: '', dateTo: '', label: '当前范围' };

  if (range.preset === 'today') {
    return { dateFrom: latestDate, dateTo: latestDate, label: '今天' };
  }

  if (range.preset === 'yesterday') {
    const yesterday = shiftDate(latestDate, -1);
    return { dateFrom: yesterday, dateTo: yesterday, label: '昨天' };
  }

  if (range.preset === '30d') {
    return { dateFrom: maxDate(shiftDate(latestDate, -29), earliestDate), dateTo: latestDate, label: '近 30 天' };
  }

  if (range.preset === 'custom') {
    const rawFrom = range.dateFrom || earliestDate;
    const rawTo = range.dateTo || latestDate;
    const dateFrom = minDate(rawFrom, rawTo);
    const dateTo = maxDate(rawFrom, rawTo);
    return { dateFrom, dateTo, label: `${formatShortDate(dateFrom)} - ${formatShortDate(dateTo)}` };
  }

  return { dateFrom: maxDate(shiftDate(latestDate, -6), earliestDate), dateTo: latestDate, label: '近 7 天' };
}

function buildTrend(ads: AdDailyRecord[]): DashboardTrendPoint[] {
  const byDate = ads.reduce<Record<string, TrendAccumulator>>((acc, ad) => {
    acc[ad.date] ??= { date: ad.date.slice(5), sortDate: ad.date, spend: 0, purchase: 0, purchaseValue: 0, roas: 0 };
    acc[ad.date].spend += ad.spend;
    acc[ad.date].purchase += ad.purchase;
    acc[ad.date].purchaseValue += ad.purchaseValue;
    return acc;
  }, {});

  return Object.values(byDate)
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate))
    .map((point) => ({
      date: point.date,
      purchase: point.purchase,
      spend: Number(point.spend.toFixed(2)),
      roas: point.spend > 0 ? Number((point.purchaseValue / point.spend).toFixed(2)) : 0,
    }));
}

function shiftDate(date: string, offsetDays: number) {
  return shiftDateKey(date, offsetDays);
}

function formatShortDate(date: string) {
  return date.slice(5).replace('-', '/');
}

function minDate(a: string, b: string) {
  return a <= b ? a : b;
}

function maxDate(a: string, b: string) {
  return a >= b ? a : b;
}
