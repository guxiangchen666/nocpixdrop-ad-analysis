import { useState } from 'react';
import { Card, Table } from 'animal-island-ui';
import type { TableColumn } from 'animal-island-ui';
import { AdDetailModal } from '../ads/AdDetailModal';
import type { AdDailyRecord } from '../../types/ads';
import type { CreativeRecord } from '../../types/creatives';
import type { TrendRange } from '../../utils/mockTrend';
import { money, percent, roas } from '../../utils/format';

type AdTableRecord = Record<string, unknown> & { __ad: AdDailyRecord };

const columns: TableColumn[] = [
  { title: 'Ad Name', dataIndex: 'adName', width: 260 },
  { title: 'Product', dataIndex: 'product', width: 170 },
  { title: 'Spend', render: (_, record) => money(readAdTableRecord(record).spend), align: 'right' },
  { title: 'Purchase', dataIndex: 'purchase', align: 'right' },
  { title: 'ROAS', render: (_, record) => roas(readAdTableRecord(record).roas), align: 'right' },
  { title: 'CPA', render: (_, record) => money(readAdTableRecord(record).cpa, 2), align: 'right' },
  { title: 'CTR', render: (_, record) => percent(readAdTableRecord(record).ctr ?? 0), align: 'right' },
];

export function TopAdsTable({ ads, creatives }: { ads: AdDailyRecord[]; creatives: CreativeRecord[] }) {
  const [selectedAd, setSelectedAd] = useState<AdDailyRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [trendRange, setTrendRange] = useState<TrendRange>('7d');
  const selectedCreative = selectedAd ? creatives.find((creative) => creative.creativeId === selectedAd.creativeId || creative.adId === selectedAd.adId) : undefined;

  const openAdDetail = (ad: AdDailyRecord) => {
    setSelectedAd(ad);
    setModalOpen(true);
  };

  return (
    <>
      <Card className="table-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Winners</p>
            <h2>Top Ads</h2>
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={ads.map(toAdTableRecord)}
          rowKey="adId"
          scroll={{ x: 860 }}
          striped
          rowClassName={(record) => {
            const ad = readAdTableRecord(record);
            return `ads-row-clickable ${selectedAd?.adId === ad.adId && modalOpen ? 'ads-row-selected' : ''}`;
          }}
          onRow={(record) => {
            const ad = readAdTableRecord(record);
            return {
              tabIndex: 0,
              onClick: () => openAdDetail(ad),
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openAdDetail(ad);
                }
              },
            };
          }}
        />
      </Card>
      <AdDetailModal
        ad={selectedAd}
        creative={selectedCreative}
        open={modalOpen}
        trendRange={trendRange}
        onRangeChange={setTrendRange}
        onClose={() => setModalOpen(false)}
        onExited={() => setSelectedAd(null)}
      />
    </>
  );
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
