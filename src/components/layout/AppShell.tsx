import type { ReactNode } from 'react';
import type { SourceModes } from '../../config/dataSource';
import { Sidebar } from './Sidebar';
import { ClientEffects } from './ClientEffects';

export function AppShell({ children, sourceModes }: { children: ReactNode; sourceModes: SourceModes }) {
  return (
    <div className="app-shell">
      <script id="data-source-state" type="application/json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(sourceModes) }} />
      <ClientEffects />
      <Sidebar />
      <main className="main-panel">
        <section className="page-surface">
          {children}
        </section>
      </main>
    </div>
  );
}
