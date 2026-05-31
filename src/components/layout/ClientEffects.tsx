'use client';

import { useEffect } from 'react';
import { initCursorFx } from '../../effects/cursorFx';

export function ClientEffects() {
  useEffect(() => {
    const controller = initCursorFx({ enabled: true, color: '#c9a96a' });
    return () => controller.destroy();
  }, []);

  return null;
}
