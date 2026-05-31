import { Card } from 'animal-island-ui';
import type { DashboardMetric } from '../../types/dashboard';

const toneClass: Record<DashboardMetric['tone'], string> = {
  blue: 'metric-blue',
  green: 'metric-green',
  yellow: 'metric-yellow',
  orange: 'metric-orange',
  red: 'metric-red',
  default: 'metric-default',
};

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <Card className={`metric-card ${toneClass[metric.tone]}`}>
      <span>{metric.label}</span>
      <strong>{metric.value}</strong>
      <small>{metric.helper}</small>
    </Card>
  );
}
