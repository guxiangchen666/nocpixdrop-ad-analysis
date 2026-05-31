import type { CreativeAssetGroup } from '../../types/creatives';
import { CreativeCard } from './CreativeCard';

interface CreativeGridProps {
  groups: CreativeAssetGroup[];
  metricLabel: string;
}

export function CreativeGrid({ groups, metricLabel }: CreativeGridProps) {
  return (
    <div className="creative-grid">
      {groups.map((group) => (
        <CreativeCard key={group.assetGroupKey} group={group} metricLabel={metricLabel} />
      ))}
    </div>
  );
}
