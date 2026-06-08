'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  {
    href: '/',
    label: 'Overview',
    badge: null,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="5" height="5" stroke="currentColor" strokeWidth="0.75" opacity="0.8"/>
        <rect x="8" y="1" width="5" height="3" stroke="currentColor" strokeWidth="0.75" opacity="0.5"/>
        <rect x="1" y="8" width="5" height="5" stroke="currentColor" strokeWidth="0.75" opacity="0.5"/>
        <rect x="8" y="6" width="5" height="7" stroke="currentColor" strokeWidth="0.75" opacity="0.5"/>
      </svg>
    ),
  },
  {
    href: '/workflows',
    label: 'Workflows',
    badge: null,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="5" height="4" stroke="currentColor" strokeWidth="0.75" opacity="0.8"/>
        <rect x="8" y="1" width="5" height="4" stroke="currentColor" strokeWidth="0.75" opacity="0.5"/>
        <rect x="1" y="9" width="5" height="4" stroke="currentColor" strokeWidth="0.75" opacity="0.5"/>
        <rect x="8" y="9" width="5" height="4" stroke="currentColor" strokeWidth="0.75" opacity="0.5"/>
        <line x1="3.5" y1="5" x2="3.5" y2="9" stroke="currentColor" strokeWidth="0.6" opacity="0.4"/>
        <line x1="10.5" y1="5" x2="10.5" y2="9" stroke="currentColor" strokeWidth="0.6" opacity="0.4"/>
      </svg>
    ),
  },
  {
    href: '/agents',
    label: 'Agents',
    badge: null,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="0.75" opacity="0.8"/>
        <circle cx="7" cy="5" r="1" fill="currentColor" opacity="0.6"/>
        <path d="M 2,13 A 5,5 0 0,1 12,13" stroke="currentColor" strokeWidth="0.75" opacity="0.5"/>
      </svg>
    ),
  },
  {
    href: '/tasks',
    label: 'Tasks',
    badge: null,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" strokeWidth="0.75" opacity="0.8"/>
        <line x1="1" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="0.75" opacity="0.6"/>
        <line x1="1" y1="11" x2="11" y2="11" stroke="currentColor" strokeWidth="0.75" opacity="0.4"/>
        <circle cx="12" cy="11" r="1.5" stroke="currentColor" strokeWidth="0.6" opacity="0.5"/>
      </svg>
    ),
  },
  {
    href: '/executions',
    label: 'Executions',
    badge: null,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polyline points="1,12 4,8 6,10 9,4 13,2" stroke="currentColor" strokeWidth="0.75" opacity="0.8" strokeLinejoin="round" fill="none"/>
        <circle cx="4" cy="8" r="1" fill="currentColor" opacity="0.5"/>
        <circle cx="9" cy="4" r="1" fill="currentColor" opacity="0.5"/>
      </svg>
    ),
  },
  {
    href: '/briefings',
    label: 'Briefings',
    badge: null,
    icon: (
      <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="1" width="10" height="12" stroke="currentColor" strokeWidth="0.75" opacity="0.7"/>
        <line x1="4" y1="4.5" x2="10" y2="4.5" stroke="currentColor" strokeWidth="0.6" opacity="0.5"/>
        <line x1="4" y1="6.5" x2="10" y2="6.5" stroke="currentColor" strokeWidth="0.6" opacity="0.4"/>
        <line x1="4" y1="8.5" x2="8" y2="8.5" stroke="currentColor" strokeWidth="0.6" opacity="0.3"/>
        <circle cx="10.5" cy="9.5" r="1.5" fill="#C4A97C" opacity="0.8"/>
      </svg>
    ),
  },
];

