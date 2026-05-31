'use client';

import { Button, Modal } from 'animal-island-ui';
import type { AdDailyRecord } from '../../types/ads';
import type { CreativeRecord } from '../../types/creatives';
import { formatAudienceLabel } from '../../utils/audience';
import { money, percent, roas } from '../../utils/format';

interface AdDetailPanelProps {
  ad?: AdDailyRecord;
  creative?: CreativeRecord;
  open: boolean;
  onClose: () => void;
}

export function AdDetailPanel({ ad, creative, open, onClose }: AdDetailPanelProps) {
  if (!ad) return null;

  return (
    <Modal open={open} title="Ad Detail" onClose={onClose} footer={<Button type="primary" onClick={onClose}>Close</Button>} width={760} typewriter={false}>
      <div className="detail-panel">
        <div className="detail-hero">
          {creative?.originalImageFileUrl || creative?.thumbnailUrl || creative?.imageUrl ? <img src={creative.originalImageFileUrl || creative.thumbnailUrl || creative.imageUrl} alt={creative.creativeName} /> : null}
          <div>
            <p className="eyebrow">{ad.effectiveStatus}</p>
            <h2>{ad.adName}</h2>
            <p>{ad.campaignName} / {ad.adsetName}</p>
          </div>
        </div>
        <div className="metric-strip">
          <span>Spend <strong>{money(ad.spend)}</strong></span>
          <span>Purchase <strong>{ad.purchase}</strong></span>
          <span>ROAS <strong>{roas(ad.roas)}</strong></span>
          <span>CPA <strong>{money(ad.cpa, 2)}</strong></span>
          <span>CTR <strong>{percent(ad.ctr ?? 0)}</strong></span>
        </div>
        <dl className="detail-list">
          <div><dt>Product</dt><dd>{ad.product}</dd></div>
          <div><dt>Audience</dt><dd><span title={ad.audience}>{formatAudienceLabel(ad.audience)}</span></dd></div>
          <div><dt>Objective</dt><dd>{ad.objective}</dd></div>
          <div><dt>Optimization Goal</dt><dd>{ad.optimizationGoal}</dd></div>
          <div><dt>Creative</dt><dd>{creative?.creativeName || ad.creativeId || ad.adId}</dd></div>
          <div><dt>Landing Page</dt><dd>{creative?.landingPageUrl || '-'}</dd></div>
        </dl>
      </div>
    </Modal>
  );
}
