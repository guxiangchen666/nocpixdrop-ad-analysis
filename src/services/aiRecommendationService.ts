import { featureFlags } from '../config/featureFlags';
import type { AiCreativeRecommendation, AiRecommendationResponse, CreativeBrief } from '../types/aiRecommendations';
import type { CreativeAnalysisDataset, CreativeAnalysisItem, CreativeAnalysisRange, CreativeInsightsDataset, InsightGroup } from './creativeAnalysisService';

type RecommendationParams = {
  productSku: string;
  range: CreativeAnalysisRange;
  dataset: CreativeAnalysisDataset;
  insights: CreativeInsightsDataset;
  forceRefresh?: boolean;
};

type BriefParams = {
  recommendation: AiCreativeRecommendation;
  dataset: CreativeAnalysisDataset;
  insights: CreativeInsightsDataset;
};

type AiRecommendationRequest = {
  productSku: string;
  productName: string;
  range: string;
  accountAvgRoas: number;
  insights: CreativeInsightsDataset;
  topCreatives: CreativeAnalysisItem[];
  bottomCreatives: CreativeAnalysisItem[];
};

const cacheTtlMs = 24 * 60 * 60 * 1000;
const recommendationCache = new Map<string, { expiresAt: number; value: AiRecommendationResponse }>();

export async function getAiCreativeRecommendations(params: RecommendationParams): Promise<AiRecommendationResponse> {
  const cacheKey = buildCacheKey(params);
  const cached = recommendationCache.get(cacheKey);
  if (!params.forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let response: AiRecommendationResponse;
  if (featureFlags.useRealAiRecommendations) {
    response = await getRealAiRecommendations(params).catch(() => buildMockAiRecommendations(params, true));
  } else {
    response = buildMockAiRecommendations(params, false);
  }

  recommendationCache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, value: response });
  return response;
}

export function generateCreativeBrief({ recommendation, dataset, insights }: BriefParams): CreativeBrief {
  const referenceCreatives = (recommendation.referenceCreativeIds ?? [])
    .map((creativeId) => dataset.creatives.find((creative) => creative.creativeId === creativeId))
    .filter((creative): creative is CreativeAnalysisItem => Boolean(creative))
    .slice(0, 4)
    .map((creative) => ({
      creativeId: creative.creativeId,
      name: creative.name,
      thumbnail: creative.thumbnail,
      roas: creative.roas,
      cpa: creative.cpa,
    }));
  const bestFormat = getBestGroup(insights.format.groups)?.label ?? 'video';
  const bestCta = getBestGroup(insights.cta.groups)?.label ?? 'SHOP_NOW';
  const headlineKeywords = insights.headlineKeywords.groups.slice(0, 5).map((group) => group.word);
  const exampleHeadline = buildExampleHeadline(headlineKeywords, dataset.productName);
  const targetRoas = getBestGroup([...insights.format.groups, ...insights.materialType.groups, ...insights.cta.groups])?.roas;
  const generatedAt = new Date().toISOString();

  const brief: Omit<CreativeBrief, 'markdown'> = {
    id: `brief-${recommendation.id}-${Date.now()}`,
    productSku: dataset.productSku,
    productName: dataset.productName,
    recommendationTitle: recommendation.title,
    recommendationContent: recommendation.content,
    referenceCreatives,
    format: normalizeFormat(bestFormat),
    duration: bestFormat === 'image' ? 'Static image / carousel' : '15-30 seconds',
    aspectRatio: ['9:16（Reels / Stories）', '1:1（Feed）'],
    subtitles: '英文字幕；如有目标市场，增加对应语言版本',
    cta: bestCta,
    headlineKeywords,
    exampleHeadline,
    targetRoas,
    confidence: recommendation.confidence,
    generatedAt,
  };

  return { ...brief, markdown: buildBriefMarkdown(brief, dataset.range) };
}

async function getRealAiRecommendations(params: RecommendationParams): Promise<AiRecommendationResponse> {
  const payload = buildRealAiPayload(params);
  // 真实 LLM 调用需要后端代理，不能在前端暴露 API key。Vite 纯前端第一版仅预留内部 API 入口。
  // 后端 Prompt 需强调：只基于聚合数据，不虚构；输出结构化 JSON；建议具体到运营/剪辑可执行；
  // 不使用 raw Feishu 中文字段；不输出超长泛泛建议。
  const response = await fetch('/api/creatives/ai-recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('AI recommendation API unavailable');
  }

  return response.json() as Promise<AiRecommendationResponse>;
}

