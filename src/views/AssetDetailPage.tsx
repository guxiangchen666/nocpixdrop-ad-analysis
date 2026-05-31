'use client';

import { Button, Card } from 'animal-island-ui';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExportViewButton } from '../components/layout/ExportViewButton';
import { RefreshDataButton } from '../components/layout/RefreshDataButton';
import { useDataRefreshSignal } from '../hooks/useDataRefreshSignal';
import {
  getAssetAudienceCopyMatrix,
  getAssetDetail,
  getAssetPerformanceTrend,
  getAssetPeriodComparison,
} from '../services/assetAnalysisService';
import type {
  AssetAudienceCopyPerformance,
  AssetDetail,
  AssetMetricSummary,
  AssetPeriodComparison,
  CreativeTrendPoint,
  CreativeTrendRange,
} from '../types/creatives';
import { money, number, percent, roas } from '../utils/format';

const TARGET_ROAS = 2.0;
const ranges: CreativeTrendRange[] = ['7d', '14d', '30d'];

type SortKey = 'roas' | 'spend' | 'purchase' | 'cpa';
type SortDirection = 'asc' | 'desc';

export function AssetDetailPage({ assetGroupKey }: { assetGroupKey: string }) {
  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [matrix, setMatrix] = useState<AssetAudienceCopyPerformance[]>([]);
  const [trendData, setTrendData] = useState<CreativeTrendPoint[]>([]);
  const [periodComparison, setPeriodComparison] = useState<AssetPeriodComparison | null>(null);
  const [range, setRange] = useState<CreativeTrendRange>('30d');
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [audienceFilter, setAudienceFilter] = useState('__all');
  const [copyFilter, setCopyFilter] = useState('__all');
  const [adFilter, setAdFilter] = useState('__all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshSignal = useDataRefreshSignal();

  useEffect(() => {
    let cancelled = false;

    const loadAssetDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const [nextDetail, nextMatrix, nextTrendData, nextComparison] = await Promise.all([
          getAssetDetail(assetGroupKey, range),
          getAssetAudienceCopyMatrix(assetGroupKey, range),
          getAssetPerformanceTrend(assetGroupKey, range),
          getAssetPeriodComparison(assetGroupKey),
        ]);
        if (cancelled) return;
        setDetail(nextDetail ?? null);
        setMatrix(nextMatrix);
        setTrendData(nextTrendData);
        setPeriodComparison(nextComparison);
      } catch (requestError: unknown) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : 'Failed to load asset detail');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadAssetDetail();

    return () => {
      cancelled = true;
    };
  }, [assetGroupKey, range, refreshSignal]);

  const filteredCombinations = useMemo(() => {
    return matrix
      .filter((row) => audienceFilter === '__all' || row.audienceKey === audienceFilter)
      .filter((row) => copyFilter === '__all' || row.copyKey === copyFilter)
      .filter((row) => adFilter === '__all' || row.adIds.includes(adFilter))
      .sort((left, right) => compareCombinationRows(left, right, sortKey, sortDirection));
  }, [adFilter, audienceFilter, copyFilter, matrix, sortDirection, sortKey]);

  if (loading && !detail) {
    return <div className="creative-analysis-state">Loading asset detail...</div>;
  }

  if (error && !detail) {
    return <div className="creative-analysis-state error">{error}</div>;
  }

  if (!detail) {
    return (
      <Card className="empty-state">
        <h2>Asset not found</h2>
        <Link href="/creatives"><Button type="primary">Back to Creatives</Button></Link>
      </Card>
    );
  }

  const playableVideoUrl = detail.originalVideoFileUrl || detail.videoUrl;
  const previewImage = detail.thumbnailUrl || detail.imageUrl;
  const status = getAssetStatus(detail, periodComparison);
  const audienceOptions = uniqueStrings(matrix.map((row) => row.audienceKey));
  const copyOptions = uniqueStrings(matrix.map((row) => row.copyKey));

  return (
    <div className="page-stack asset-decision-page">
      <div className="page-title asset-page-title">
        <div>
          <p className="eyebrow">Asset analysis</p>
          <h2 title={detail.name}>{detail.name}</h2>
        </div>
        <div className="page-title-actions">
          <span className={`asset-status-badge ${status.tone}`}>{status.label}</span>
          <RefreshDataButton />
          <ExportViewButton />
          <Link className="page-title-action-link" href="/creatives"><Button className="page-action-button" type="dashed" size="small">返回素材库</Button></Link>
        </div>
      </div>

      {error ? <div className="creative-analysis-state error">{error}</div> : null}

      <section className="asset-hero-grid">
        <Card className="preview-card asset-preview-card">
          {playableVideoUrl ? (
            <video className="creative-detail-video" src={playableVideoUrl} poster={previewImage} controls playsInline />
          ) : previewImage ? (
            <img src={previewImage} alt={detail.name} />
          ) : (
            <div className="ad-modal-thumb-placeholder creative-thumb">暂无素材预览</div>
          )}
        </Card>

        <AssetInfoSummaryCard detail={detail} />
      </section>

      <Card className="performance-card asset-overall-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Overall</p>
            <h2>素材整体表现</h2>
          </div>
          <div className="chart-head-controls">
            <span className={`asset-status-badge ${status.tone}`}>{status.label}</span>
            <RangeSelector range={range} onRangeChange={setRange} />
          </div>
        </div>
        <CoreMetrics summary={detail} />
      </Card>

      <TrendTab data={trendData} comparison={periodComparison} range={range} onRangeChange={setRange} />

      <CombinationsTab
        rows={filteredCombinations}
        audienceOptions={audienceOptions}
        copyOptions={copyOptions}
        adOptions={detail.adIds}
        audienceFilter={audienceFilter}
        copyFilter={copyFilter}
        adFilter={adFilter}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onAudienceFilterChange={setAudienceFilter}
        onCopyFilterChange={setCopyFilter}
        onAdFilterChange={setAdFilter}
        onSortChange={(nextSortKey) => {
          if (nextSortKey === sortKey) {
            setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
            return;
          }
          setSortKey(nextSortKey);
          setSortDirection(nextSortKey === 'cpa' ? 'asc' : 'desc');
        }}
      />
    </div>
  );
}

