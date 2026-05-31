import type { AdCreativeRelation, FeishuAdDailyRecord, FeishuAIAnalysisRecord, FeishuCreativeRecord, FeishuAdCreativeRelationRecord, FeishuRecommendationRecord } from '../types/feishu';
import type { AdDailyRecord } from '../types/ads';
import type { AIAnalysisStatus, CreativeAIAnalysis, CreativeRecord, CreativeType } from '../types/creatives';
import type { Recommendation, RecommendationObjectType, RecommendationPriority, RecommendationStatus } from '../types/recommendations';
import { FEISHU_AD_DAILY_FIELDS, FEISHU_AI_ANALYSIS_FIELDS, FEISHU_CREATIVE_FIELDS, FEISHU_RECOMMENDATION_FIELDS, FEISHU_RELATION_FIELDS } from '../config/feishuFields';
import { formatDateKey } from '../utils/dateKey';

type FeishuRecordLike = Record<string, unknown> | { fields?: Record<string, unknown> | null; record_id?: string; recordId?: string };

const adDailyFields = FEISHU_AD_DAILY_FIELDS;
const creativeFields = FEISHU_CREATIVE_FIELDS;
const relationFields = FEISHU_RELATION_FIELDS;
const aiAnalysisFields = FEISHU_AI_ANALYSIS_FIELDS;
const recommendationFields = FEISHU_RECOMMENDATION_FIELDS;

export function mapFeishuAdDailyRecord(raw: FeishuAdDailyRecord | FeishuRecordLike): AdDailyRecord {
  return {
    date: readDate(raw, adDailyFields.date),
    accountId: readText(raw, adDailyFields.accountId),
    accountName: optionalText(raw, adDailyFields.accountName),
    campaignId: readText(raw, adDailyFields.campaignId),
    campaignName: readText(raw, adDailyFields.campaignName),
    adsetId: readText(raw, adDailyFields.adsetId),
    adsetName: readText(raw, adDailyFields.adsetName),
    adId: readText(raw, adDailyFields.adId),
    adName: readText(raw, adDailyFields.adName),
    creativeId: optionalText(raw, adDailyFields.creativeId),
    objective: optionalText(raw, adDailyFields.objective),
    optimizationGoal: optionalText(raw, adDailyFields.optimizationGoal),
    spend: readNumber(raw, adDailyFields.spend),
    impressions: readNumber(raw, adDailyFields.impressions),
    reach: optionalNumber(raw, adDailyFields.reach),
    frequency: optionalNumber(raw, adDailyFields.frequency),
    clicks: optionalNumber(raw, adDailyFields.clicks),
    linkClicks: optionalNumber(raw, adDailyFields.linkClicks),
    outboundClicks: optionalNumber(raw, adDailyFields.outboundClicks),
    ctr: optionalNumber(raw, adDailyFields.ctr),
    cpc: optionalNumber(raw, adDailyFields.cpc),
    cpm: optionalNumber(raw, adDailyFields.cpm),
    landingPageView: optionalNumber(raw, adDailyFields.landingPageView),
    addToCart: optionalNumber(raw, adDailyFields.addToCart),
    initiateCheckout: optionalNumber(raw, adDailyFields.initiateCheckout),
    purchase: readNumber(raw, adDailyFields.purchase),
    purchaseValue: readNumber(raw, adDailyFields.purchaseValue),
    roas: readNumber(raw, adDailyFields.roas),
    cpa: optionalNumber(raw, adDailyFields.cpa) ?? optionalNumber(raw, adDailyFields.cpaFallback) ?? 0,
    attributionSetting: optionalText(raw, adDailyFields.attributionSetting),
    actionReportTime: optionalText(raw, adDailyFields.actionReportTime),
    syncTime: optionalText(raw, adDailyFields.syncTime),
    lastRefreshedAt: optionalText(raw, adDailyFields.lastRefreshedAt),
  };
}

