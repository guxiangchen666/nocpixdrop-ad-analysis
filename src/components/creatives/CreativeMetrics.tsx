import type { CreativePerformance } from '../../types/creatives';
import { money, percent, roas } from '../../utils/format';

export function CreativeMetrics({ performance }: { performance?: CreativePerformance }) {
  if (!performance) {
    return <div className="metric-strip muted">No performance data yet</div>;
  }

  return (
    <div className="metric-strip">
      <span>ROAS 7D <strong>{roas(performance.roas7d)}</strong></span>
      <span>CPA 7D <strong>{money(performance.cpa7d, 2)}</strong></span>
      <span>Spend 7D <strong>{money(performance.spend7d)}</strong></span>
      <span>Purchase 7D <strong>{performance.purchase7d}</strong></span>
      <span>CTR 7D <strong>{percent(performance.ctr7d)}</strong></span>
    </div>
  );
}