function buildRealAiPayload({ productSku, range, dataset, insights }: RecommendationParams): AiRecommendationRequest {
  return {
    productSku,
    productName: dataset.productName,
    range,
    accountAvgRoas: dataset.accountAvgRoas,
    insights,
    topCreatives: getTopCreatives(dataset.creatives, 8),
    bottomCreatives: getBottomCreatives(dataset.creatives, 8),
  };
}

function buildMockAiRecommendations(params: RecommendationParams, realAiFailed: boolean): AiRecommendationResponse {
  const { dataset, insights, range } = params;
  const variant = params.forceRefresh ? Math.floor(Date.now() / 1000) % 3 : 0;
  const recommended = buildRecommendedDirections(dataset, insights, variant);
  const avoid = buildAvoidDirections(dataset, insights);
  const experiment = buildExperimentDirections(dataset, insights, variant);

  return {
    productSku: dataset.productSku,
    productName: dataset.productName,
    range,
    recommended,
    avoid,
    experiment,
    generatedAt: new Date().toISOString(),
    model: realAiFailed ? 'mock-ai-fallback' : 'mock-ai-rules-v1',
    mode: 'mock-ai',
  };
}

function buildRecommendedDirections(dataset: CreativeAnalysisDataset, insights: CreativeInsightsDataset, variant: number): AiCreativeRecommendation[] {
  const bestFormat = getBestGroup(insights.format.groups);
  const bestMaterial = getBestGroup(insights.materialType.groups);
  const bestCta = getBestGroup(insights.cta.groups);
  const keywords = insights.headlineKeywords.groups.slice(0, 4).map((group) => group.word);

  const firstTitle = bestMaterial?.label
    ? `复制高 ROAS ${bestMaterial.label} 素材公式`
    : `复制高 ROAS ${bestFormat?.label ?? 'video'} 素材公式`;
  const secondTitle = keywords.length > 0 ? `强化 ${keywords.slice(0, 2).join(' / ')} 关键词卖点` : `强化高转化卖点组合`;

  return [
    {
      id: `rec-format-${dataset.productSku}-${dataset.range}-${variant}`,
      category: 'recommended',
      title: firstTitle,
      content: [
        `- 素材形式优先使用 ${bestFormat?.label ?? 'video'}，当前 ROAS ${formatRoas(bestFormat?.roas)}，样本 ${bestFormat?.count ?? dataset.totalCreatives} 条。`,
        `- 方向上继续复用 ${bestMaterial?.label ?? '高 ROAS'}，以产品实测、夜间成像和清晰对比为主线。`,
        `- CTA 优先使用 ${bestCta?.label ?? 'SHOP_NOW'}，当前 ROAS ${formatRoas(bestCta?.roas)}，CPA ${formatMoney(bestCta?.cpa)}。`,
        `- 预期目标：新素材测试期 ROAS 不低于账户均值 ${formatRoas(dataset.accountAvgRoas)}，CTR 保持在高效组附近。`,
      ].join('\n'),
      confidence: getConfidence(dataset.totalCreatives, bestFormat, dataset.accountAvgRoas),
      referenceCreativeIds: pickReferenceCreatives(dataset.creatives, (creative) => creative.type === bestFormat?.label || creative.materialType === bestMaterial?.label, 'top'),
    },
    {
      id: `rec-keyword-${dataset.productSku}-${dataset.range}-${variant}`,
      category: 'recommended',
      title: secondTitle,
      content: [
        `- Headline 优先测试 ${keywords.length > 0 ? keywords.join(', ') : 'thermal, night, clarity'} 等关键词，避免泛泛描述。`,
        `- 首屏 Hook 建议突出可视化场景：夜间成像、产品实测、远距离识别或 Thermal sight 对比。`,
        `- 文案结构使用“场景问题 → 画面证明 → 产品结果 → ${bestCta?.label ?? 'SHOP_NOW'}”。`,
        `- 当前样本 ${dataset.totalCreatives} 条，关键词洞察基于包含该词的素材汇总 ROAS 和 CTR。`,
      ].join('\n'),
      confidence: getConfidence(dataset.totalCreatives, bestMaterial, dataset.accountAvgRoas),
      referenceCreativeIds: pickReferenceCreatives(dataset.creatives, (creative) => keywords.some((word) => creative.headline?.toLowerCase().includes(word)), 'top'),
    },
  ];
}