export default function Sidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [time, setTime] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    function tick() {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setTime(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">NYX</div>
        <div className="sidebar-logo-sub">
          <span className="sidebar-logo-dot" />
          Autonomous OS
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <div className="sidebar-section-label">Operations</div>
        {navItems.map((item) => {
          const isActive = pathname != null && (
            item.href === '/' ? pathname === '/' : (pathname === item.href || pathname.startsWith(item.href + '/'))
          );
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-item-icon" style={{ width: 14, height: 14 }}>
                {item.icon}
              </span>
              {item.label}
              {item.badge && (
                <span className="nav-item-badge">{item.badge}</span>
              )}
            </Link>
          );
        })}

        <Link
          href="/control"
          className={`nav-item${pathname === '/control' ? ' active' : ''}`}
        >
          <span className="nav-item-icon" style={{ width: 14, height: 14 }}>
            <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="0.75" opacity="0.7"/>
              <line x1="1" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
              <circle cx="4" cy="3" r="0.7" fill="currentColor" opacity="0.6"/>
              <circle cx="6.5" cy="3" r="0.7" fill="currentColor" opacity="0.4"/>
              <circle cx="9" cy="3" r="0.7" fill="currentColor" opacity="0.4"/>
              <rect x="2.5" y="7" width="4" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="0.6" opacity="0.5"/>
              <rect x="7.5" y="7" width="4" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="0.6" opacity="0.5"/>
            </svg>
          </span>
          Control
        </Link>

        <div className="sidebar-section-label" style={{ marginTop: 12 }}>Intelligence</div>
        <Link
          href="/voice"
          className={`nav-item${pathname === '/voice' ? ' active' : ''}`}
        >
          <span className="nav-item-icon" style={{ width: 14, height: 14 }}>
            <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="1" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="0.75" opacity="0.8"/>
              <path d="M2 6.5C2 9.538 4.238 12 7 12C9.762 12 12 9.538 12 6.5" stroke="currentColor" strokeWidth="0.75" opacity="0.6" strokeLinecap="round"/>
              <line x1="7" y1="12" x2="7" y2="14" stroke="currentColor" strokeWidth="0.75" opacity="0.4" strokeLinecap="round"/>
            </svg>
          </span>
          Voice
        </Link>
        <Link
          href="/jarvis"
          className={`nav-item${pathname === '/jarvis' ? ' active' : ''}`}
        >
          <span className="nav-item-icon" style={{ width: 14, height: 14 }}>
            <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="0.75" opacity="0.8"/>
              <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="0.6" opacity="0.6"/>
              <circle cx="7" cy="7" r="0.75" fill="currentColor" opacity="0.8"/>
              <line x1="7" y1="1" x2="7" y2="2.5" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
              <line x1="7" y1="11.5" x2="7" y2="13" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
              <line x1="1" y1="7" x2="2.5" y2="7" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
              <line x1="11.5" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
            </svg>
          </span>
          Jarvis
          <span className="nav-item-badge" style={{ background: 'var(--gold-d)', color: 'var(--gold)', border: '1px solid var(--gold-d)', fontSize: 6.5 }}>HUD</span>
        </Link>
        <Link
          href="/memory"
          className={`nav-item${pathname != null && (pathname === '/memory' || pathname.startsWith('/memory/')) ? ' active' : ''}`}
        >
          <span className="nav-item-icon" style={{ width: 14, height: 14 }}>
            <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="0.75" opacity="0.8"/>
              <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="0.6" opacity="0.5"/>
              <line x1="7" y1="1" x2="7" y2="2.5" stroke="currentColor" strokeWidth="0.6" opacity="0.4"/>
              <line x1="7" y1="11.5" x2="7" y2="13" stroke="currentColor" strokeWidth="0.6" opacity="0.4"/>
              <line x1="1" y1="7" x2="2.5" y2="7" stroke="currentColor" strokeWidth="0.6" opacity="0.4"/>
              <line x1="11.5" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="0.6" opacity="0.4"/>
            </svg>
          </span>
          Memory
        </Link>

        <div className="sidebar-section-label" style={{ marginTop: 12 }}>Integrations</div>
        <Link
          key="/integrations"
          href="/integrations"
          className={`nav-item${pathname === '/integrations' ? ' active' : ''}`}
        >
          <span className="nav-item-icon" style={{ width: 14, height: 14 }}>
            <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="3" cy="7" r="2" stroke="currentColor" strokeWidth="0.75" opacity="0.8"/>
              <circle cx="11" cy="3" r="2" stroke="currentColor" strokeWidth="0.75" opacity="0.6"/>
              <circle cx="11" cy="11" r="2" stroke="currentColor" strokeWidth="0.75" opacity="0.6"/>
              <line x1="5" y1="6.3" x2="9" y2="3.7" stroke="currentColor" strokeWidth="0.6" opacity="0.4"/>
              <line x1="5" y1="7.7" x2="9" y2="10.3" stroke="currentColor" strokeWidth="0.6" opacity="0.4"/>
            </svg>
          </span>
          Integrations
        </Link>

        <div className="sidebar-section-label" style={{ marginTop: 12 }}>System</div>
        <Link href="/" className="nav-item" style={{ opacity: 0.5 }}>
          <span className="nav-item-icon" style={{ width: 14, height: 14 }}>
            <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2,8 L7,3 L12,8" stroke="currentColor" strokeWidth="0.75" opacity="0.8"/>
              <rect x="4.5" y="8" width="5" height="5" stroke="currentColor" strokeWidth="0.7" opacity="0.5"/>
            </svg>
          </span>
          Marketing Site
        </Link>
      </nav>

      <div className="sidebar-footer">
        {userEmail && (
          <div className="sidebar-user">
            <div className="sidebar-user-email">{userEmail}</div>
            <button
              className="sidebar-signout"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? '...' : 'Sign out'}
            </button>
          </div>
        )}
        <div className="sidebar-status">
          <span className="status-dot-green" />
          <span className="sidebar-status-text">All Systems Online</span>
        </div>
        <div className="sidebar-clock">{time}</div>
        <div className="sidebar-score">
          <div className="sidebar-score-bar-track">
            <div className="sidebar-score-bar-fill" style={{ width: '91%' }} />
          </div>
          <span className="sidebar-score-label">91%</span>
        </div>
        <div style={{ marginTop: 3, fontFamily: 'var(--mono)', fontSize: 7.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--t4)' }}>
          System Efficiency
        </div>
      </div>
    </aside>
  );
}
