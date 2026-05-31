'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface DateRangeValue {
  dateFrom?: string;
  dateTo?: string;
}

export interface DateRangePreset {
  key: string;
  label: string;
  resolve: (bounds: { minDate: string; maxDate: string }) => Required<DateRangeValue>;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  minDate: string;
  maxDate: string;
  triggerLabel: string;
  presets: DateRangePreset[];
  selectedPresetKey?: string;
  align?: 'left' | 'right';
  onChange: (range: Required<DateRangeValue>, presetKey?: string) => void;
}

const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function DateRangePicker({ value, minDate, maxDate, triggerLabel, presets, selectedPresetKey, align = 'right', onChange }: DateRangePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(value.dateFrom || maxDate);
  const [draftTo, setDraftTo] = useState(value.dateTo || value.dateFrom || maxDate);
  const [selectingEnd, setSelectingEnd] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(value.dateFrom || maxDate));

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const openPicker = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const nextFrom = value.dateFrom || maxDate;
    const nextTo = value.dateTo || value.dateFrom || maxDate;
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    setSelectingEnd(false);
    setVisibleMonth(monthStart(nextFrom));
    setOpen(true);
  };

  const months = useMemo(() => [visibleMonth, addMonths(visibleMonth, 1)], [visibleMonth]);

  const applyPreset = (preset: DateRangePreset) => {
    const range = preset.resolve({ minDate, maxDate });
    setDraftFrom(range.dateFrom);
    setDraftTo(range.dateTo);
    setSelectingEnd(false);
    setVisibleMonth(monthStart(range.dateFrom));
    onChange(range, preset.key);
    setOpen(false);
  };

  const selectDate = (date: string) => {
    if (date < minDate || date > maxDate) return;

    if (!selectingEnd) {
      setDraftFrom(date);
      setDraftTo(date);
      setSelectingEnd(true);
      return;
    }

    const dateFrom = date <= draftFrom ? date : draftFrom;
    const dateTo = date >= draftFrom ? date : draftFrom;
    setDraftFrom(dateFrom);
    setDraftTo(dateTo);
    setSelectingEnd(false);
    onChange({ dateFrom, dateTo });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="date-range-picker">
      <button
        type="button"
        className="date-range-button clickable"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openPicker}
      >
        <span>{triggerLabel}</span>
        <b aria-hidden="true">⌄</b>
      </button>

      {open ? (
        <section className={`date-range-popover align-${align}`} aria-label="Date range picker">
          <aside className="date-range-presets">
            <strong>快捷范围</strong>
            {presets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className={selectedPresetKey === preset.key ? 'active' : ''}
                onClick={() => applyPreset(preset)}
              >
                <i aria-hidden="true" />
                {preset.label}
              </button>
            ))}
          </aside>

          <div className="date-range-calendar-panel">
            <div className="date-range-calendar-nav">
              <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth((month) => addMonths(month, -1))}>‹</button>
              <span>{formatMonthTitle(months[0])} - {formatMonthTitle(months[1])}</span>
              <button type="button" aria-label="Next month" onClick={() => setVisibleMonth((month) => addMonths(month, 1))}>›</button>
            </div>

            <div className="date-range-months">
              {months.map((month) => (
                <MonthCalendar
                  key={month}
                  month={month}
                  minDate={minDate}
                  maxDate={maxDate}
                  dateFrom={draftFrom}
                  dateTo={draftTo}
                  onSelect={selectDate}
                />
              ))}
            </div>

            <div className="date-range-footer">
              <span>{draftFrom} 至 {draftTo}</span>
              <button type="button" className="date-range-cancel" onClick={() => setOpen(false)}>取消</button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MonthCalendar({ month, minDate, maxDate, dateFrom, dateTo, onSelect }: {
  month: string;
  minDate: string;
  maxDate: string;
  dateFrom: string;
  dateTo: string;
  onSelect: (date: string) => void;
}) {
  const days = buildMonthDays(month);
  return (
    <div className="date-range-month">
      <h3>{formatMonthTitle(month)}</h3>
      <div className="date-range-weekdays">
        {weekdayLabels.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="date-range-days">
        {days.map((day, index) => {
          if (!day) return <span key={`${month}-empty-${index}`} className="date-range-day empty" />;
          const disabled = day < minDate || day > maxDate;
          const selectedEdge = day === dateFrom || day === dateTo;
          const inRange = day > dateFrom && day < dateTo;
          return (
            <button
              key={day}
              type="button"
              className={`${selectedEdge ? 'selected' : ''} ${inRange ? 'in-range' : ''}`}
              disabled={disabled}
              onClick={() => onSelect(day)}
            >
              {Number(day.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildMonthDays(month: string) {
  const first = parseDate(`${month}-01`);
  const firstWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const blanks = Array.from<null>({ length: firstWeekday }).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
  return [...blanks, ...days];
}

function monthStart(date: string) {
  return date.slice(0, 7);
}

function addMonths(month: string, offset: number) {
  const date = parseDate(`${month}-01`);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthTitle(month: string) {
  const [year, monthNumber] = month.split('-');
  return `${year}年${Number(monthNumber)}月`;
}

function parseDate(date: string) {
  return new Date(`${date}T00:00:00`);
}
