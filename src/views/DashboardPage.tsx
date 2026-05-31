'use client';

import { Card } from 'animal-island-ui';
import { useEffect, useState } from 'react';
import { DashboardDateFilter } from '../components/dashboard/DashboardDateFilter';
import { MetricCard } from '../components/dashboard/MetricCard';
import { TopAdsTable } from '../components/dashboard/TopAdsTable';
import { TopCreatives } from '../components/dashboard/TopCreatives';
import { TrendChart } from '../components/dashboard/TrendChart';
import { ExportViewButton } from '../components/layout/ExportViewButton';
import { RefreshDataButton } from '../components/layout/RefreshDataButton';
import { useDataRefreshSignal } from '../hooks/useDataRefreshSignal';
import { getDashboardAvailableDateRange, getDashboardSummary } from '../services/dashboardService';
import type { DashboardDateRange, DashboardSummary } from '../types/dashboard';

export function DashboardPage() {
  const [dateRange, setDateRange] = useState<DashboardDateRange>({ preset: '7d' });
  const [availableDateRange, setAvailableDateRange] = useState({ minDate: '', maxDate: '' });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshSignal = useDataRefreshSignal();

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const [range, nextSummary] = await Promise.all([getDashboardAvailableDateRange(), getDashboardSummary(dateRange)]);
        if (cancelled) return;
        setAvailableDateRange(range);
        setSummary(nextSummary);
      } catch (requestError: unknown) {
        if (cancelled) return;
        setError(requestError instanceof Error ? requestError.message : 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [dateRange, refreshSignal]);

  if (loading && !summary) {
    return <div className="creative-analysis-state">Loading dashboard...</div>;
  }

  if (error && !summary) {
    return <div className="creative-analysis-state error">{error}</div>;
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="page-stack">
      <div className="page-title">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Dashboard</h2>
        </div>
        <div className="page-title-actions">
          <DashboardDateFilter
            value={dateRange}
            minDate={availableDateRange.minDate}
            maxDate={availableDateRange.maxDate}
            label={summary.rangeLabel}
            dateFrom={summary.dateFrom}
            dateTo={summary.dateTo}
            onChange={setDateRange}
          />
          <RefreshDataButton />
          <ExportViewButton />
        </div>
      </div>
      {error ? <div className="creative-analysis-state error">{error}</div> : null}

      <div className="metric-grid">
        {summary.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="dashboard-grid">
        <TrendChart data={summary.trend} rangeLabel={summary.rangeLabel} />
        <Card className="focus-card" color="app-yellow">
          <p className="eyebrow">Today</p>
          <h2>今日重点建议</h2>
          <ul>
            {summary.focusRecommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="dashboard-grid lower">
        <TopAdsTable ads={summary.topAds} creatives={summary.topAdCreatives} />
        <TopCreatives creatives={summary.topCreatives} />
      </div>
    </div>
  );
}