function buildAvoidDirections(dataset: CreativeAnalysisDataset, insights: CreativeInsightsDataset): AiCreativeRecommendation[] {
  const weakMaterial = getWeakGroup(insights.materialType.groups, dataset.accountAvgRoas);
  const dragCreatives = dataset.creatives
    .filter((creative) => creative.spend >= dataset.spendMedian && creative.roas < dataset.accountAvgRoas)
    .sort((a, b) => b.spend - a.spend);
  const weakCta = getWeakGroup(insights.cta.groups, dataset.accountAvgRoas);

  return [
    {
      id: `avoid-${dataset.productSku}-${dataset.range}`,
      category: 'avoid',
      title: weakMaterial ? `减少低转化 ${weakMaterial.label} 素材占比` : '减少拖累象限素材预算',
      content: [
        `- ${weakMaterial?.label ?? '拖累象限'} 当前 ROAS ${formatRoas(weakMaterial?.roas)}，低于账户均值 ${formatRoas(dataset.accountAvgRoas)}。`,
        `- 高 spend 低 ROAS 素材共 ${dragCreatives.length} 条，容易吃掉预算但不能稳定带来 Purchase。`,
        `- ${weakCta ? `CTA ${weakCta.label} 表现偏弱，CPA ${formatMoney(weakCta.cpa)}。` : '低 CTR 且 CPA 高的素材暂不建议继续扩量。'}`,
        `- 建议先降预算或暂停，再把剪辑资源转向推荐方向。`,
      ].join('\n'),
      confidence: getConfidence(dataset.totalCreatives, weakMaterial, dataset.accountAvgRoas),
      referenceCreativeIds: dragCreatives.slice(0, 4).map((creative) => creative.creativeId),
    },
  ];
}

function buildExperimentDirections(dataset: CreativeAnalysisDataset, insights: CreativeInsightsDataset, variant: number): AiCreativeRecommendation[] {
  const smallSampleWinner = [...insights.materialType.groups, ...insights.audience.groups]
    .filter((group) => group.count > 0 && group.count <= 3 && group.roas >= dataset.accountAvgRoas)
    .sort((a, b) => b.roas - a.roas)[0];
  const ctrWinner = dataset.creatives
    .filter((creative) => creative.spend < dataset.spendMedian && creative.ctr > 0)
    .sort((a, b) => b.ctr - a.ctr)[0];

  const title = smallSampleWinner
    ? `小预算验证 ${smallSampleWinner.label} 方向`
    : ctrWinner?.hookType
      ? `小预算测试 ${ctrWinner.hookType} Hook`
      : '小预算测试真人口播 + 夜间成像 Hook';

  return [
    {
      id: `exp-${dataset.productSku}-${dataset.range}-${variant}`,
      category: 'experiment',
      title,
      content: [
        `- ${smallSampleWinner ? `${smallSampleWinner.label} 样本 ${smallSampleWinner.count} 条但 ROAS ${formatRoas(smallSampleWinner.roas)}` : `低 spend 高 CTR 素材显示仍有探索空间` }，建议小预算继续验证。`,
        `- 测试素材可组合真人介绍、夜间成像、产品实测三个元素，首 3 秒直接展示成像差异。`,
        `- 每个方向先做 2-3 条变体，统一落地页和 CTA，减少变量干扰。`,
        `- 达到账户均值 ROAS ${formatRoas(dataset.accountAvgRoas)} 后再进入扩量池。`,
      ].join('\n'),
      confidence: Math.min(78, Math.max(45, getConfidence(dataset.totalCreatives, smallSampleWinner, dataset.accountAvgRoas) - 8)),
      referenceCreativeIds: ctrWinner ? [ctrWinner.creativeId] : pickReferenceCreatives(dataset.creatives, () => true, 'top').slice(0, 2),
    },
  ];
}

