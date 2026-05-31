export type FeishuFieldValue = unknown;

export type FeishuRecord = Record<string, FeishuFieldValue>;

export type FeishuAdDailyRecord = FeishuRecord;
export type FeishuCreativeRecord = FeishuRecord;
export type FeishuAdCreativeRelationRecord = FeishuRecord;
export type FeishuAIAnalysisRecord = FeishuRecord;
export type FeishuRecommendationRecord = FeishuRecord;

export interface AdCreativeRelation {
  uniqueKey: string;
  adId: string;
  adName?: string;
  campaignId?: string;
  campaignName?: string;
  adsetId?: string;
  adsetName?: string;
  creativeId: string;
  creativeName?: string;
  effectiveStatus?: string;
  configuredStatus?: string;
  product?: string;
  audience?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  lastSyncedAt?: string;
}
