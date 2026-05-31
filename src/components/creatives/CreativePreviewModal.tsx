'use client';

import { useEffect, useId, useRef } from 'react';
import type { MouseEvent } from 'react';
import { createPortal } from 'react-dom';

interface CreativePreviewModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  mediaUrl?: string;
  posterUrl?: string;
  mediaType?: 'video' | 'image' | 'dynamic' | 'unknown';
  note?: string;
  onClose: () => void;
}

export function CreativePreviewModal({ open, title, subtitle, mediaUrl, posterUrl, mediaType = 'unknown', note, onClose }: CreativePreviewModalProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hasVideo = mediaType === 'video' && Boolean(mediaUrl);
  const previewImage = posterUrl || mediaUrl;

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

  if (!open) return null;

  const closeFromOverlay = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onClose();
  };

  const modal = (
    <div className="creative-preview-overlay" onMouseDown={closeFromOverlay}>
      <section
        className="creative-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="creative-preview-header">
          <div>
            <p className="eyebrow">Creative Preview</p>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
          <button ref={closeButtonRef} type="button" className="ad-modal-close clickable" aria-label="Close creative preview" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="creative-preview-stage">
          {hasVideo ? (
            <video src={mediaUrl} poster={posterUrl} controls autoPlay muted playsInline />
          ) : previewImage ? (
            <div className="creative-preview-poster">
              <img src={previewImage} alt={title} />
              <span className="creative-preview-play" aria-hidden="true">▶</span>
            </div>
          ) : (
            <div className="creative-preview-empty">No creative media</div>
          )}
        </div>

        {note ? (
          <p className="creative-preview-note">{note}</p>
        ) : !hasVideo ? (
          <p className="creative-preview-note">{mediaType === 'video' ? '当前暂无可播放视频源，仅展示缩略图和广告内容。' : '当前素材为静态预览。'}</p>
        ) : null}
      </section>
    </div>
  );

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
}
