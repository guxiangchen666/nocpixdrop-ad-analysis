import type { AdDailyRecord } from '../types/ads';
import { loadDataBundle } from './dataStore';

export async function getAdDailyRecords(): Promise<AdDailyRecord[]> {
  const bundle = await loadDataBundle();
  return bundle.adDailyRecords;
}
