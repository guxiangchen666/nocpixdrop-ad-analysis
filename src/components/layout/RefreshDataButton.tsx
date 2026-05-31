'use client';

import { Button } from 'animal-island-ui';
import { useState } from 'react';
import { clearDataBundleCache } from '../../services/dataStore';

export function RefreshDataButton() {
  const [refreshing, setRefreshing] = useState(false);

  const refreshData = () => {
    setRefreshing(true);
    clearDataBundleCache();
    window.setTimeout(() => {
      window.location.reload();
    }, 80);
  };

  return (
    <Button className="refresh-data-button" size="small" disabled={refreshing} onClick={refreshData}>
      {refreshing ? 'Refreshing...' : 'Refresh Data'}
    </Button>
  );
}
