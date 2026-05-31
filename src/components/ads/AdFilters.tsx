'use client';

import { Button, Card, Input } from 'animal-island-ui';
import { DateRangePicker } from '../common/DateRangePicker';
import { FilterSelect } from '../common/FilterSelect';
import type { AdsFilters } from '../../services/adsService';
import { buildDateRangePresets } from '../../utils/dateRangePresets';

interface AdFiltersProps {
  filters: AdsFilters;
  campaigns: string[];
  products: string[];
  statuses: string[];
  minDate: string;
  maxDate: string;
  onChange: (filters: AdsFilters) => void;
  onReset: () => void;
}

const adsDatePresets = buildDateRangePresets(['today', 'yesterday', '7d', '14d', '28d', '30d', 'thisMonth']);

export function AdFilters({ filters, campaigns, products, statuses, minDate, maxDate, onChange, onReset }: AdFiltersProps) {
  const dateLabel = filters.dateFrom && filters.dateTo
    ? `${filters.dateFrom} 至 ${filters.dateTo}`
    : '全部日期';

  return (
    <Card className="filters-card">
      <div className="filter-grid ads-filter-grid">
        <label className="date-filter-field">
          <span>Date Range</span>
          <DateRangePicker
            value={{ dateFrom: filters.dateFrom, dateTo: filters.dateTo }}
            minDate={minDate}
            maxDate={maxDate}
            triggerLabel={dateLabel}
            presets={adsDatePresets}
            align="left"
            onChange={(range) => onChange({ ...filters, dateFrom: range.dateFrom, dateTo: range.dateTo })}
          />
        </label>
        <label>
          <span>Campaign</span>
          <FilterSelect value={filters.campaign || ''} onChange={(campaign) => onChange({ ...filters, campaign })} options={[{ key: '', label: 'All Campaigns' }, ...campaigns.map((item) => ({ key: item, label: item }))]} />
        </label>
        <label>
          <span>Product</span>
          <FilterSelect value={filters.product || ''} onChange={(product) => onChange({ ...filters, product })} options={[{ key: '', label: 'All Products' }, ...products.map((item) => ({ key: item, label: item }))]} />
        </label>
        <label>
          <span>Status</span>
          <FilterSelect value={filters.status || ''} onChange={(status) => onChange({ ...filters, status })} options={[{ key: '', label: 'All Status' }, ...statuses.map((item) => ({ key: item, label: item }))]} />
        </label>
        <label>
          <span>Min ROAS</span>
          <Input type="number" min="0" placeholder="e.g. 3" value={filters.minRoas ?? ''} onChange={(event) => onChange({ ...filters, minRoas: event.target.value ? Number(event.target.value) : undefined })} />
        </label>
        <label>
          <span>Max CPA</span>
          <Input type="number" min="0" placeholder="e.g. 20" value={filters.maxCpa ?? ''} onChange={(event) => onChange({ ...filters, maxCpa: event.target.value ? Number(event.target.value) : undefined })} />
        </label>
        <div className="filter-actions">
          <Button type="dashed" onClick={onReset}>Reset</Button>
        </div>
      </div>
    </Card>
  );
}
