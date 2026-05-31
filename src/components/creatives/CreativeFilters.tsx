'use client';

import { Button, Card } from 'animal-island-ui';
import { DateRangePicker } from '../common/DateRangePicker';
import { FilterSelect } from '../common/FilterSelect';
import type { CreativeFilters as CreativeFiltersState } from '../../services/creativesService';
import type { AIAnalysisStatus, CreativeType } from '../../types/creatives';
import { buildDateRangePresets } from '../../utils/dateRangePresets';

interface CreativeFiltersProps {
  filters: CreativeFiltersState;
  products: string[];
  materialTypes: string[];
  minDate: string;
  maxDate: string;
  onChange: (filters: CreativeFiltersState) => void;
  onReset: () => void;
}

const creativeTypes: CreativeType[] = ['video', 'image', 'dynamic', 'unknown'];
const analysisStatuses: AIAnalysisStatus[] = ['待分析', '分析中', '已分析', '失败', '不适用', '待人工复核'];
const creativeDatePresets = buildDateRangePresets(['7d', '14d', '30d', 'thisMonth']);

export function CreativeFilters({ filters, products, materialTypes, minDate, maxDate, onChange, onReset }: CreativeFiltersProps) {
  const dateLabel = filters.dateFrom && filters.dateTo
    ? `${filters.dateFrom} 至 ${filters.dateTo}`
    : '最近 30 天';
  const hasDateBounds = Boolean(minDate && maxDate);

  return (
    <Card className="filters-card">
      <div className="filter-grid creative-filter-grid">
        <label className="date-filter-field">
          <span>Date Range</span>
          {hasDateBounds ? (
            <DateRangePicker
              value={{ dateFrom: filters.dateFrom, dateTo: filters.dateTo }}
              minDate={minDate}
              maxDate={maxDate}
              triggerLabel={dateLabel}
              presets={creativeDatePresets}
              selectedPresetKey={filters.datePreset}
              align="left"
              onChange={(range, datePreset) => onChange({ ...filters, dateFrom: range.dateFrom, dateTo: range.dateTo, datePreset })}
            />
          ) : (
            <Button disabled>暂无日期</Button>
          )}
        </label>
        <label>
          <span>Creative Type</span>
          <FilterSelect value={filters.creativeType || ''} onChange={(creativeType) => onChange({ ...filters, creativeType: creativeType as CreativeType | '' })} options={[{ key: '', label: 'All Types' }, ...creativeTypes.map((item) => ({ key: item, label: item }))]} />
        </label>
        <label>
          <span>AI Analysis Status</span>
          <FilterSelect value={filters.aiAnalysisStatus || ''} onChange={(aiAnalysisStatus) => onChange({ ...filters, aiAnalysisStatus: aiAnalysisStatus as AIAnalysisStatus | '' })} options={[{ key: '', label: 'All Status' }, ...analysisStatuses.map((item) => ({ key: item, label: item }))]} />
        </label>
        <label>
          <span>Product</span>
          <FilterSelect value={filters.product || ''} onChange={(product) => onChange({ ...filters, product })} options={[{ key: '', label: 'All Products' }, ...products.map((item) => ({ key: item, label: item }))]} />
        </label>
        <label>
          <span>Material Type</span>
          <FilterSelect value={filters.materialType || ''} onChange={(materialType) => onChange({ ...filters, materialType })} options={[{ key: '', label: 'All Materials' }, ...materialTypes.map((item) => ({ key: item, label: item }))]} />
        </label>
        <label>
          <span>Sort By</span>
          <FilterSelect
            value={filters.sortBy || ''}
            onChange={(sortBy) => onChange({ ...filters, sortBy: sortBy as CreativeFiltersState['sortBy'] })}
            options={[
              { key: '', label: 'Default' },
              { key: 'spend', label: 'Spend' },
              { key: 'purchase', label: 'Purchase' },
            ]}
          />
        </label>
        <label>
          <span>Sort Direction</span>
          <FilterSelect
            value={filters.sortDirection || 'desc'}
            onChange={(sortDirection) => onChange({ ...filters, sortDirection: sortDirection as CreativeFiltersState['sortDirection'] })}
            options={[
              { key: 'desc', label: 'High to Low' },
              { key: 'asc', label: 'Low to High' },
            ]}
          />
        </label>
        <div className="filter-actions">
          <Button type="dashed" onClick={onReset}>Reset</Button>
        </div>
      </div>
    </Card>
  );
}