function RangeSelector({ range, onRangeChange }: { range: CreativeTrendRange; onRangeChange: (range: CreativeTrendRange) => void }) {
  return (
    <div className="range-segmented" role="tablist" aria-label="Asset range">
      {ranges.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={item === range}
          className={item === range ? 'active' : ''}
          onClick={() => onRangeChange(item)}
        >
          {item.replace('d', 'D')}
        </button>
      ))}
    </div>
  );
}

function CoreMetrics({ summary }: { summary: Pick<AssetMetricSummary, 'spend' | 'purchase' | 'roas' | 'cpa' | 'ctr'> }) {
  return (
    <div className="asset-core-metrics">
      <MetricTile label="Spend" value={money(summary.spend)} />
      <MetricTile label="Purchase" value={number(summary.purchase, 0)} />
      <MetricTile label="ROAS" value={roas(summary.roas)} />
      <MetricTile label="CPA" value={money(summary.cpa, 2)} />
      <MetricTile label="CTR" value={percent(summary.ctr)} />
    </div>
  );
}

function AssetInfoSummaryCard({ detail }: { detail: AssetDetail }) {
  return (
    <Card className="asset-info-summary-card">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Asset info</p>
          <h2>素材信息</h2>
        </div>
      </div>
      <dl className="asset-summary-list">
        <SummaryItem label="Product">{detail.product || '-'}</SummaryItem>
        <SummaryItem label="Creative Type">{detail.creativeType || '-'}</SummaryItem>
        <SummaryItem label="Material Type">{detail.materialType || '-'}</SummaryItem>
        <SummaryItem label="Audience">{detail.audience || detail.topAudience || '-'}</SummaryItem>
        <SummaryItem label="Primary Text"><ExpandableText text={detail.primaryText || '-'} limit={92} /></SummaryItem>
        <SummaryItem label="Headline">{detail.headline || '-'}</SummaryItem>
        <SummaryItem label="CTA">{detail.cta || '-'}</SummaryItem>
        <SummaryItem label="Linked">{`${detail.creativeIds.length} Creatives / ${detail.adIds.length} Ads`}</SummaryItem>
      </dl>
    </Card>
  );
}

function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <span>
      {label}
      <strong>{value}</strong>
    </span>
  );
}

