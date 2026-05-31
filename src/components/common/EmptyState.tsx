'use client';

import { Button } from 'animal-island-ui';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-hint">
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction ? <Button type="dashed" size="small" onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}
