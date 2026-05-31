'use client';

import { useMemo, useState } from 'react';
import { Button, Card, Table } from 'animal-island-ui';
import type { TableColumn } from 'animal-island-ui';
import type { AdDailyRecord } from '../../types/ads';
import type { CreativeRecord } from '../../types/creatives';
import { formatAudienceLabel } from '../../utils/audience';
import { money, percent, roas } from '../../utils/format';

interface AdsTableProps {
  ads: AdDailyRecord[];
  creativesById: Map<string, CreativeRecord>;
  selectedAdId?: string;
  onInspect: (ad: AdDailyRecord) => void;
}

type SortKey = 'spend' | 'purchase' | 'roas' | 'cpa' | 'cpc' | 'cpm' | 'ctr';
type SortDirection = 'asc' | 'desc' | 'default';
type SortState = {
  key: SortKey;
  direction: SortDirection;
} | null;
type AdTableRecord = Record<string, unknown> & { __ad: AdDailyRecord };

export function AdsTable({ ads, creativesById, selectedAdId, onInspect }: AdsTableProps) {
  const [sortState, setSortState] = useState<SortState>(null);

  const sortedAds = useMemo(() => {
    if (!sortState || sortState.direction === 'default') return ads;
    return [...ads].sort((a, b) => compareAds(a, b, sortState.key, sortState.direction));
  }, [ads, sortState]);
  const tableRows = useMemo(() => sortedAds.map(toAdTableRecord), [sortedAds]);

  const handleSort = (key: SortKey) => {
    setSortState((current) => {
      if (!current || current.key !== key) return { key, direction: 'desc' };
      if (current.direction === 'desc') return { key, direction: 'default' };
      if (current.direction === 'default') return { key, direction: 'asc' };
      return { key, direction: 'desc' };
    });
  };

  const columns: TableColumn[] = [
    { title: 'Ad Name', dataIndex: 'adName', width: 260, fixed: 'left' },
    { title: 'Product', dataIndex: 'product', width: 160 },
    {
      title: 'Audience',
      width: 180,
      render: (_, record) => {
        const audience = readAdTableRecord(record).audience;
        return <span title={audience || undefined}>{formatAudienceLabel(audience)}</span>;
      },
    },
    {
      title: 'Creative Thumbnail',
      width: 140,
      render: (_, record) => {
        const ad = readAdTableRecord(record);
        const creative = creativesById.get(ad.creativeId || '') || creativesById.get(ad.adId);
        const thumbnail = creative?.originalImageFileUrl || creative?.thumbnailUrl || creative?.imageUrl;
        return thumbnail ? <img className="table-thumb" src={thumbnail} alt={creative?.creativeName || ad.adName} /> : <span className="ad-empty-value">未关联素材</span>;
      },
    },
    { title: renderSortHeader('Spend', 'spend', sortState, handleSort), render: (_, record) => money(readAdTableRecord(record).spend), align: 'right' },
    { title: renderSortHeader('Purchase', 'purchase', sortState, handleSort), dataIndex: 'purchase', align: 'right' },
    { title: renderSortHeader('CPA', 'cpa', sortState, handleSort), render: (_, record) => money(readAdTableRecord(record).cpa, 2), align: 'right' },
    { title: renderSortHeader('ROAS', 'roas', sortState, handleSort), render: (_, record) => roas(readAdTableRecord(record).roas), align: 'right' },
    { title: renderSortHeader('CPM', 'cpm', sortState, handleSort), render: (_, record) => money(readAdTableRecord(record).cpm ?? 0, 2), align: 'right' },
    { title: renderSortHeader('CPC', 'cpc', sortState, handleSort), render: (_, record) => money(readAdTableRecord(record).cpc ?? 0, 2), align: 'right' },
    { title: renderSortHeader('CTR', 'ctr', sortState, handleSort), render: (_, record) => percent(readAdTableRecord(record).ctr ?? 0), align: 'right' },
    { title: 'Frequency', dataIndex: 'frequency', align: 'right' },
    { title: 'Ad Set Name', dataIndex: 'adsetName', width: 190 },
    { title: 'Campaign Name', dataIndex: 'campaignName', width: 240 },
    {
      title: 'Creative Type',
      width: 130,
      render: (_, record) => {
        const ad = readAdTableRecord(record);
        return creativesById.get(ad.creativeId || '')?.creativeType || creativesById.get(ad.adId)?.creativeType || '未关联素材';
      },
    },
    { title: 'Effective Status', dataIndex: 'effectiveStatus', width: 140 },
    {
      title: 'Action',
      fixed: 'right',
      width: 110,
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          onClick={(event) => {
            event.stopPropagation();
            onInspect(readAdTableRecord(record));
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Card className="table-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Active delivery</p>
          <h2>运行中广告表现</h2>
        </div>
        <span className="soft-tag">{ads.length} rows</span>
      </div>
      <div className="table-scroll ads-table-scroll">
        <Table
          className="ads-data-table"
          columns={columns}
          dataSource={tableRows}
          rowKey="adId"
          striped
          emptyText="No ads matched."
          rowClassName={(record) => {
            const ad = readAdTableRecord(record);
            return `ads-row-clickable ${selectedAdId === ad.adId ? 'ads-row-selected' : ''}`;
          }}
          onRow={(record) => {
            const ad = readAdTableRecord(record);
            return {
              tabIndex: 0,
              onClick: (event) => {
                event.currentTarget.focus();
                onInspect(ad);
              },
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.currentTarget.focus();
                  onInspect(ad);
                }
              },
            };
          }}
        />
      </div>
    </Card>
  );
}

function renderSortHeader(label: string, key: SortKey, sortState: SortState, onSort: (key: SortKey) => void) {
  const active = sortState?.key === key;
  const icon = active && sortState.direction !== 'default' ? (sortState.direction === 'desc' ? '▼' : '▲') : '↕';
  const nextDirection = !active ? 'descending' : sortState.direction === 'desc' ? 'default order' : sortState.direction === 'default' ? 'ascending' : 'descending';

  return (
    <button type="button" className={`ads-sort-button ${active ? 'active' : ''}`} aria-label={`Sort ${label}; next ${nextDirection}`} onClick={() => onSort(key)}>
      <span>{label}</span>
      <b aria-hidden="true">{icon}</b>
    </button>
  );
}

function compareAds(a: AdDailyRecord, b: AdDailyRecord, key: SortKey, direction: SortDirection) {
  const aValue = readSortValue(a, key);
  const bValue = readSortValue(b, key);
  const result = aValue - bValue;
  return direction === 'asc' ? result : -result;
}

function readSortValue(ad: AdDailyRecord, key: SortKey) {
  return Number(ad[key] ?? 0);
}

function toAdTableRecord(ad: AdDailyRecord): AdTableRecord {
  return { ...ad, __ad: ad };
}

function readAdTableRecord(record: Record<string, unknown>): AdDailyRecord {
  const ad = record.__ad;
  if (isAdDailyRecord(ad)) return ad;
  throw new Error('Invalid ad table record');
}

function isAdDailyRecord(value: unknown): value is AdDailyRecord {
  return typeof value === 'object' && value !== null && 'adId' in value && 'spend' in value && 'purchase' in value && 'roas' in value;
}