export function mapFeishuCreativeRecord(raw: FeishuCreativeRecord | FeishuRecordLike): CreativeRecord {
  const assetGroupKey = optionalText(raw, creativeFields.assetGroupKey);
  const adId = optionalText(raw, creativeFields.adId);
  const videoId = optionalText(raw, creativeFields.videoId);
  const videoUrl = optionalLinkText(raw, creativeFields.videoUrl);
  const originalVideoFileUrl = optionalLinkText(raw, creativeFields.originalVideoFileUrl);
  const originalImageFileUrl = optionalLinkText(raw, creativeFields.originalImageFileUrl);
  const thumbnailUrl = optionalLinkText(raw, creativeFields.thumbnailUrl);
  const imageUrl = optionalLinkText(raw, creativeFields.imageUrl);
  const creativeType = inferCreativeType(
    getFieldValue(raw, creativeFields.creativeType) ?? getFieldValue(raw, creativeFields.creativeTypeCn),
    { videoId, videoUrl, originalVideoFileUrl, originalImageFileUrl, imageUrl },
  );

  return {
    creativeId: optionalText(raw, creativeFields.creativeId) || adId || '',
    assetGroupKey,
    adId,
    adName: optionalText(raw, creativeFields.adName),
    campaignId: optionalText(raw, creativeFields.campaignId),
    adsetId: optionalText(raw, creativeFields.adsetId),
    creativeName: optionalText(raw, creativeFields.creativeName) || optionalText(raw, creativeFields.materialName) || optionalText(raw, creativeFields.adName) || adId || 'Untitled Creative',
    creativeType,
    videoId,
    videoUrl,
    originalVideoFileUrl,
    originalImageFileUrl,
    originalAssetAttachment: optionalLinkText(raw, creativeFields.originalAssetAttachment),
    assetSource: optionalText(raw, creativeFields.assetSource),
    manualAssetNote: optionalText(raw, creativeFields.manualAssetNote),
    thumbnailUrl,
    imageUrl,
    primaryText: optionalText(raw, creativeFields.primaryText),
    headline: optionalText(raw, creativeFields.headline),
    description: optionalText(raw, creativeFields.description),
    cta: optionalText(raw, creativeFields.cta),
    landingPageUrl: optionalLinkText(raw, creativeFields.landingPageUrl),
    product: optionalText(raw, creativeFields.product) || optionalText(raw, creativeFields.productCn),
    audience: optionalText(raw, creativeFields.audience),
    materialDirection: optionalText(raw, creativeFields.materialDirection),
    materialName: optionalText(raw, creativeFields.materialName),
    materialType: optionalText(raw, creativeFields.materialType),
    materialBatch: optionalText(raw, creativeFields.materialBatch),
    effectiveStatus: optionalText(raw, creativeFields.effectiveStatus),
    configuredStatus: optionalText(raw, creativeFields.configuredStatus),
    adCreatedTime: optionalText(raw, creativeFields.adCreatedTime),
    adUpdatedTime: optionalText(raw, creativeFields.adUpdatedTime),
    aiAnalysisStatus: normalizeAIStatus(getFieldValue(raw, creativeFields.aiAnalysisStatus)),
    lastSyncedAt: optionalText(raw, creativeFields.lastSyncedAt),
  };
}

export function mapFeishuAdCreativeRelation(raw: FeishuAdCreativeRelationRecord | FeishuRecordLike): AdCreativeRelation {
  return {
    uniqueKey: readText(raw, relationFields.uniqueKey),
    adId: readText(raw, relationFields.adId),
    adName: optionalText(raw, relationFields.adName),
    campaignId: optionalText(raw, relationFields.campaignId),
    campaignName: optionalText(raw, relationFields.campaignName),
    adsetId: optionalText(raw, relationFields.adsetId),
    adsetName: optionalText(raw, relationFields.adsetName),
    creativeId: readText(raw, relationFields.creativeId),
    creativeName: optionalText(raw, relationFields.creativeName),
    effectiveStatus: optionalText(raw, relationFields.effectiveStatus),
    configuredStatus: optionalText(raw, relationFields.configuredStatus),
    product: optionalText(raw, relationFields.product),
    audience: optionalText(raw, relationFields.audience),
    firstSeenAt: optionalText(raw, relationFields.firstSeenAt),
    lastSeenAt: optionalText(raw, relationFields.lastSeenAt),
    lastSyncedAt: optionalText(raw, relationFields.lastSyncedAt),
  };
}

