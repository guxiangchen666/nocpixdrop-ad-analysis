export const DEFAULT_DATA_TIME_ZONE = 'Asia/Shanghai';

export function formatDateKey(value: string | number | Date, timeZone: string = DEFAULT_DATA_TIME_ZONE): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const normalized = normalizeDateKey(trimmed);
    if (normalized) return normalized;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return formatDateByTimeZone(date, timeZone);
}

export function shiftDateKey(dateKey: string, offsetDays: number, timeZone: string = DEFAULT_DATA_TIME_ZONE): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;

  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + offsetDays));
  return formatDateByTimeZone(shifted, timeZone);
}

export function normalizeDateKey(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const directMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (directMatch) return trimmed;

  if (/^\d+$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return undefined;
    return formatDateKey(numeric);
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return undefined;
  return formatDateKey(parsed);
}

function parseDateKey(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatDateByTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return year && month && day ? `${year}-${month}-${day}` : '';
}
