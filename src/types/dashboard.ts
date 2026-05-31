import type { AdDailyRecord } from './ads';
import type { CreativeRecord } from './creatives';

export interface DashboardMetric {
  label: string;
  value: string;
  helper: string;
  tone: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'default';
}

export interface DashboardTrendPoint {
  date: string;
  spend: number;
  purchase: number;
  roas: number;
}

export type DashboardDatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'custom';

export interface DashboardDateRange {
  preset: DashboardDatePreset;
  dateFrom?: string;
  dateTo?: string;
}

export interface DashboardSummary {
  metrics: DashboardMetric[];
  trend: DashboardTrendPoint[];
  topAds: AdDailyRecord[];
  topAdCreatives: CreativeRecord[];
  topCreatives: CreativeRecord[];
  focusRecommendations: string[];
  rangeLabel: string;
  dateFrom: string;
  dateTo: string;
}
