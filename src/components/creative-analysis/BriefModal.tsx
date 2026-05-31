'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { CreativeBrief } from '../../types/aiRecommendations';
import { copyText } from '../../utils/clipboard';
import { downloadMarkdown } from '../../utils/downloadMarkdown';

interface BriefModalProps {
  brief: CreativeBrief | null;
  open: boolean;
  onClose: () => void;
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function BriefModal({ brief, open, onClose }: BriefModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [copiedBriefId, setCopiedBriefId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!brief || !open) return null;

  const copyMarkdown = async () => {
    await copyText(brief.markdown);
    setCopiedBriefId(brief.id);
    window.setTimeout(() => setCopiedBriefId(null), 1400);
  };

  const handleTrapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter((element) => !element.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="brief-modal-overlay open" onMouseDown={onClose}>
      <div
        ref={modalRef}
        className="brief-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleTrapFocus}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="brief-modal-header">
          <div>
            <p className="eyebrow">Creative Brief</p>
            <h2 id={titleId}>素材制作 Brief · {brief.recommendationTitle}</h2>
          </div>
          <button ref={closeButtonRef} type="button" className="ad-modal-close clickable" aria-label="Close brief" onClick={onClose}>×</button>
        </header>

        <div className="brief-modal-content">
          <MarkdownPreview markdown={brief.markdown} />
        </div>

        <footer className="brief-modal-actions">
          <button type="button" className="ai-action-button clickable" onClick={copyMarkdown}>
            {copiedBriefId === brief.id ? '已复制 Markdown' : '复制 Markdown'}
          </button>
          <button type="button" className="ai-action-button primary clickable" onClick={() => downloadMarkdown(brief.markdown, `${brief.productSku}-${brief.recommendationTitle}-brief.md`)}>
            下载 .md
          </button>
          <button type="button" className="ai-action-button clickable" disabled title="TODO: 接入 PDF 导出服务">
            PDF 导出后续接入
          </button>
          <button type="button" className="ai-action-button clickable" onClick={onClose}>
            关闭
          </button>
        </footer>
      </div>
    </div>
  );
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const blocks = markdown.split('\n').filter((line) => line.trim().length > 0);
  return (
    <div className="brief-markdown-preview">
      {blocks.map((line, index) => (
        <MarkdownLine key={`${line}-${index}`} line={line} />
      ))}
    </div>
  );
}

function MarkdownLine({ line }: { line: string }) {
  if (line.startsWith('# ')) return <h1>{line.replace('# ', '')}</h1>;
  if (line.startsWith('## ')) return <h2>{line.replace('## ', '')}</h2>;
  if (line.startsWith('- ')) return <p className="brief-list-line">{line.replace('- ', '')}</p>;
  return <p>{renderInline(line)}</p>;
}

function renderInline(line: string): ReactNode {
  return line;
}