export function mapFeishuAIAnalysisRecord(raw: FeishuAIAnalysisRecord | FeishuRecordLike): CreativeAIAnalysis {
  return {
    creativeId: readText(raw, aiAnalysisFields.creativeId),
    videoType: optionalText(raw, aiAnalysisFields.videoType),
    hookType: optionalText(raw, aiAnalysisFields.hookType),
    first3sDescription: optionalText(raw, aiAnalysisFields.first3sDescription),
    hasHuman: optionalBoolean(raw, aiAnalysisFields.hasHuman),
    hasVoiceover: optionalBoolean(raw, aiAnalysisFields.hasVoiceover),
    hasSubtitles: optionalBoolean(raw, aiAnalysisFields.hasSubtitles),
    productFirstAppearSecond: optionalNumber(raw, aiAnalysisFields.productFirstAppearSecond),
    mainSellingPoints: readArray(raw, aiAnalysisFields.mainSellingPoints),
    scriptStructure: readArray(raw, aiAnalysisFields.scriptStructure),
    aiSummary: optionalText(raw, aiAnalysisFields.aiSummary),
    aiConfidence: optionalNumber(raw, aiAnalysisFields.aiConfidence),
  };
}

export function mapFeishuRecommendation(raw: FeishuRecommendationRecord | FeishuRecordLike): Recommendation {
  return {
    id: optionalText(raw, recommendationFields.id) || `${readText(raw, recommendationFields.date)}-${readText(raw, recommendationFields.objectId)}-${readText(raw, recommendationFields.recommendationType)}`,
    date: readText(raw, recommendationFields.date),
    recommendationType: readText(raw, recommendationFields.recommendationType),
    objectType: normalizeObjectType(getFieldValue(raw, recommendationFields.objectType)),
    objectId: readText(raw, recommendationFields.objectId),
    objectName: readText(raw, recommendationFields.objectName),
    priority: normalizePriority(getFieldValue(raw, recommendationFields.priority)),
    problemDescription: readText(raw, recommendationFields.problemDescription),
    keyMetrics: readText(raw, recommendationFields.keyMetrics),
    suggestedAction: readText(raw, recommendationFields.suggestedAction),
    reasoningSummary: optionalText(raw, recommendationFields.reasoningSummary),
    confidence: optionalNumber(raw, recommendationFields.confidence),
    status: normalizeStatus(getFieldValue(raw, recommendationFields.status)),
    generatedAt: readText(raw, recommendationFields.generatedAt),
  };
}

export function readText(raw: FeishuRecordLike | FeishuAdDailyRecord | FeishuCreativeRecord | FeishuAdCreativeRelationRecord | FeishuAIAnalysisRecord | FeishuRecommendationRecord, fieldName: string): string {
  const values = flattenValue(getFieldValue(raw, fieldName));
  return values.length > 0 ? values.join(' ').trim() : '';
}

export function readNumber(raw: FeishuRecordLike | FeishuAdDailyRecord | FeishuCreativeRecord | FeishuAdCreativeRelationRecord | FeishuAIAnalysisRecord | FeishuRecommendationRecord, fieldName: string): number {
  const value = getFieldValue(raw, fieldName);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') return parseNumber(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  const flattened = flattenValue(value);
  return parseNumber(flattened[0] ?? '');
}

export function readDate(raw: FeishuRecordLike | FeishuAdDailyRecord | FeishuCreativeRecord | FeishuAdCreativeRelationRecord | FeishuAIAnalysisRecord | FeishuRecommendationRecord, fieldName: string): string {
  const value = getFieldValue(raw, fieldName);
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return formatDateKey(trimmed) || trimmed;
  }
  if (typeof value === 'number') {
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    return formatDateKey(ms);
  }
  const flattened = flattenValue(value);
  const first = flattened[0];
  if (!first) return '';
  return formatDateKey(first) || first;
}

