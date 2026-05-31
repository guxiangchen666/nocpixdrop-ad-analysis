'use client';

import { Button, Card } from 'animal-island-ui';
import Link from 'next/link';
import { useState } from 'react';
import type { CreativeAssetGroup } from '../../types/creatives';
import { money, roas } from '../../utils/format';
import { CreativePreviewModal } from './CreativePreviewModal';

interface CreativeCardProps {
  group: CreativeAssetGroup;
  metricLabel: string;
}

export function CreativeCard({ group, metricLabel }: CreativeCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const playableVideoUrl = group.originalVideoFileUrl || group.videoUrl;
  const previewImage = playableVideoUrl ? group.thumbnailUrl || group.imageUrl : group.previewUrl || group.thumbnailUrl || group.imageUrl;
  const canPreview = Boolean(playableVideoUrl || previewImage);
  const modalMediaUrl = playableVideoUrl || previewImage;
  const modalMediaType = playableVideoUrl ? 'video' : previewImage ? 'image' : 'unknown';
  const relatedCountLabel = `关联 ${group.creativeIds.length} 个 Creative / ${group.adIds.length} 个 Ads`;
  const previewNote = group.creativeType === 'video' && !playableVideoUrl ? '当前暂无可播放视频源，仅展示缩略图和广告内容。' : undefined;
  const assetHref = `/assets/${encodeURIComponent(group.assetGroupKey)}`;

  return (
    <Card className="creative-card">
      {canPreview ? (
        <button type="button" className="creative-card-preview-button clickable" aria-label={`Preview asset ${group.assetGroupKey}`} onClick={() => setPreviewOpen(true)}>
          {playableVideoUrl ? (
            <div className="creative-card-video-preview">
              <video className="creative-thumb" src={playableVideoUrl} muted playsInline preload="metadata" />
              <span className="creative-video-chip">Video</span>
            </div>
          ) : (
            <img className="creative-thumb" src={previewImage} alt={group.name} />
          )}
        </button>
      ) : (
        <div className="ad-modal-thumb-placeholder creative-thumb">暂无素材预览</div>
      )}
      <div className="creative-card-body">
        <div className="creative-title-row">
          <span className={`type-pill ${group.creativeType || 'unknown'}`}>{group.creativeType || 'unknown'}</span>
          <span className="soft-tag">{group.aiAnalysisStatus || '未判断'}</span>
        </div>
        <div className="creative-card-identity">
          <span>{relatedCountLabel}</span>
          <h3 className="creative-card-title" title={group.name}>{group.name}</h3>
        </div>
        <dl className="compact-list creative-card-fields">
          <div className="creative-card-field-row">
            <dt>Product</dt>
            <dd className="creative-card-field-value single-line">{group.product || '-'}</dd>
          </div>
          <div className="creative-card-field-row">
            <dt>Asset Group</dt>
            <dd className="creative-card-field-value single-line">{group.assetGroupKey}</dd>
          </div>
          <div className="creative-card-field-row">
            <dt>Asset Source</dt>
            <dd className="creative-card-field-value single-line">{group.previewUrl || '-'}</dd>
          </div>
          <div className="creative-card-field-row">
            <dt>Top Audience</dt>
            <dd className="creative-card-field-value single-line">{group.topAudience || '-'}</dd>
          </div>
          <div className="creative-card-field-row">
            <dt>Top Copy</dt>
            <dd className="creative-card-field-value single-line">{group.topCopy || '-'}</dd>
          </div>
        </dl>
        <div className="creative-stats">
          <span>ROAS {metricLabel} <strong>{roas(group.roas)}</strong></span>
          <span>CPA {metricLabel} <strong>{money(group.cpa, 2)}</strong></span>
          <span>Spend {metricLabel} <strong>{money(group.spend)}</strong></span>
          <span>Purchase {metricLabel} <strong>{group.purchase}</strong></span>
        </div>
        <Link className="creative-card-action" href={assetHref}>
          <Button type="primary" block>Open Asset</Button>
        </Link>
      </div>
      <CreativePreviewModal
        open={previewOpen}
        title={group.name}
        subtitle={[group.product, group.creativeType, relatedCountLabel].filter(Boolean).join(' / ')}
        mediaUrl={modalMediaUrl}
        posterUrl={previewImage}
        mediaType={modalMediaType}
        note={previewNote}
        onClose={() => setPreviewOpen(false)}
      />
    </Card>
  );
}
