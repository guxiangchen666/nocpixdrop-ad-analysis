'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { CreativeAnalysisItem } from '../../services/creativeAnalysisService';
import type { CreativeType } from '../../types/creatives';
import { money, number, roas } from '../../utils/format';

interface CreativeMatrixProps {
  creatives: CreativeAnalysisItem[];
  accountAvgRoas: number;
  spendMedian: number;
  onCreativeSelect: (creative: CreativeAnalysisItem) => void;
}

interface BubbleShapeProps {
  cx?: number;
  cy?: number;
  payload?: CreativeAnalysisItem;
}

const typeColors: Record<CreativeType, string> = {
  video: '#c9a96a',
  image: '#4a7c6a',
  dynamic: '#a8895a',
  unknown: '#8d806e',
};

const typeLabels: Record<CreativeType, string> = {
  video: 'Video',
  image: 'Image',
  dynamic: 'Dynamic',
  unknown: 'Unknown',
};

export function CreativeMatrix({ creatives, accountAvgRoas, spendMedian, onCreativeSelect }: CreativeMatrixProps) {
  const [legendOpen, setLegendOpen] = useState(true);
  const maxSpend = Math.max(...creatives.map((creative) => creative.spend), spendMedian, 100);
  const maxRoas = Math.max(...creatives.map((creative) => creative.roas), accountAvgRoas, 1);
  const maxPurchase = Math.max(...creatives.map((creative) => creative.purchase), 1);
  const xMax = Math.ceil(maxSpend * 1.14);
  const yMax = Math.max(1, Math.ceil(maxRoas * 1.18));

  const byType = useMemo(
    () => ({
      video: creatives.filter((creative) => creative.type === 'video'),
      image: creatives.filter((creative) => creative.type === 'image'),
      dynamic: creatives.filter((creative) => creative.type === 'dynamic'),
      unknown: creatives.filter((creative) => creative.type === 'unknown'),
    }),
    [creatives],
  );

  const handlePointClick = (entry: unknown) => {
    const creative = readCreativeFromScatterEvent(entry);
    if (creative) onCreativeSelect(creative);
  };

  return (
    <section className="creative-matrix-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Creative Matrix</p>
          <h2>素材矩阵图</h2>
        </div>
        <div className="matrix-legend-shell">
          <button type="button" className="matrix-legend-toggle" onClick={() => setLegendOpen((open) => !open)}>
            图例 + 象限说明 {legendOpen ? '收起' : '展开'}
          </button>
          {legendOpen ? (
            <div className="matrix-legend-panel">
              <div className="matrix-type-legend">
                {(Object.keys(typeColors) as CreativeType[]).map((type) => (
                  <span key={type}><i style={{ background: typeColors[type] }} />{typeLabels[type]}</span>
                ))}
              </div>
              <div className="matrix-quadrants">
                <span>右上 明星：扩量</span>
                <span>左上 潜力：放大测试</span>
                <span>右下 拖累：淘汰</span>
                <span>左下 待测：小预算</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="creative-matrix-wrap">
        <ResponsiveContainer width="100%" height={480}>
          <ScatterChart margin={{ top: 24, right: 28, bottom: 22, left: 12 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(120, 102, 70, 0.14)" />
            <ReferenceArea x1={spendMedian} x2={xMax} y1={accountAvgRoas} y2={yMax} fill="rgba(74, 124, 106, 0.06)" strokeOpacity={0} />
            <ReferenceArea x1={0} x2={spendMedian} y1={accountAvgRoas} y2={yMax} fill="rgba(201, 169, 106, 0.06)" strokeOpacity={0} />
            <ReferenceArea x1={spendMedian} x2={xMax} y1={0} y2={accountAvgRoas} fill="rgba(180, 80, 80, 0.05)" strokeOpacity={0} />
            <ReferenceArea x1={0} x2={spendMedian} y1={0} y2={accountAvgRoas} fill="rgba(168, 137, 90, 0.04)" strokeOpacity={0} />
            <XAxis
              type="number"
              dataKey="spend"
              name="Spend"
              domain={[0, xMax]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${number(Number(value), 0)}`}
            />
            <YAxis
              type="number"
              dataKey="roas"
              name="ROAS"
              domain={[0, yMax]}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(value) => `${number(Number(value), 1)}x`}
            />
            <ReferenceLine x={spendMedian} stroke="#b8ad9b" strokeDasharray="5 5" />
            <ReferenceLine y={accountAvgRoas} stroke="#b8ad9b" strokeDasharray="5 5" />
            <Tooltip content={<CreativeTooltip />} cursor={{ stroke: 'rgba(75, 61, 43, 0.22)', strokeDasharray: '4 4' }} />
            {(Object.keys(typeColors) as CreativeType[]).map((type) => (
              <Scatter
                key={type}
                name={typeLabels[type]}
                data={byType[type]}
                fill={typeColors[type]}
                shape={(props: BubbleShapeProps) => renderBubble(props, maxPurchase)}
                onClick={handlePointClick}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function CreativeTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CreativeAnalysisItem }> }) {
  const creative = active ? payload?.[0]?.payload : undefined;
  if (!creative) return null;

  return (
    <div className="creative-matrix-tooltip">
      <img src={creative.thumbnail} alt={creative.name} />
      <div>
        <strong>{creative.name}</strong>
        <span>{money(creative.spend)} / {roas(creative.roas)} / {creative.purchase} purchases</span>
      </div>
    </div>
  );
}

function renderBubble(props: BubbleShapeProps, maxPurchase: number) {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload) return <circle cx={cx} cy={cy} r={8} fill="#c9a96a" />;

  const radius = 8 + (Math.sqrt(payload.purchase) / Math.sqrt(maxPurchase)) * 24;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={typeColors[payload.type]}
      fillOpacity={0.78}
      stroke="#fffdf6"
      strokeWidth={2}
      className="creative-bubble"
    />
  );
}

function readCreativeFromScatterEvent(entry: unknown): CreativeAnalysisItem | null {
  if (isCreative(entry)) return entry;
  if (typeof entry !== 'object' || entry === null) return null;
  const maybePayload = (entry as { payload?: unknown }).payload;
  return isCreative(maybePayload) ? maybePayload : null;
}

function isCreative(value: unknown): value is CreativeAnalysisItem {
  return typeof value === 'object' && value !== null && 'creativeId' in value && 'spend' in value && 'roas' in value;
}