export function readBoolean(raw: FeishuRecordLike | FeishuAdDailyRecord | FeishuCreativeRecord | FeishuAdCreativeRelationRecord | FeishuAIAnalysisRecord | FeishuRecommendationRecord, fieldName: string): boolean {
  return optionalBoolean(raw, fieldName) ?? false;
}

export function readArray(raw: FeishuRecordLike | FeishuAdDailyRecord | FeishuCreativeRecord | FeishuAdCreativeRelationRecord | FeishuAIAnalysisRecord | FeishuRecommendationRecord, fieldName: string): string[] {
  return flattenValue(getFieldValue(raw, fieldName)).filter((item) => item.length > 0);
}

function optionalText(raw: FeishuRecordLike | FeishuAdDailyRecord | FeishuCreativeRecord | FeishuAdCreativeRelationRecord | FeishuAIAnalysisRecord | FeishuRecommendationRecord, fieldName: string): string | undefined {
  const text = readText(raw, fieldName);
  return text || undefined;
}

function optionalLinkText(raw: FeishuRecordLike | FeishuAdDailyRecord | FeishuCreativeRecord | FeishuAdCreativeRelationRecord | FeishuAIAnalysisRecord | FeishuRecommendationRecord, fieldName: string): string | undefined {
  const text = readLinkText(getFieldValue(raw, fieldName));
  return text || undefined;
}

function optionalNumber(raw: FeishuRecordLike | FeishuAdDailyRecord | FeishuCreativeRecord | FeishuAdCreativeRelationRecord | FeishuAIAnalysisRecord | FeishuRecommendationRecord, fieldName: string): number | undefined {
  const value = getFieldValue(raw, fieldName);
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const flattened = flattenValue(value);
  if (flattened.length === 0) return undefined;
  const parsed = parseNumber(flattened[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalBoolean(raw: FeishuRecordLike | FeishuAdDailyRecord | FeishuCreativeRecord | FeishuAdCreativeRelationRecord | FeishuAIAnalysisRecord | FeishuRecommendationRecord, fieldName: string): boolean | undefined {
  const value = getFieldValue(raw, fieldName);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = readText(raw, fieldName).toLowerCase();
  if (!text) return undefined;
  if (['true', 'yes', '1', 'y', '是', '有'].includes(text)) return true;
  if (['false', 'no', '0', 'n', '否', '无'].includes(text)) return false;
  return undefined;
}

function normalizeCreativeType(value: unknown): CreativeType {
  const normalized = readLooseString(value).toLowerCase();
  if (normalized.includes('video') || normalized.includes('视频')) return 'video';
  if (normalized.includes('image') || normalized.includes('图文') || normalized.includes('图片') || normalized.includes('static')) return 'image';
  if (normalized.includes('dynamic') || normalized.includes('动态')) return 'dynamic';
  return 'unknown';
}

function inferCreativeType(value: unknown, media: { videoId?: string; videoUrl?: string; originalVideoFileUrl?: string; originalImageFileUrl?: string; imageUrl?: string }): CreativeType {
  const normalized = normalizeCreativeType(value);
  const hasVideoSource = Boolean(media.videoId || media.videoUrl || media.originalVideoFileUrl);
  const hasImageSource = Boolean(media.originalImageFileUrl || media.imageUrl);

  if (normalized === 'video' && !hasVideoSource && hasImageSource) return 'image';
  if (normalized !== 'unknown') return normalized;
  if (hasVideoSource) return 'video';
  if (hasImageSource) return 'image';
  return 'unknown';
}

function normalizeAIStatus(value: unknown): AIAnalysisStatus {
  const normalized = readLooseString(value);
  if (normalized === '待分析' || normalized === '分析中' || normalized === '已分析' || normalized === '失败' || normalized === '不适用' || normalized === '待人工复核') return normalized;
  return '未判断';
}

function normalizeObjectType(value: unknown): RecommendationObjectType {
  const normalized = readLooseString(value);
  if (normalized === 'Campaign' || normalized === 'Ad Set' || normalized === 'Ad' || normalized === 'Creative' || normalized === 'Audience' || normalized === 'Placement') return normalized;
  return 'Ad';
}

function normalizePriority(value: unknown): RecommendationPriority {
  const normalized = readLooseString(value);
  if (normalized === '高' || normalized === '中' || normalized === '低') return normalized;
  return '中';
}

function normalizeStatus(value: unknown): RecommendationStatus {
  const normalized = readLooseString(value);
  if (normalized === '待处理' || normalized === '已执行' || normalized === '已忽略' || normalized === '待复核') return normalized;
  return '待复核';
}

function readLooseString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  if (Array.isArray(value)) return value.map((item) => readLooseString(item)).filter(Boolean).join(' ').trim();
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const directKeys = ['text', 'name', 'label', 'title', 'value', 'url', 'link', 'href', 'id'];
    for (const key of directKeys) {
      const nested = record[key];
      if (nested !== null && nested !== undefined && nested !== '') {
        const text = readLooseString(nested);
        if (text) return text;
      }
    }
    if ('timestamp' in record && record.timestamp !== null && record.timestamp !== undefined) {
      return formatDateKey(record.timestamp as string | number | Date);
    }
    return '';
  }
  return '';
}

function readLinkText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = readLinkText(item);
      if (text) return text;
    }
    return '';
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const linkKeys = ['url', 'link', 'href'];
    for (const key of linkKeys) {
      const text = readLinkText(record[key]);
      if (text) return text;
    }

    const fallbackKeys = ['text', 'name', 'label', 'title', 'value'];
    for (const key of fallbackKeys) {
      const text = readLinkText(record[key]);
      if (text) return text;
    }

    for (const item of Object.values(record)) {
      const text = readLinkText(item);
      if (text) return text;
    }
  }
  return '';
}

