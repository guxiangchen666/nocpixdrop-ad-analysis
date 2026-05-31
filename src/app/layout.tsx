import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import 'animal-island-ui/style';
import './globals.css';
import { AppShell } from '../components/layout/AppShell';
import { sourceModes } from '../config/dataSource';

export const metadata: Metadata = {
  title: 'Meta Ads Creative Dashboard',
  description: 'Mock Meta ads and creative analysis dashboard',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppShell sourceModes={sourceModes}>{children}</AppShell>
      </body>
    </html>
  );
}
