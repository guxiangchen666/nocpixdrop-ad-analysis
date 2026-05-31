import type { AdDailyRecord } from '../types/ads';
import { aggregateAdRecords } from './performanceService';
import { loadDataBundle } from './dataStore';
import { shiftDateKey } from '../utils/dateKey';

export interface AdsFilters {
  dateFrom?: string;
  dateTo?: string;
  campaign?: string;
  product?: string;
  status?: string;
  minRoas?: number;
  maxCpa?: number;
}

export async function getAds(filters: AdsFilters = {}): Promise<AdDailyRecord[]> {
  const bundle = await loadDataBundle();
  const scopedDailyRecords = bundle.adDailyRecords.filter((ad) => {
    const matchesDateFrom = !filters.dateFrom || ad.date >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || ad.date <= filters.dateTo;
    return matchesDateFrom && matchesDateTo;
  });

  const rangeDays = filters.dateFrom || filters.dateTo ? 30 : 7;
  return aggregateAdRecords(scopedDailyRecords, bundle.creativeRecords, rangeDays, bundle.adCreativeRelations).filter((ad) => {
    const matchesDateFrom = !filters.dateFrom || ad.date >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || ad.date <= filters.dateTo;
    const matchesCampaign = !filters.campaign || ad.campaignName === filters.campaign;
    const matchesProduct = !filters.product || ad.product === filters.product;
    const matchesStatus = !filters.status || ad.effectiveStatus === filters.status;
    const matchesRoas = filters.minRoas === undefined || ad.roas >= filters.minRoas;
    const matchesCpa = filters.maxCpa === undefined || ad.cpa <= filters.maxCpa;

    return matchesDateFrom && matchesDateTo && matchesCampaign && matchesProduct && matchesStatus && matchesRoas && matchesCpa;
  });
}

export async function getActiveAds(filters: AdsFilters = {}): Promise<AdDailyRecord[]> {
  const bundle = await loadDataBundle();
  const recentCutoff = bundle.adDailyRecords.reduce((latest, ad) => (ad.date > latest ? ad.date : latest), '');
  const recentWindow = getRecentWindowCutoff(recentCutoff, 3);
  const recentSpendByAdId = bundle.adDailyRecords.reduce<Record<string, number>>((acc, ad) => {
    if (ad.date >= recentWindow) acc[ad.adId] = (acc[ad.adId] ?? 0) + ad.spend;
    return acc;
  }, {});

  return (await getAds(filters)).filter((ad) => {
    if (filters.status) return true;
    return ad.effectiveStatus === 'ACTIVE' || (recentSpendByAdId[ad.adId] ?? 0) > 0;
  });
}

export async function getAdById(adId: string): Promise<AdDailyRecord | undefined> {
  const ads = await getAds();
  return ads.find((ad) => ad.adId === adId);
}

export async function getAdDailyRecords(filters: AdsFilters = {}): Promise<AdDailyRecord[]> {
  const bundle = await loadDataBundle();
  return bundle.adDailyRecords.filter((ad) => {
    const matchesDateFrom = !filters.dateFrom || ad.date >= filters.dateFrom;
    const matchesDateTo = !filters.dateTo || ad.date <= filters.dateTo;
    const matchesCampaign = !filters.campaign || ad.campaignName === filters.campaign;
    const matchesProduct = !filters.product || ad.product === filters.product;
    return matchesDateFrom && matchesDateTo && matchesCampaign && matchesProduct;
  });
}

function getRecentWindowCutoff(latestDate: string, rangeDays: number) {
  if (!latestDate) return '';
  return shiftDateKey(latestDate, -(rangeDays - 1));
}
