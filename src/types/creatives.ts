export type CreativeType = 'video' | 'image' | 'dynamic' | 'unknown';
export type AIAnalysisStatus = '待分析' | '分析中' | '已分析' | '失败' | '不适用' | '待人工复核' | '未判断';
export type FatigueSignal = '正常' | '轻微疲劳' | '明显疲劳' | '数据不足';

export interface CreativeRecord {
  creativeId: string;
  assetGroupKey?: string;
  adId?: string;
  adName?: string;
  campaignId?: string;
  adsetId?: string;
  creativeName: string;
  creativeType: CreativeType;
  videoId?: string;
  videoUrl?: string;
  originalVideoFileUrl?: string;
  originalImageFileUrl?: string;
  originalAssetAttachment?: string;
  assetSource?: string;
  manualAssetNote?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  primaryText?: string;
  headline?: string;
  description?: string;
  cta?: string;
  landingPageUrl?: string;
  product?: string;
  audience?: string;
  materialDirection?: string;
  materialName?: string;
  materialType?: string;
  materialBatch?: string;
  effectiveStatus?: string;
  configuredStatus?: string;
  adCreatedTime?: string;
  adUpdatedTime?: string;
  aiAnalysisStatus: AIAnalysisStatus;
  lastSyncedAt?: string;
}

export interface CreativePerformance {
  creativeId: string;
  spend3d: number;
  spend7d: number;
  spend14d: number;
  purchase3d: number;
  purchase7d: number;
  purchase14d: number;
  purchaseValue3d: number;
  purchaseValue7d: number;
  purchaseValue14d: number;
  roas3d: number;
  roas7d: number;
  roas14d: number;
  cpa3d: number;
  cpa7d: number;
  cpa14d: number;
  ctr3d: number;
  ctr7d: number;
  ctr14d: number;
  frequency7d?: number;
  fatigueSignal: FatigueSignal;
}

export type CreativeTrendRange = '7d' | '14d' | '30d';
export type CreativeSortBy = 'spend' | 'purchase';
export type CreativeSortDirection = 'asc' | 'desc';

export interface AssetMetricSummary {
  spend: number;
  purchase: number;
  purchaseValue: number;
  impressions: number;
  clicks: number;
  roas: number;
  cpa: number;
  ctr: number;
  cpc: number;
  cpm: number;
  isSampleInsufficient: boolean;
  sampleMessage?: string;
}

export interface CreativeListPerformance {
  creativeId: string;
  spend: number;
  purchase: number;
  purchaseValue: number;
  impressions: number;
  clicks: number;
  roas: number;
  cpa: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export interface CreativeAssetGroupRelatedAd {
  adId: string;
  adName: string;
  campaignName?: string;
  adsetName?: string;
  spend: number;
  purchase: number;
  roas: number;
  cpa: number;
  ctr: number;
}

export interface CreativeAssetGroup {
  assetGroupKey: string;
  representativeCreativeId: string;
  creativeIds: string[];
  adIds: string[];
  name: string;
  product?: string;
  audience?: string;
  creativeType?: CreativeType;
  materialType?: string;
  aiAnalysisStatus?: AIAnalysisStatus;
  previewUrl?: string;
  originalVideoFileUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  primaryText?: string;
  headline?: string;
  description?: string;
  cta?: string;
  landingPageUrl?: string;
  spend: number;
  purchase: number;
  purchaseValue: number;
  impressions: number;
  clicks: number;
  roas: number;
  cpa: number;
  ctr: number;
  cpc: number;
  cpm: number;
  isSampleInsufficient?: boolean;
  sampleMessage?: string;
  topAudience?: string;
  topCopy?: string;
  relatedAds: CreativeAssetGroupRelatedAd[];
}

export interface AssetRelatedAd extends AssetMetricSummary {
  adId: string;
  adName: string;
  campaignName?: string;
  adsetName?: string;
  creativeId?: string;
  audienceKey: string;
  copyKey: string;
  copyLabel: string;
}

export interface AssetDetail extends AssetMetricSummary {
  assetGroupKey: string;
  representativeCreativeId: string;
  creativeIds: string[];
  adIds: string[];
  creatives: CreativeRecord[];
  name: string;
  product?: string;
  audience?: string;
  creativeType?: CreativeType;
  materialType?: string;
  previewUrl?: string;
  videoId?: string;
  originalVideoFileUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  assetSource?: string;
  manualAssetNote?: string;
  primaryText?: string;
  headline?: string;
  description?: string;
  cta?: string;
  landingPageUrl?: string;
  topAudience?: string;
  topCopy?: string;
  relatedAds: AssetRelatedAd[];
}

export interface AssetBreakdownPerformance extends AssetMetricSummary {
  key: string;
  label: string;
  creativeIds: string[];
  adIds: string[];
}

export interface AssetAudienceCopyPerformance extends AssetMetricSummary {
  audienceKey: string;
  copyKey: string;
  copyLabel: string;
  creativeIds: string[];
  adIds: string[];
}

export interface AssetPeriodComparison {
  recent7d: AssetMetricSummary;
  previous7d: AssetMetricSummary;
  roasChangePct: number;
  cpaChangePct: number;
  ctrChangePct: number;
  trendSignal: '表现上升' | '表现稳定' | '表现下降' | '疲劳风险';
}

export interface CreativeTrendPoint {
  date: string;
  spend: number;
  purchase: number;
  purchaseValue: number;
  impressions: number;
  clicks: number;
  roas: number;
  cpa: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

export interface CreativeAIAnalysis {
  creativeId: string;
  videoType?: string;
  hookType?: string;
  first3sDescription?: string;
  hasHuman?: boolean;
  hasVoiceover?: boolean;
  hasSubtitles?: boolean;
  productFirstAppearSecond?: number;
  mainSellingPoints?: string[];
  scriptStructure?: string[];
  aiSummary?: string;
  aiConfidence?: number;
}
