import type { ReactNode } from 'react';
import type { CreativeAnalysisItem } from '../../services/creativeAnalysisService';
import { money, number, roas } from '../../utils/format';

interface KpiCardsProps {
  creatives: CreativeAnalysisItem[];
  accountAvgRoas: number;
  comparePrevious: boolean;
}

interface KpiItem {
  label: string;
  value: string;
  sub: ReactNode;
  tone: 'gold' | 'green' | 'sand' | 'red';
  delta?: number;
  tooltip?: string;
}

export function KpiCards({ creatives, accountAvgRoas, comparePrevious }: KpiCardsProps) {
  const videoCount = creatives.filter((creative) => creative.type === 'video').length;
  const imageCount = creatives.filter((creative) => creative.type === 'image').length;
  const dynamicCount = creatives.filter((creative) => creative.type === 'dynamic' || creative.type === 'unknown').length;
  const spend = sum(creatives.map((creative) => creative.spend));
  const purchaseValue = sum(creatives.map((creative) => creative.purchaseValue));
  const blendedRoas = spend > 0 ? purchaseValue / spend : 0;
  const topCount = creatives.filter((creative) => creative.roas > accountAvgRoas).length;
  const topHitRate = creatives.length > 0 ? (topCount / creatives.length) * 100 : 0;
  const averageLife = creatives.length > 0 ? sum(creatives.map((creative) => estimateDecayDays(creative, accountAvgRoas))) / creatives.length : 0;

  const items: KpiItem[] = [
    {
      label: '总素材数',
      value: String(creatives.length),
      sub: (
        <span className="creative-type-summary">
          <Dot tone="video" /> 视频 {videoCount}
          <Dot tone="image" /> 图片 {imageCount}
          <Dot tone="dynamic" /> 动态 {dynamicCount}
        </span>
      ),
      tone: 'gold',
      delta: 8,
    },
    {
      label: '累计花费 & ROAS',
      value: money(spend),
      sub: `ROAS ${roas(blendedRoas)}`,
      tone: 'green',
      delta: blendedRoas >= accountAvgRoas ? 12 : -7,
    },
    {
      label: 'Top 素材命中率',
      value: `${number(topHitRate, 0)}%`,
      sub: `${topCount} / ${creatives.length} 条达标`,
      tone: 'sand',
      delta: topHitRate >= 45 ? 9 : -6,
    },
    {
      label: '素材平均寿命',
      value: `${number(averageLife, 1)} 天`,
      sub: '从上线到 ROAS 跌破账户均值的平均天数',
      tone: 'red',
      delta: averageLife >= 18 ? 10 : -5,
      tooltip: '估算素材从上线后维持在账户平均 ROAS 以上的天数；一期使用当前 ROAS 与上线天数推算，接入日级历史后可替换为真实衰减点。',
    },
  ];

  return (
    <section className="creative-kpi-grid" aria-label="Creative analysis KPI">
      {items.map((item) => (
        <article key={item.label} className={`creative-kpi-card ${item.tone}`}>
          <div>
            <div className="creative-kpi-label">
              <span>{item.label}</span>
              {item.tooltip ? (
                <span className="creative-kpi-tooltip" tabIndex={0} aria-label={item.tooltip}>
                  ?
                  <span role="tooltip">{item.tooltip}</span>
                </span>
              ) : null}
            </div>
            <strong>{item.value}</strong>
          </div>
          <div className="creative-kpi-sub">
            <span>{item.sub}</span>
            {comparePrevious && item.delta !== undefined ? <Delta value={item.delta} /> : null}
          </div>
        </article>
      ))}
    </section>
  );
}

function Dot({ tone }: { tone: 'video' | 'image' | 'dynamic' }) {
  return <i className={`creative-type-dot ${tone}`} aria-hidden="true" />;
}

function Delta({ value }: { value: number }) {
  const positive = value >= 0;
  return <b className={`creative-delta ${positive ? 'positive' : 'negative'}`}>{positive ? '▲' : '▼'} {Math.abs(value)}%</b>;
}

function estimateDecayDays(creative: CreativeAnalysisItem, accountAvgRoas: number) {
  const daysSinceLaunch = creative.daysSinceLaunch ?? 1;
  if (creative.roas < accountAvgRoas) return Math.max(1, daysSinceLaunch * clamp(creative.roas / accountAvgRoas, 0.25, 0.95));
  return daysSinceLaunch * clamp(accountAvgRoas / creative.roas + 0.22, 0.55, 1.1);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
