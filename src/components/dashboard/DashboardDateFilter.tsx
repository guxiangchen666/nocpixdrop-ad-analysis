import { DateRangePicker } from '../common/DateRangePicker';
import type { DashboardDateRange } from '../../types/dashboard';
import { buildDateRangePresets } from '../../utils/dateRangePresets';

interface DashboardDateFilterProps {
  value: DashboardDateRange;
  minDate: string;
  maxDate: string;
  label: string;
  dateFrom: string;
  dateTo: string;
  onChange: (range: DashboardDateRange) => void;
}

const dashboardPresets = buildDateRangePresets(['today', 'yesterday', '7d', '30d']);

export function DashboardDateFilter({ value, minDate, maxDate, label, dateFrom: currentDateFrom, dateTo: currentDateTo, onChange }: DashboardDateFilterProps) {
  return (
    <div className="dashboard-date-filter">
      <DateRangePicker
        value={{ dateFrom: currentDateFrom, dateTo: currentDateTo }}
        minDate={minDate}
        maxDate={maxDate}
        triggerLabel={`${label} · ${currentDateFrom} 至 ${currentDateTo}`}
        presets={dashboardPresets}
        selectedPresetKey={value.preset === 'custom' ? undefined : value.preset}
        onChange={(range, presetKey) => {
          if (presetKey === 'today' || presetKey === 'yesterday' || presetKey === '7d' || presetKey === '30d') {
            onChange({ preset: presetKey });
            return;
          }
          onChange({ preset: 'custom', ...range });
        }}
      />
    </div>
  );
}
