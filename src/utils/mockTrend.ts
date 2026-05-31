import type { AdDailyRecord } from '../types/ads';

export type TrendRange = '3d' | '7d' | '14d' | '30d';

export interface AdTrendPoint {
  date: string;
  spend: number;
  purchase: number;
  roas: number;
  ctr: number;
}

const rangeDays: Record<TrendRange, number> = {
  '3d': 3,
  '7d': 7,
  '14d': 14,
  '30d': 30,
};

const trendCache = new Map<string, AdTrendPoint[]>();

export function getTrendDays(range: TrendRange) {
  return rangeDays[range];
}

export function buildTrendData(ad: AdDailyRecord, range: TrendRange): AdTrendPoint[] {
  const cacheKey = `${ad.adId}:${range}`;
  const cached = trendCache.get(cacheKey);
  if (cached) return cached;

  const days = getTrendDays(range);
  const random = createSeededRandom(hashString(cacheKey));
  const dailySpend = ad.spend / days;
  const dailyPurchase = ad.purchase / days;
  const baseRoas = ad.roas;
  const baseCtr = ad.ctr ?? 0;

  const jitter = (sigma: number) => clamp(1 + gaussian(random) * sigma, 0.6, 1.4);
  const data = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));

    const weekendSoftness = [0, 6].includes(date.getDay()) ? 0.94 : 1;
    const spend = Number((dailySpend * jitter(0.15) * weekendSoftness).toFixed(2));
    const purchase = Math.max(0, Math.round(dailyPurchase * jitter(0.25) * weekendSoftness));
    const roas = Number((baseRoas * jitter(0.12)).toFixed(2));
    const ctr = Number((baseCtr * jitter(0.1)).toFixed(2));

    return {
      date: formatMonthDay(date),
      spend,
      purchase,
      roas,
      ctr,
    };
  });

  trendCache.set(cacheKey, data);
  return data;
}

function gaussian(random: () => number): number {
  const u = 1 - random();
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function createSeededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatMonthDay(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
