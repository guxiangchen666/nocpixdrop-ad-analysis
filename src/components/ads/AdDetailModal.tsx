'use client';

import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { AdDailyRecord } from '../../types/ads';
import type { CreativeRecord } from '../../types/creatives';
import type { TrendRange } from '../../utils/mockTrend';
import { formatAudienceLabel } from '../../utils/audience';
import { money, percent, roas } from '../../utils/format';
import { CreativePreviewModal } from '../creatives/CreativePreviewModal';
import { AdTrendChart } from './AdTrendChart';

interface AdDetailModalProps {
  ad: AdDailyRecord | null;
  creative?: CreativeRecord;
  open: boolean;
  trendRange: TrendRange;
  onRangeChange: (range: TrendRange) => void;
  onClose: () => void;
  onExited: () => void;
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const AdDetailModal = memo(function AdDetailModal({ ad, creative, open, trendRange, onRangeChange, onClose, onExited }: AdDetailModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const closeAdDetail = useCallback(() => {
    setPreviewOpen(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open && ad) {
      restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    }
  }, [ad, open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (previewOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAdDetail();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeAdDetail, open, previewOpen]);

  if (!ad) return null;

  const statusTone = ad.effectiveStatus === 'PAUSED' ? 'paused' : ad.effectiveStatus === 'ACTIVE' ? 'active' : 'default';
  const playableVideoUrl = creative?.originalVideoFileUrl || creative?.videoUrl;
  const posterUrl = creative?.originalImageFileUrl || creative?.thumbnailUrl || creative?.imageUrl;
  const heroPreviewUrl = posterUrl || playableVideoUrl;

  const handleAnimationEnd = () => {
    if (!open) {
      restoreFocusRef.current?.focus();
      onExited();
    }
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
    <div className={`ad-modal-overlay ${open ? 'open' : 'closing'}`} onMouseDown={closeAdDetail} onAnimationEnd={handleAnimationEnd}>
      <div
        ref={modalRef}
        className={`ad-detail-modal status-${statusTone} ${open ? 'open' : 'closing'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleTrapFocus}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ad-modal-header">
          <h2 id={titleId}>Ad Detail</h2>
          <button ref={closeButtonRef} type="button" className="ad-modal-close clickable" aria-label="Close ad detail" onClick={closeAdDetail}>×</button>
        </header>

        <div className="ad-modal-content">
          <section className="ad-modal-hero">
            {heroPreviewUrl && creative ? (
              <button type="button" className="ad-modal-thumb-button clickable" aria-label={`Preview ${creative.creativeName}`} onClick={() => setPreviewOpen(true)}>
                {posterUrl ? (
                  <img src={posterUrl} alt={creative.creativeName} />
                ) : (
                  <video src={playableVideoUrl} muted playsInline preload="metadata" />
                )}
                <span className="creative-preview-trigger-icon small" aria-hidden="true">▶</span>
              </button>
            ) : (
              <div className="ad-modal-thumb-placeholder">No Creative</div>
            )}
            <div>
              <span className={`ad-status-badge ${statusTone}`}>{ad.effectiveStatus}</span>
              <h3>{ad.adName}</h3>
              <p>{ad.campaignName} / {ad.adsetName}</p>
            </div>
          </section>

          <section className="ad-modal-metrics" aria-label="Core metrics">
            <Metric label="Spend" value={money(ad.spend)} />
            <Metric label="Purchase" value={String(ad.purchase)} />
            <Metric label="ROAS" value={roas(ad.roas)} />
            <Metric label="CPA" value={money(ad.cpa, 2)} />
            <Metric label="CTR" value={percent(ad.ctr ?? 0)} />
          </section>

          <dl className="ad-modal-details">
            <DetailRow label="Product">{ad.product}</DetailRow>
            <DetailRow label="Audience"><span title={ad.audience}>{formatAudienceLabel(ad.audience)}</span></DetailRow>
            <DetailRow label="Objective">{ad.objective}</DetailRow>
            <DetailRow label="Optimization Goal">{ad.optimizationGoal}</DetailRow>
            <DetailRow label="Creative">{creative?.creativeName || creative?.creativeId || ad.creativeId || '未关联素材'}</DetailRow>
            <DetailRow label="Landing Page">
              {creative?.landingPageUrl ? (
                <a className="ad-external-link clickable" href={creative.landingPageUrl} target="_blank" rel="noopener noreferrer">
                  {creative.landingPageUrl}
                  <ExternalLinkIcon />
                </a>
              ) : (
                <span className="ad-empty-value">—</span>
              )}
            </DetailRow>
          </dl>

          <AdTrendChart ad={ad} range={trendRange} onRangeChange={onRangeChange} />
        </div>

      </div>
      {creative ? (
        <CreativePreviewModal
          open={previewOpen}
          title={creative.creativeName}
          subtitle={creative.description}
          mediaUrl={playableVideoUrl || posterUrl}
          posterUrl={posterUrl}
          mediaType={playableVideoUrl ? 'video' : creative.creativeType}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
});

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="ad-modal-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M14 4h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14 20 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
