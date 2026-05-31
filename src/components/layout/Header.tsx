'use client';

import { Button } from 'animal-island-ui';

export function Header() {
  return (
    <header className="topbar">
      <div className="topbar-actions">
        <Button type="primary" size="small">Export View</Button>
      </div>
    </header>
  );
}