function flattenValue(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];
    if (text.includes('\n')) return text.split('\n').map((item) => item.trim()).filter(Boolean);
    if (text.includes('、') || text.includes('|') || text.includes(',')) {
      return text
        .split(/[、|,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [text];
  }
  if (typeof value === 'number') return [String(value)];
  if (typeof value === 'boolean') return [value ? 'true' : 'false'];
  if (Array.isArray(value)) return value.flatMap((item) => flattenValue(item));
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferredKeys = ['text', 'name', 'label', 'title', 'value', 'url', 'link', 'href', 'id'];
    const collected: string[] = [];
    for (const key of preferredKeys) {
      if (key in record) collected.push(...flattenValue(record[key]));
    }
    if (collected.length > 0) return collected;
    if ('timestamp' in record && record.timestamp !== null && record.timestamp !== undefined) {
      return [formatDateKey(record.timestamp as string | number | Date)];
    }
    return Object.values(record).flatMap((item) => flattenValue(item));
  }
  return [String(value)];
}

function parseNumber(value: string): number {
  const parsed = Number(value.replace(/[$,%\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getFieldValue(raw: FeishuRecordLike | FeishuAdDailyRecord | FeishuCreativeRecord | FeishuAdCreativeRelationRecord | FeishuAIAnalysisRecord | FeishuRecommendationRecord, fieldName: string): unknown {
  const fields = getFieldRecord(raw);
  return fields[fieldName];
}

function getFieldRecord(raw: FeishuRecordLike | FeishuAdDailyRecord | FeishuCreativeRecord | FeishuAdCreativeRelationRecord | FeishuAIAnalysisRecord | FeishuRecommendationRecord): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const maybeRecord = raw as FeishuRecordLike;
  if ('fields' in maybeRecord && maybeRecord.fields && typeof maybeRecord.fields === 'object') {
    return maybeRecord.fields as Record<string, unknown>;
  }
  return raw as Record<string, unknown>;
}
