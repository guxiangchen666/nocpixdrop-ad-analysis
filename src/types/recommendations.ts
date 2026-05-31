export type RecommendationObjectType = 'Campaign' | 'Ad Set' | 'Ad' | 'Creative' | 'Audience' | 'Placement';
export type RecommendationPriority = '高' | '中' | '低';
export type RecommendationStatus = '待处理' | '已执行' | '已忽略' | '待复核';

export type RecommendationType =
  | '加预算'
  | '降预算'
  | '暂停广告'
  | '换素材'
  | '素材疲劳'
  | '素材洞察'
  | '下批素材建议'
  | '继续观察'
  | '异常提醒';

export interface Recommendation {
  id: string;
  date: string;
  recommendationType: string;
  objectType: RecommendationObjectType;
  objectId: string;
  objectName: string;
  priority: RecommendationPriority;
  problemDescription: string;
  keyMetrics: string;
  suggestedAction: string;
  reasoningSummary?: string;
  confidence?: number;
  status: RecommendationStatus;
  generatedAt: string;
}
