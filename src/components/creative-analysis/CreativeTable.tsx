'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { CreativeAnalysisItem } from '../../services/creativeAnalysisService';
import { money, number, percent, roas } from '../../utils/format';

interface CreativeTableProps {
  creatives: CreativeAnalysisItem[];
  selectedCreativeId?: string;
  onCreativeSelect: (creative: CreativeAnalysisItem) => void;
}

type SortKey = keyof Pick<CreativeAnalysisItem, 'name' | 'type' | 'spend' | 'purchase' | 'roas' | 'ctr' | 'cpa' | 'frequency' | 'daysSinceLaunch' | 'effectiveStatus'>;
type SortDirection = 'asc' | 'desc';

interface Column {
  key: SortKey | 'thumbnail' | 'action';
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right';
  render: (creative: CreativeAnalysisItem) => ReactNode;
}

export function CreativeTable({ creatives, selectedCreativeId, onCreativeSelect }: CreativeTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('roas');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedCreatives = useMemo(() => {
    return [...creatives].sort((a, b) => compareCreative(a, b, sortKey, sortDirection));
  }, [creatives, sortDirection, sortKey]);

  const columns: Column[] = [
    { key: 'thumbnail', label: '缩略图', render: (creative) => <img className="creative-analysis-thumb" src={creative.thumbnail} alt={creative.name} /> },
    { key: 'name', label: '素材名', sortable: true, render: (creative) => <strong>{creative.name}</strong> },
    { key: 'type', label: '类型', sortable: true, render: (creative) => <span className={`type-pill ${creative.type}`}>{creative.type}</span> },
    { key: 'spend', label: 'Spend', sortable: true, align: 'right', render: (creative) => money(creative.spend) },
    { key: 'purchase', label: 'Purchase', sortable: true, align: 'right', render: (creative) => number(creative.purchase, 0) },
    { key: 'roas', label: 'ROAS', sortable: true, align: 'right', render: (creative) => roas(creative.roas) },
    { key: 'ctr', label: 'CTR', sortable: true, align: 'right', render: (creative) => percent(creative.ctr) },
    { key: 'cpa', label: 'CPA', sortable: true, align: 'right', render: (creative) => money(creative.cpa, 2) },
    { key: 'frequency', label: 'Frequency', sortable: true, align: 'right', render: (creative) => (creative.frequency === undefined ? '-' : number(creative.frequency, 2)) },
    { key: 'daysSinceLaunch', label: '上线天数', sortable: true, align: 'right', render: (creative) => `${creative.daysSinceLaunch} 天` },
    { key: 'effectiveStatus', label: 'Effective Status', sortable: true, render: (creative) => <span className={`creative-status ${(creative.effectiveStatus || 'unknown').toLowerCase()}`}>{creative.effectiveStatus || '-'}</span> },
    {
      key: 'action',
      label: 'Action',
      render: (creative) => (
        <button
          type="button"
          className="creative-table-action"
          onClick={(event) => {
            event.stopPropagation();
            onCreativeSelect(creative);
          }}
        >
          View
        </button>
      ),
    },
  ];

  const handleSort = (column: Column) => {
    if (!column.sortable || column.key === 'thumbnail' || column.key === 'action') return;
    const nextKey = column.key;
    if (nextKey === sortKey) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(nextKey);
      setSortDirection('desc');
    }
  };

  return (
    <section className="creative-table-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Creative List</p>
          <h2>素材列表</h2>
        </div>
        <span className="soft-tag">{creatives.length} rows</span>
      </div>

      <div className="creative-analysis-table-scroll">
        <table className="creative-analysis-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.align === 'right' ? 'align-right' : undefined}>
                  {column.sortable ? (
                    <button type="button" onClick={() => handleSort(column)}>
                      {column.label}
                      <span>{sortKey === column.key ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedCreatives.map((creative) => (
              <tr
                key={creative.creativeId}
                className={selectedCreativeId === creative.creativeId ? 'selected' : undefined}
                tabIndex={0}
                onClick={() => onCreativeSelect(creative)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onCreativeSelect(creative);
                  }
                }}
              >
                {columns.map((column) => (
                  <td key={column.key} className={column.align === 'right' ? 'align-right' : undefined}>
                    {column.render(creative)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function compareCreative(a: CreativeAnalysisItem, b: CreativeAnalysisItem, sortKey: SortKey, direction: SortDirection) {
  const aValue = a[sortKey];
  const bValue = b[sortKey];
  const modifier = direction === 'asc' ? 1 : -1;

  if (typeof aValue === 'number' && typeof bValue === 'number') return (aValue - bValue) * modifier;
  return String(aValue).localeCompare(String(bValue)) * modifier;
}
