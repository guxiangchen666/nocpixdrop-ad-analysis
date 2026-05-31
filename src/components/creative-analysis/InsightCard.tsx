'use client';

import type { ReactNode } from 'react';
import type { InsightGroupSet } from '../../services/creativeAnalysisService';
import { money, number, roas } from '../../utils/format';

interface InsightCardProps {
  title: string;
  subtitle: string;
  tone?: 'gold' | 'green' | 'sand' | 'red';
  insight: string;
  suggestion: string;
  sampleEnough: boolean;
  children: ReactNode;
}

interface GroupBarChartProps {
  groups: InsightGroupSet['groups'];
  metric?: 'roas' | 'ctr';
}

export function InsightCard({ title, subtitle, tone = 'gold', insight, suggestion, sampleEnough, children }: InsightCardProps) {
  return (
    <article className={`creative-insight-card ${tone} ${sampleEnough ? '' : 'empty'}`}>
      <header>
        <div>
          <p>{title}</p>
          <h3>{subtitle}</h3>
        </div>
        {!sampleEnough ? <span>样本不足</span> : null}
      </header>
      <div className="creative-insight-chart">{children}</div>
      <footer>
        <strong>{insight}</strong>
        <span>{suggestion}</span>
      </footer>
    </article>
  );
}

export function GroupBarChart({ groups, metric = 'roas' }: GroupBarChartProps) {
  const rows = groups.slice(0, 5);
  const maxValue = Math.max(...rows.map((group) => group[metric]), 0.01);

  return (
    <div className="insight-bar-list">
      {rows.map((group) => {
        const value = group[metric];
        return (
          <div key={group.label} className="insight-bar-row">
            <div>
              <strong>{group.label}</strong>
              <span>{group.count} items · {money(group.spend)}</span>
            </div>
            <div className="insight-bar-track">
              <i style={{ width: `${Math.max(6, (value / maxValue) * 100)}%` }} />
            </div>
            <b>{metric === 'roas' ? roas(value) : `${number(value, 1)}%`}</b>
          </div>
        );
      })}
    </div>
  );
}