function CombinationsTab({
  rows,
  audienceOptions,
  copyOptions,
  adOptions,
  audienceFilter,
  copyFilter,
  adFilter,
  sortKey,
  sortDirection,
  onAudienceFilterChange,
  onCopyFilterChange,
  onAdFilterChange,
  onSortChange,
}: {
  rows: AssetAudienceCopyPerformance[];
  audienceOptions: string[];
  copyOptions: string[];
  adOptions: string[];
  audienceFilter: string;
  copyFilter: string;
  adFilter: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onAudienceFilterChange: (value: string) => void;
  onCopyFilterChange: (value: string) => void;
  onAdFilterChange: (value: string) => void;
  onSortChange: (value: SortKey) => void;
}) {
  return (
    <Card className="table-card asset-tab-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Combination Performance</p>
          <h2>受众 × 文案 × 广告组合</h2>
        </div>
        <span className="soft-tag">{rows.length} rows</span>
      </div>

      <div className="asset-filter-bar">
        <AssetSelect label="Audience" value={audienceFilter} options={audienceOptions} onChange={onAudienceFilterChange} />
        <AssetSelect label="Copy" value={copyFilter} options={copyOptions} optionLabel={(value) => shortText(value, 44)} onChange={onCopyFilterChange} />
        <AssetSelect label="Ad" value={adFilter} options={adOptions} onChange={onAdFilterChange} />
      </div>

      <div className="creative-trend-table-wrap">
        <table className="creative-trend-table asset-table asset-combination-table">
          <thead>
            <tr>
              <th>Audience</th>
              <th>Copy</th>
              <th>Ads</th>
              <SortableTh label="Spend" value="spend" active={sortKey} direction={sortDirection} onSort={onSortChange} />
              <SortableTh label="Purchase" value="purchase" active={sortKey} direction={sortDirection} onSort={onSortChange} />
              <SortableTh label="ROAS" value="roas" active={sortKey} direction={sortDirection} onSort={onSortChange} />
              <SortableTh label="CPA" value="cpa" active={sortKey} direction={sortDirection} onSort={onSortChange} />
              <th>CTR</th>
              <th>Sample</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map((row) => (
              <tr key={`${row.audienceKey}-${row.copyKey}`}>
                <td>{row.audienceKey}</td>
                <td className="asset-copy-cell"><ExpandableText text={row.copyLabel} limit={90} /></td>
                <td>{row.adIds.length}</td>
                <td>{money(row.spend)}</td>
                <td>{number(row.purchase, 0)}</td>
                <td>{roas(row.roas)}</td>
                <td>{money(row.cpa, 2)}</td>
                <td>{percent(row.ctr)}</td>
                <td>{row.sampleMessage || 'OK'}</td>
                <td><span className="asset-table-action">{getCombinationAction(row)}</span></td>
              </tr>
            )) : (
              <EmptyTableRow colSpan={10}>暂无匹配组合</EmptyTableRow>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TrendTab({ data, comparison, range, onRangeChange }: { data: CreativeTrendPoint[]; comparison: AssetPeriodComparison | null; range: CreativeTrendRange; onRangeChange: (range: CreativeTrendRange) => void }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const totals = data.reduce(
    (acc, point) => ({
      spend: acc.spend + point.spend,
      purchase: acc.purchase + point.purchase,
      purchaseValue: acc.purchaseValue + point.purchaseValue,
      impressions: acc.impressions + point.impressions,
      clicks: acc.clicks + point.clicks,
    }),
    { spend: 0, purchase: 0, purchaseValue: 0, impressions: 0, clicks: 0 },
  );
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;

  return (
    <Card className="performance-card asset-tab-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Trend</p>
          <h2>最近表现变化</h2>
        </div>
        <div className="chart-head-controls">
          <label className="asset-toggle">
            <input type="checkbox" checked={showAdvanced} onChange={(event) => setShowAdvanced(event.target.checked)} />
            Advanced metrics
          </label>
          <RangeSelector range={range} onRangeChange={onRangeChange} />
        </div>
      </div>

      <div className="asset-trend-summary">
        <CompareTile label="ROAS" current={comparison?.recent7d.roas} previous={comparison?.previous7d.roas} change={comparison?.roasChangePct} formatter={roas} />
        <CompareTile label="CPA" current={comparison?.recent7d.cpa} previous={comparison?.previous7d.cpa} change={comparison?.cpaChangePct} formatter={(value) => money(value, 2)} inverse />
        <CompareTile label="CTR" current={comparison?.recent7d.ctr} previous={comparison?.previous7d.ctr} change={comparison?.ctrChangePct} formatter={percent} />
        <div className="asset-trend-judgement">
          <span>趋势判断</span>
          <strong>{comparison?.trendSignal || '表现稳定'}</strong>
        </div>
      </div>

      <div className="creative-trend-chart">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="assetTrendSpend" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#3a8f7a" stopOpacity={0.24} />
                <stop offset="95%" stopColor="#3a8f7a" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(120, 102, 70, 0.18)" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(value) => String(value).slice(5)} />
            <YAxis yAxisId="spend" tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} width={58} />
            <YAxis yAxisId="metric" orientation="right" tickLine={false} axisLine={false} width={52} />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'Spend' || name === 'CPA') return [money(Number(value), 2), name];
                if (name === 'ROAS') return [roas(Number(value)), name];
                if (name === 'Purchase') return [number(Number(value), 0), name];
                return [value, name];
              }}
              labelFormatter={(label) => `Date ${label}`}
            />
            <Area yAxisId="spend" type="monotone" dataKey="spend" name="Spend" stroke="#3a8f7a" fill="url(#assetTrendSpend)" strokeWidth={2} />
            <Line yAxisId="metric" type="monotone" dataKey="purchase" name="Purchase" stroke="#d98b38" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
            <Line yAxisId="metric" type="monotone" dataKey="roas" name="ROAS" stroke="#4f6edb" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
            <Line yAxisId="metric" type="monotone" dataKey="cpa" name="CPA" stroke="#9b5e42" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {showAdvanced ? (
        <div className="asset-advanced-grid">
          <MetricTile label="CTR" value={percent(ctr)} />
          <MetricTile label="CPC" value={money(cpc, 2)} />
          <MetricTile label="CPM" value={money(cpm, 2)} />
          <MetricTile label="Impressions" value={number(totals.impressions, 0)} />
          <MetricTile label="Clicks" value={number(totals.clicks, 0)} />
        </div>
      ) : null}
    </Card>
  );
}

