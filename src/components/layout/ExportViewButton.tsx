'use client';

import { Button } from 'animal-island-ui';
import { useEffect, useRef, useState } from 'react';

export function ExportViewButton() {
  const [exporting, setExporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', closeMenu);
    return () => window.removeEventListener('mousedown', closeMenu);
  }, [menuOpen]);

  const exportCsv = () => {
    setExporting(true);
    try {
      const title = document.querySelector('.page-title h2')?.textContent?.trim() || document.title || 'Meta Creative View';
      const csv = buildPageCsv();
      if (!csv) {
        window.alert('当前页面没有可导出的表格或卡片数据。');
        return;
      }

      downloadText(csv, `${title}-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8');
    } finally {
      window.setTimeout(() => setExporting(false), 300);
    }
  };

  const exportExcel = () => {
    setExporting(true);
    try {
      const title = document.querySelector('.page-title h2')?.textContent?.trim() || document.title || 'Meta Creative View';
      const html = buildPageHtml(title);
      if (!html) {
        window.alert('当前页面没有可导出的表格或卡片数据。');
        return;
      }
      downloadText(html, `${title}-${new Date().toISOString().slice(0, 10)}.xls`, 'application/vnd.ms-excel;charset=utf-8');
    } finally {
      window.setTimeout(() => setExporting(false), 300);
    }
  };

  const runExport = (kind: 'csv' | 'excel') => {
    setMenuOpen(false);
    if (kind === 'excel') exportExcel();
    else exportCsv();
  };

  return (
    <div className="export-menu" ref={wrapperRef}>
      <Button className="export-view-button" type="primary" size="small" disabled={exporting} onClick={exportCsv}>
        {exporting ? 'Exporting...' : 'Export CSV'}
      </Button>
      <button type="button" className="export-menu-trigger clickable" aria-label="More export formats" onClick={() => setMenuOpen((open) => !open)}>
        ▾
      </button>
      {menuOpen ? (
        <div className="export-menu-panel">
          <button type="button" onClick={() => runExport('csv')}>Current tables CSV</button>
          <button type="button" onClick={() => runExport('excel')}>Excel-compatible XLS</button>
        </div>
      ) : null}
    </div>
  );
}

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFilename(filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
}

type ExportSection = {
  heading: string;
  rows: string[][];
};

function buildPageCsv() {
  const sections = getExportSections();
  if (sections.length === 0) return '';

  return sections
    .map((section) => [[section.heading], ...section.rows].map(toCsvRow).join('\n'))
    .join('\n\n');
}

function buildPageHtml(title: string) {
  const sections = getExportSections();
  if (sections.length === 0) return '';

  const body = sections.map((section) => (
    `<h2>${escapeHtml(section.heading)}</h2><table>${section.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</table>`
  ));

  return `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;margin-bottom:24px}td{border:1px solid #999;padding:6px 10px;white-space:pre-wrap}h2{margin:18px 0 8px}</style></head><body>${body.join('')}</body></html>`;
}

function getExportSections() {
  const tableSections = readTableSections();
  if (tableSections.length > 0) return tableSections;
  return readCardSections();
}

function readTableSections(): ExportSection[] {
  const pageSurface = document.querySelector<HTMLElement>('.page-surface');
  const tables = Array.from(pageSurface?.querySelectorAll<HTMLTableElement>('table') ?? [])
    .filter((table) => table.offsetParent !== null && table.querySelectorAll('tr').length > 0);

  return tables
    .map((table, index) => {
      const heading = findNearestHeading(table) || `Table ${index + 1}`;
      const rows = readTableRows(table);
      return rows.length > 0 ? { heading, rows } : null;
    })
    .filter((section): section is ExportSection => Boolean(section));
}

function readCardSections(): ExportSection[] {
  const pageSurface = document.querySelector<HTMLElement>('.page-surface');
  if (!pageSurface) return [];

  const creativeRows = Array.from(pageSurface.querySelectorAll<HTMLElement>('.creative-card'))
    .filter(isVisible)
    .map(readCreativeCardRow)
    .filter((row) => row.some(Boolean));
  const recommendationRows = Array.from(pageSurface.querySelectorAll<HTMLElement>('.recommendation-card'))
    .filter(isVisible)
    .map(readRecommendationCardRow)
    .filter((row) => row.some(Boolean));
  const miniCreativeRows = Array.from(pageSurface.querySelectorAll<HTMLElement>('.mini-creative'))
    .filter(isVisible)
    .map(readMiniCreativeRow)
    .filter((row) => row.some(Boolean));

  return [
    creativeRows.length > 0
      ? {
        heading: 'Creative Cards',
        rows: [
          ['Creative ID', 'Type', 'Status', 'Product', 'Material Type', 'Video ID', 'Asset Source', 'ROAS', 'CPA', 'Spend', 'Purchase'],
          ...creativeRows,
        ],
      }
      : null,
    recommendationRows.length > 0
      ? {
        heading: 'Recommendations',
        rows: [
          ['Title', 'Priority', 'Status', 'Problem', 'Key Metrics', 'Suggested Action', 'Reasoning', 'Object'],
          ...recommendationRows,
        ],
      }
      : null,
    miniCreativeRows.length > 0
      ? {
        heading: 'Top Creatives',
        rows: [
          ['Creative', 'Product', 'Status'],
          ...miniCreativeRows,
        ],
      }
      : null,
  ].filter((section): section is ExportSection => Boolean(section));
}

function readCreativeCardRow(card: HTMLElement) {
  const stats = readCreativeStats(card);
  return [
    text(card.querySelector('.creative-card-title')),
    text(card.querySelector('.type-pill')),
    text(card.querySelector('.soft-tag')),
    readDefinitionValue(card, 'Product'),
    readDefinitionValue(card, 'Material Type'),
    readDefinitionValue(card, 'Video ID'),
    readDefinitionValue(card, 'Asset Source'),
    stats.ROAS || '',
    stats.CPA || '',
    stats.Spend || '',
    stats.Purchase || '',
  ];
}

function readRecommendationCardRow(card: HTMLElement) {
  const paragraphs = Array.from(card.querySelectorAll('p')).map((item) => text(item));
  const metric = text(card.querySelector('.recommendation-metrics strong'));
  return [
    text(card.querySelector('h3')),
    text(card.querySelector('.priority-pill')),
    text(card.querySelector('.soft-tag')),
    paragraphs[0] || '',
    metric,
    paragraphs[1] || '',
    paragraphs[2] || '',
    text(card.querySelector('.recommendation-foot small')),
  ];
}

function readMiniCreativeRow(card: HTMLElement) {
  return [
    text(card.querySelector('strong')),
    text(card.querySelector('span')),
    text(card.querySelector('small')),
  ];
}

function readTableRows(table: HTMLTableElement) {
  return Array.from(table.querySelectorAll('tr'))
    .map((row) => Array.from(row.querySelectorAll('th, td')).map((cell) => cleanCellText(cell.textContent || cell.getAttribute('aria-label') || '')))
    .filter((row) => row.some(Boolean));
}

function cleanCellText(value: string) {
  return value
    .replace(/[↕▲▼]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function text(element: Element | null) {
  return cleanCellText(element?.textContent || '');
}

function readDefinitionValue(card: HTMLElement, label: string) {
  const row = Array.from(card.querySelectorAll<HTMLElement>('.creative-card-field-row'))
    .find((item) => text(item.querySelector('dt')).toLowerCase() === label.toLowerCase());
  return text(row?.querySelector('dd') ?? null);
}

function readCreativeStats(card: HTMLElement) {
  const stats: Record<string, string> = {};
  Array.from(card.querySelectorAll<HTMLElement>('.creative-stats span')).forEach((item) => {
    const value = text(item.querySelector('strong'));
    const label = cleanCellText((item.textContent || '').replace(value, '')).split(' ')[0];
    if (label) stats[label] = value;
  });
  return stats;
}

function isVisible(element: HTMLElement) {
  return element.offsetParent !== null;
}

function toCsvRow(row: string[]) {
  return row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',');
}

function findNearestHeading(table: HTMLTableElement) {
  let current: Element | null = table;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    const heading = current.querySelector?.('.section-heading h2, h2, h3');
    const text = heading?.textContent?.trim();
    if (text) return text;
    current = current.parentElement;
  }

  return '';
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    if (character === '&') return '&amp;';
    if (character === '<') return '&lt;';
    if (character === '>') return '&gt;';
    if (character === '"') return '&quot;';
    return '&#39;';
  });
}