function buildBriefMarkdown(brief: Omit<CreativeBrief, 'markdown'>, range: CreativeAnalysisRange) {
  const referenceLines = brief.referenceCreatives.length > 0
    ? brief.referenceCreatives.map((creative) => `- ${creative.name} (${creative.creativeId}) · ROAS ${formatRoas(creative.roas)} · CPA ${formatMoney(creative.cpa)}`).join('\n')
    : '- 暂无明确参考素材，按推荐方向制作新变体';

  return `# 素材制作 Brief

## 产品
${brief.productName} (${brief.productSku})

## 推荐方向
${brief.recommendationContent}

## 参考素材
${referenceLines}

## 技术规格
- 形式：${brief.format}
- 时长：${brief.duration}
- 比例：${brief.aspectRatio.join(' + ')}
- 字幕：${brief.subtitles}

## CTA
${brief.cta}

## 文案方向
- Headline 关键词：${brief.headlineKeywords.length > 0 ? brief.headlineKeywords.join(', ') : 'thermal, night, clarity'}
- 示例 Headline：${brief.exampleHeadline}

## 预期表现
- 目标 ROAS：${brief.targetRoas ? formatRoas(brief.targetRoas) : '不低于账户均值'}
- 置信度：${brief.confidence}%

## 备注
生成于 ${brief.generatedAt}，基于近 ${range} 数据。`;
}

function buildCacheKey({ productSku, range, dataset, insights }: RecommendationParams) {
  return `${productSku}:${range}:${JSON.stringify(insights).length}:${dataset.totalCreatives}`;
}

function getBestGroup(groups: InsightGroup[]) {
  return groups.filter((group) => group.spend > 0).sort((a, b) => b.roas - a.roas)[0];
}

function getWeakGroup(groups: InsightGroup[], accountAvgRoas: number) {
  return groups
    .filter((group) => group.spend > 0 && group.roas < accountAvgRoas)
    .sort((a, b) => a.roas - b.roas || b.spend - a.spend)[0];
}

function pickReferenceCreatives(creatives: CreativeAnalysisItem[], predicate: (creative: CreativeAnalysisItem) => boolean, mode: 'top' | 'bottom') {
  const sorted = creatives
    .filter(predicate)
    .sort((a, b) => (mode === 'top' ? b.roas - a.roas || b.purchaseValue - a.purchaseValue : a.roas - b.roas || b.spend - a.spend))
    .slice(0, 4)
    .map((creative) => creative.creativeId);
  return sorted.length > 0 ? sorted : getTopCreatives(creatives, 4).map((creative) => creative.creativeId);
}

function getTopCreatives(creatives: CreativeAnalysisItem[], count: number) {
  return [...creatives].filter((creative) => creative.spend > 0).sort((a, b) => b.roas - a.roas || b.purchaseValue - a.purchaseValue).slice(0, count);
}

function getBottomCreatives(creatives: CreativeAnalysisItem[], count: number) {
  return [...creatives].filter((creative) => creative.spend > 0).sort((a, b) => a.roas - b.roas || b.spend - a.spend).slice(0, count);
}

function getConfidence(sampleSize: number, group: InsightGroup | undefined, accountAvgRoas: number) {
  const lift = group && accountAvgRoas > 0 ? group.roas / accountAvgRoas : 1;
  if (sampleSize >= 20 && lift >= 1.25) return 88;
  if (sampleSize >= 20) return 82;
  if (sampleSize >= 8 && lift >= 1.2) return 76;
  if (sampleSize >= 8) return 66;
  return 52;
}

function normalizeFormat(format: string) {
  if (format === 'video') return 'Video creative';
  if (format === 'image') return 'Static image / carousel';
  if (format === 'dynamic') return 'Dynamic creative';
  return format;
}

function buildExampleHeadline(words: string[], productName: string) {
  const primary = words[0] ?? 'night';
  const secondary = words[1] ?? 'thermal';
  return `${productName}: See More in ${capitalize(primary)} ${capitalize(secondary)}`;
}

function formatRoas(value?: number) {
  return `${(value ?? 0).toFixed(1)}x`;
}

function formatMoney(value?: number) {
  return `$${(value ?? 0).toFixed(2)}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
