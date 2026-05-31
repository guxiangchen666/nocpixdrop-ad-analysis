import type { InsightGroupSet } from '../services/creativeAnalysisService';

export function generateGroupInsight(
  dimensionName: string,
  groups: InsightGroupSet['groups'],
  options: { higherIsBetter?: boolean } = {},
): { insight: string; suggestion: string; sampleEnough: boolean } {
  const sampleSize = groups.reduce((total, group) => total + group.count, 0);
  if (sampleSize < 8 || groups.length === 0) {
    return {
      insight: '样本不足，暂不生成结论',
      suggestion: '继续积累素材数据后再判断',
      sampleEnough: false,
    };
  }

  const higherIsBetter = options.higherIsBetter ?? true;
  const sorted = [...groups].sort((a, b) => (higherIsBetter ? b.roas - a.roas : a.roas - b.roas));
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const lift = worst.roas > 0 ? `，约为 ${worst.label} 的 ${(best.roas / worst.roas).toFixed(1)} 倍` : '';

  return {
    insight: `${best.label} 的 ROAS ${best.roas.toFixed(1)}x，高于 ${worst.label}${lift}`,
    suggestion: buildSuggestion(dimensionName, best.label),
    sampleEnough: true,
  };
}

function buildSuggestion(dimensionName: string, bestLabel: string) {
  if (dimensionName === 'Format') return `下批素材形式建议优先保持 ${bestLabel} 占比`;
  if (dimensionName === 'Material Type') return `继续复用 ${bestLabel} 等高效素材类型，低效类型减少制作占比`;
  if (dimensionName === 'CTA') return `优先使用 ${bestLabel} 等高 ROAS CTA`;
  if (dimensionName === 'Keywords') return `Headline 建议强化 ${bestLabel} 等高效关键词`;
  if (dimensionName === 'Lifecycle') return '根据衰减点安排素材上新和替换节奏';
  if (dimensionName === 'Audience') return `优先在 ${bestLabel} 等高效受众上测试新素材`;
  return `下批素材建议优先测试 ${bestLabel} 方向`;
}
