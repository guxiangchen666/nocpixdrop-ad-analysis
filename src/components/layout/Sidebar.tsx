'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import brandLogo from '../../assets/brand-logo.png';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', hint: '总览' },
  { to: '/ads', label: 'Ads', hint: '运行中广告' },
  { to: '/creatives', label: 'Creatives', hint: '素材库' },
  { to: '/creative-analysis', label: 'Creative Analysis', hint: '素材分析' },
  { to: '/recommendations', label: 'Recommendations', hint: '建议' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <img src={brandLogo.src} alt="" />
          </span>
          <div>
            <strong>Meta Creative</strong>
            <span>内部分析台</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link key={item.to} href={item.to} className={`nav-item ${isActive ? 'active' : ''}`}>
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
