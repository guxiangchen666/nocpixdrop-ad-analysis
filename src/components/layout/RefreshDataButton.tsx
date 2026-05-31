'use client';

import { Button } from 'animal-island-ui';
import { useState } from 'react';
import { DATA_REFRESH_EVENT } from '../../hooks/useDataRefreshSignal';
import { clearDataBundleCache } from '../../services/dataStore';

export function RefreshDataButton() {
  const [refreshing, setRefreshing] = useState(false);

  const refreshData = () => {
    setRefreshing(true);
    clearDataBundleCache();
    window.dispatchEvent(new Event(DATA_REFRESH_EVENT));
    window.setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <Button className="refresh-data-button" size="small" disabled={refreshing} onClick={refreshData}>
      {refreshing ? 'Refreshing...' : 'Refresh Data'}
    </Button>
  );
}
