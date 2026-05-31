'use client';

import { useEffect, useState } from 'react';

export const DATA_REFRESH_EVENT = 'ads-dashboard:data-refresh';

export function useDataRefreshSignal() {
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    const handleRefresh = () => setRefreshSignal((current) => current + 1);

    window.addEventListener(DATA_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(DATA_REFRESH_EVENT, handleRefresh);
  }, []);

  return refreshSignal;
}