function AssetSelect({
  label,
  value,
  options,
  optionLabel = (item) => item,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  optionLabel?: (item: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="asset-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="__all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>{optionLabel(option)}</option>
        ))}
      </select>
    </label>
  );
}

function SortableTh({ label, value, active, direction, onSort }: { label: string; value: SortKey; active: SortKey; direction: SortDirection; onSort: (value: SortKey) => void }) {
  return (
    <th>
      <button type="button" className="asset-sort-button" onClick={() => onSort(value)}>
        {label} {active === value ? (direction === 'desc' ? '↓' : '↑') : ''}
      </button>
    </th>
  );
}

function CompareTile({ label, current = 0, previous = 0, change = 0, formatter, inverse = false }: { label: string; current?: number; previous?: number; change?: number; formatter: (value: number) => string; inverse?: boolean }) {
  const positive = inverse ? change <= 0 : change >= 0;
  return (
    <div className="asset-compare-tile">
      <span>{label}</span>
      <strong>{formatter(current)}</strong>
      <small className={positive ? 'up' : 'down'}>{formatSignedPercent(change)} vs 前 7 天 · {formatter(previous)}</small>
    </div>
  );
}

function ExpandableText({ text, limit }: { text: string; limit: number }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= limit) return <span title={text}>{text}</span>;
  return (
    <span className="asset-expandable-text">
      <span title={text}>{expanded ? text : `${text.slice(0, limit)}...`}</span>
      <button type="button" className="asset-inline-button clickable" onClick={() => setExpanded(!expanded)}>
        {expanded ? '收起' : '展开'}
      </button>
    </span>
  );
}

function EmptyTableRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="asset-table-empty">{children}</td>
    </tr>
  );
}

type AssetStatus = {
  label: '可扩量' | '继续观察' | '疲劳风险' | '表现差' | '样本不足';
  tone: 'scale' | 'observe' | 'fatigue' | 'poor' | 'insufficient';
};

function getAssetStatus(detail: AssetDetail, comparison: AssetPeriodComparison | null): AssetStatus {
  if (detail.spend < 100 || detail.impressions < 1000) return { label: '样本不足', tone: 'insufficient' };
  if (comparison?.trendSignal === '疲劳风险') return { label: '疲劳风险', tone: 'fatigue' };
  if (detail.purchase < 3) return { label: '继续观察', tone: 'observe' };
  if (detail.roas >= TARGET_ROAS) return { label: '可扩量', tone: 'scale' };
  if (detail.roas < TARGET_ROAS * 0.75) return { label: '表现差', tone: 'poor' };
  return { label: '继续观察', tone: 'observe' };
}

function getCombinationAction(row: AssetAudienceCopyPerformance) {
  if (row.isSampleInsufficient) return '继续观察';
  if (row.roas >= TARGET_ROAS && row.cpa > 0 && row.cpa <= 80) return '扩量';
  if (row.roas < TARGET_ROAS && row.spend >= 100) return '暂停 / 降预算';
  if (row.ctr >= 1.5 && row.roas < TARGET_ROAS) return '检查落地页 / Offer';
  if (row.ctr < 0.8) return '换 Hook / 换首屏';
  return row.roas >= TARGET_ROAS ? '保留测试' : '继续观察';
}

function compareCombinationRows(left: AssetAudienceCopyPerformance, right: AssetAudienceCopyPerformance, sortKey: SortKey, direction: SortDirection) {
  const leftValue = left[sortKey];
  const rightValue = right[sortKey];
  if (leftValue === rightValue) return right.spend - left.spend;
  return (leftValue - rightValue) * (direction === 'asc' ? 1 : -1);
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function shortText(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit)}...` : value;
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${percent(value)}`;
}
