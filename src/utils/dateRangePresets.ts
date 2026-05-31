import type { DateRangePreset } from '../components/common/DateRangePicker';
import { shiftDateKey } from './dateKey';

export function buildDateRangePresets(keys: Array<'today' | 'yesterday' | '7d' | '14d' | '28d' | '30d' | 'thisMonth'>): DateRangePreset[] {
  const presetMap: Record<(typeof keys)[number], DateRangePreset> = {
    today: {
      key: 'today',
      label: '今天',
      resolve: ({ maxDate }) => ({ dateFrom: maxDate, dateTo: maxDate }),
    },
    yesterday: {
      key: 'yesterday',
      label: '昨天',
      resolve: ({ maxDate }) => {
        const date = shiftDate(maxDate, -1);
        return { dateFrom: date, dateTo: date };
      },
    },
    '7d': {
      key: '7d',
      label: '过去 7 天',
      resolve: ({ minDate, maxDate }) => ({ dateFrom: maxDateString(shiftDate(maxDate, -6), minDate), dateTo: maxDate }),
    },
    '14d': {
      key: '14d',
      label: '过去 14 天',
      resolve: ({ minDate, maxDate }) => ({ dateFrom: maxDateString(shiftDate(maxDate, -13), minDate), dateTo: maxDate }),
    },
    '28d': {
      key: '28d',
      label: '过去 28 天',
      resolve: ({ minDate, maxDate }) => ({ dateFrom: maxDateString(shiftDate(maxDate, -27), minDate), dateTo: maxDate }),
    },
    '30d': {
      key: '30d',
      label: '过去 30 天',
      resolve: ({ minDate, maxDate }) => ({ dateFrom: maxDateString(shiftDate(maxDate, -29), minDate), dateTo: maxDate }),
    },
    thisMonth: {
      key: 'thisMonth',
      label: '本月',
      resolve: ({ minDate, maxDate }) => ({ dateFrom: maxDateString(`${maxDate.slice(0, 7)}-01`, minDate), dateTo: maxDate }),
    },
  };

  return keys.map((key) => presetMap[key]);
}

function shiftDate(date: string, offsetDays: number) {
  return shiftDateKey(date, offsetDays);
}

function maxDateString(a: string, b: string) {
  return a >= b ? a : b;
}
