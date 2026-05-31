import { mapFeishuAdCreativeRelation, mapFeishuAdDailyRecord, mapFeishuCreativeRecord } from '../adapters/feishuAdapters';
import { mockFeishuAdCreativeRelationRecords, mockFeishuAdDailyRecords, mockFeishuCreativeRecords } from '../data/mockFeishuRecords';
import { getRuntimeSourceModes } from '../config/runtimeDataSource';
import type { AdCreativeRelation } from '../types/feishu';
import type { AdDailyRecord } from '../types/ads';
import type { CreativeRecord } from '../types/creatives';
import type { SourceMode, SourceModes } from '../config/dataSource';

type FeishuRoutePayload = {
  ok?: boolean;
  message?: string;
  records?: unknown[];
};

export interface DataBundle {
  sourceModes: SourceModes;
  adDailyRecords: AdDailyRecord[];
  creativeRecords: CreativeRecord[];
  adCreativeRelations: AdCreativeRelation[];
}

const DATA_BUNDLE_CACHE_TTL_MS = 60_000;

type CachedBundle = {
  expiresAt: number;
  promise: Promise<DataBundle>;
};

const bundleCache = new Map<string, CachedBundle>();

export async function loadDataBundle(): Promise<DataBundle> {
  const sourceModes = getRuntimeSourceModes();
  const cacheKey = JSON.stringify(sourceModes);
  const cached = bundleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;
  if (cached) bundleCache.delete(cacheKey);

  const bundlePromise = (async () => {
    const [adDailyRecords, loadedCreativeRecords, adCreativeRelations] = await Promise.all([
      loadAdDailyRecords(sourceModes.ads),
      loadCreativeRecords(sourceModes.creatives),
      loadRelationRecords(sourceModes.relations),
    ]);
    const creativeRecords = enrichCreativeRecords(loadedCreativeRecords, adCreativeRelations);

    return {
      sourceModes,
      adDailyRecords,
      creativeRecords,
      adCreativeRelations,
    };
  })();

  bundleCache.set(cacheKey, {
    expiresAt: Date.now() + DATA_BUNDLE_CACHE_TTL_MS,
    promise: bundlePromise,
  });
  void bundlePromise.catch(() => bundleCache.delete(cacheKey));
  return bundlePromise;
}

export function clearDataBundleCache() {
  bundleCache.clear();
}

async function loadAdDailyRecords(mode: SourceMode): Promise<AdDailyRecord[]> {
  const rawRecords = await loadSourceRecords({
    mode,
    route: '/api/feishu/ad-daily',
    label: 'ad daily',
    mockRecords: mockFeishuAdDailyRecords,
  });
  return rawRecords.map(mapFeishuAdDailyRecord);
}

async function loadCreativeRecords(mode: SourceMode): Promise<CreativeRecord[]> {
  const rawRecords = await loadSourceRecords({
    mode,
    route: '/api/feishu/creatives',
    label: 'creative library',
    mockRecords: mockFeishuCreativeRecords,
  });
  return rawRecords.map(mapFeishuCreativeRecord);
}

async function loadRelationRecords(mode: SourceMode): Promise<AdCreativeRelation[]> {
  const rawRecords = await loadSourceRecords({
    mode,
    route: '/api/feishu/ad-creative-relations',
    label: 'ad creative relations',
    mockRecords: mockFeishuAdCreativeRelationRecords,
  });
  return rawRecords.map(mapFeishuAdCreativeRelation);
}

function enrichCreativeRecords(creatives: CreativeRecord[], relations: AdCreativeRelation[]): CreativeRecord[] {
  if (relations.length === 0) return creatives;

  const relationByCreativeId = new Map<string, AdCreativeRelation>();
  const relationByAdId = new Map<string, AdCreativeRelation>();
  relations.forEach((relation) => {
    if (relation.creativeId) relationByCreativeId.set(relation.creativeId, relation);
    if (relation.adId) relationByAdId.set(relation.adId, relation);
  });

  return creatives.map((creative) => {
    if (creative.product) return creative;
    const relation = relationByCreativeId.get(creative.creativeId) ?? (creative.adId ? relationByAdId.get(creative.adId) : undefined);
    return relation?.product ? { ...creative, product: relation.product } : creative;
  });
}

async function loadSourceRecords<T extends Record<string, unknown>>(
  params: {
    mode: SourceMode;
    route: string;
    label: string;
    mockRecords: T[];
  },
): Promise<T[]> {
  if (params.mode !== 'feishu') {
    return params.mockRecords;
  }

  try {
    const response = await fetch(params.route, { cache: 'no-store' });
    const payload = (await response.json().catch(() => ({}))) as FeishuRoutePayload;
    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.message || `Failed to load ${params.label} from Feishu.`);
    }
    return Array.isArray(payload.records) ? (payload.records as T[]) : [];
  } catch {
    console.warn('Feishu data fetch failed, fallback to mock data.');
    return params.mockRecords;
  }
}
