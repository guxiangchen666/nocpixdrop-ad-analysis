'use client';

import { Card } from 'animal-island-ui';
import Link from 'next/link';
import type { CreativeRecord } from '../../types/creatives';

export function TopCreatives({ creatives }: { creatives: CreativeRecord[] }) {
  return (
    <Card className="top-creatives">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Creative signals</p>
          <h2>Top Creatives</h2>
        </div>
      </div>
      <div className="mini-creative-list">
        {creatives.map((creative) => {
          const thumbnail = creative.originalImageFileUrl || creative.thumbnailUrl || creative.imageUrl;
          return (
            <Link key={creative.creativeId} href={`/creatives/${creative.creativeId}`} className="mini-creative">
              {thumbnail ? <img src={thumbnail} alt={creative.creativeName} /> : <div className="ad-modal-thumb-placeholder">No Creative</div>}
              <div>
                <strong>{creative.creativeName}</strong>
                <span>{creative.product || 'Uncategorized'}</span>
                <small>{creative.creativeType} · {creative.aiAnalysisStatus}</small>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
