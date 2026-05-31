'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

export interface FilterSelectOption {
  key: string;
  label: string;
}

interface FilterSelectProps {
  options: FilterSelectOption[];
  value: string;
  onChange: (key: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function FilterSelect({ options, value, onChange, placeholder = '请选择', disabled = false }: FilterSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedIndex = Math.max(0, options.findIndex((option) => option.key === value));
  const selectedOption = options.find((option) => option.key === value);

  useEffect(() => {
    if (!open) return;

    const updatePlacement = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const estimatedMenuHeight = Math.min(options.length * 42 + 12, 320);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setPlacement(spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow ? 'top' : 'bottom');
    };

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);

    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const selectOption = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  const openMenu = () => {
    setHighlightedIndex(selectedIndex);
    setOpen(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      openMenu();
      return;
    }

    if (!open) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((index) => (index + 1) % options.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((index) => (index - 1 + options.length) % options.length);
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (options[highlightedIndex]) {
        selectOption(options[highlightedIndex].key);
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`filter-select ${disabled ? 'filter-select-disabled' : ''}`}>
      <button
        type="button"
        className={`filter-select-trigger ${open ? 'open' : ''}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
      >
        <span className={selectedOption ? 'filter-select-value' : 'filter-select-placeholder'}>
          {selectedOption?.label || placeholder}
        </span>
        <span className="filter-select-arrow" aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div id={listboxId} className={`filter-select-menu ${placement}`} role="listbox" aria-activedescendant={`${listboxId}-option-${highlightedIndex}`}>
          {options.map((option, index) => {
            const selected = option.key === value;
            const highlighted = index === highlightedIndex;

            return (
              <button
                id={`${listboxId}-option-${index}`}
                key={option.key}
                type="button"
                role="option"
                aria-selected={selected}
                className={`filter-select-option ${selected ? 'selected' : ''} ${highlighted ? 'highlighted' : ''}`}
                onClick={() => selectOption(option.key)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span className="filter-select-check">{selected ? '✓' : ''}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
