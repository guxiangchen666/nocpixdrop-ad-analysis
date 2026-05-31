'use client';

import { Button, Card, Input } from 'animal-island-ui';
import { FilterSelect } from '../common/FilterSelect';
import type { RecommendationFilters as RecommendationFiltersState } from '../../services/recommendationsService';
import type { RecommendationObjectType, RecommendationPriority, RecommendationStatus, RecommendationType } from '../../types/recommendations';

interface RecommendationFiltersProps {
  filters: RecommendationFiltersState;
  onChange: (filters: RecommendationFiltersState) => void;
  onReset: () => void;
}

const recommendationTypes: RecommendationType[] = ['加预算', '降预算', '暂停广告', '换素材', '素材疲劳', '素材洞察', '下批素材建议', '继续观察', '异常提醒'];
const objectTypes: RecommendationObjectType[] = ['Campaign', 'Ad Set', 'Ad', 'Creative', 'Audience', 'Placement'];
const priorities: RecommendationPriority[] = ['高', '中', '低'];
const statuses: RecommendationStatus[] = ['待处理', '已执行', '已忽略', '待复核'];

export function RecommendationFilters({ filters, onChange, onReset }: RecommendationFiltersProps) {
  return (
    <Card className="filters-card">
      <div className="filter-grid recommendation-filter-grid">
        <label>
          <span>Date</span>
          <Input type="date" value={filters.date || ''} onChange={(event) => onChange({ ...filters, date: event.target.value })} />
        </label>
        <label>
          <span>Recommendation Type</span>
          <FilterSelect value={filters.recommendationType || ''} onChange={(recommendationType) => onChange({ ...filters, recommendationType: recommendationType as RecommendationType | '' })} options={[{ key: '', label: 'All Types' }, ...recommendationTypes.map((item) => ({ key: item, label: item }))]} />
        </label>
        <label>
          <span>Object Type</span>
          <FilterSelect value={filters.objectType || ''} onChange={(objectType) => onChange({ ...filters, objectType: objectType as RecommendationObjectType | '' })} options={[{ key: '', label: 'All Objects' }, ...objectTypes.map((item) => ({ key: item, label: item }))]} />
        </label>
        <label>
          <span>Priority</span>
          <FilterSelect value={filters.priority || ''} onChange={(priority) => onChange({ ...filters, priority: priority as RecommendationPriority | '' })} options={[{ key: '', label: 'All Priority' }, ...priorities.map((item) => ({ key: item, label: item }))]} />
        </label>
        <label>
          <span>Status</span>
          <FilterSelect value={filters.status || ''} onChange={(status) => onChange({ ...filters, status: status as RecommendationStatus | '' })} options={[{ key: '', label: 'All Status' }, ...statuses.map((item) => ({ key: item, label: item }))]} />
        </label>
        <div className="filter-actions">
          <Button type="dashed" onClick={onReset}>Reset</Button>
        </div>
      </div>
    </Card>
  );
}
