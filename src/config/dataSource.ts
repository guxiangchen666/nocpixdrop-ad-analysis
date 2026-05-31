import 'server-only';

export type SourceMode = 'mock' | 'feishu';

export interface SourceModes {
  ads: SourceMode;
  creatives: SourceMode;
  relations: SourceMode;
  recommendations: SourceMode;
  aiAnalysis: SourceMode;
}

export const sourceModes: SourceModes = {
  ads: process.env.ADS_SOURCE === 'feishu' ? 'feishu' : 'mock',
  creatives: process.env.CREATIVES_SOURCE === 'feishu' ? 'feishu' : 'mock',
  relations: process.env.RELATIONS_SOURCE === 'feishu' ? 'feishu' : 'mock',
  recommendations: process.env.RECOMMENDATIONS_SOURCE === 'feishu' ? 'feishu' : 'mock',
  aiAnalysis: process.env.AI_ANALYSIS_SOURCE === 'feishu' ? 'feishu' : 'mock',
};

export function getSourceLabel(mode: SourceMode) {
  return mode === 'feishu' ? 'Feishu' : 'Mock';
}

export function getSourceTitle(key: keyof SourceModes) {
  if (key === 'ads') return 'Ads Source';
  if (key === 'creatives') return 'Creatives Source';
  if (key === 'relations') return 'Relations Source';
  if (key === 'recommendations') return 'Recommendations Source';
  return 'AI Analysis Source';
}

export function getSourceNotice(modes: SourceModes) {
  if (modes.ads === 'feishu' && modes.creatives === 'feishu' && modes.relations === 'feishu') {
    return '当前广告和素材数据来自飞书，关联表如暂时为空将自动使用 Ad ID fallback。';
  }
  if (modes.relations === 'feishu') {
    return 'Relations table connected, no relation records yet will fall back to Ad ID join.';
  }
  return 'Mock data mode';
}
