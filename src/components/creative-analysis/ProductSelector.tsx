'use client';

import { Switch } from 'animal-island-ui';
import type { CreativeAnalysisRange, ProductOption } from '../../services/creativeAnalysisService';
import { FilterSelect } from '../common/FilterSelect';

interface ProductSelectorProps {
  products: ProductOption[];
  selectedSku: string;
  range: CreativeAnalysisRange;
  comparePrevious: boolean;
  onSkuChange: (sku: string) => void;
  onRangeChange: (range: CreativeAnalysisRange) => void;
  onCompareChange: (enabled: boolean) => void;
}

const ranges: Array<{ key: CreativeAnalysisRange; label: string }> = [
  { key: '7d', label: '7D' },
  { key: '14d', label: '14D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
];

export function ProductSelector({ products, selectedSku, range, comparePrevious, onSkuChange, onRangeChange, onCompareChange }: ProductSelectorProps) {
  const options = products.map((product) => ({
    key: product.sku,
    label: `${product.sku} · ${product.name}`,
  }));

  return (
    <section className="creative-analysis-controls" aria-label="Creative analysis controls">
      <label className="creative-control-field">
        <span>Product SKU</span>
        <FilterSelect options={options} value={selectedSku} placeholder="选择产品" disabled={products.length === 0} onChange={onSkuChange} />
      </label>

      <div className="creative-control-field">
        <span>Time Range</span>
        <div className="range-segmented creative-range-segmented" role="tablist" aria-label="Creative analysis range">
          {ranges.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={range === item.key}
              className={range === item.key ? 'active' : ''}
              onClick={() => onRangeChange(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <label className="creative-compare-switch">
        <span>对比上期</span>
        <Switch checked={comparePrevious} onChange={onCompareChange} />
      </label>
    </section>
  );
}
