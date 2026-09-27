'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/admin', label: 'Pages' },
  { href: '/admin/components', label: 'Header & footer' },
  { href: '/admin/assets', label: 'Assets' },
  { href: '/admin/theme', label: 'Theme' },
  { href: '/admin/visitors', label: 'Visitors' },
  { href: '/admin/export-import', label: 'Export & import' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isLoginRoute = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginRoute) {
      setReady(true);
      return;
    }
    const token = window.localStorage.getItem('cms_token');
    if (!token) {
      router.replace('/admin/login');
      return;
    }
    setReady(true);
  }, [isLoginRoute, router]);

  if (isLoginRoute) return <div className="min-h-screen bg-[#0E1526]">{children}</div>;
  if (!ready) return null;

  function logout() {
    window.localStorage.removeItem('cms_token');
    router.replace('/admin/login');
  }

  return (
    <div className="min-h-screen bg-[#F5F5F2] font-body text-ink flex">
      <aside className="w-60 shrink-0 border-r border-hairline bg-paper flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-hairline">
          <span className="font-display font-bold text-lg">Admin console</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 text-sm rounded ${
                pathname === item.href ? 'bg-ink text-paper' : 'text-slate hover:bg-ink/5'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-hairline space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="block px-3 py-2 text-sm text-slate hover:bg-ink/5 rounded"
          >
            View site ↗
          </a>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-slate hover:bg-ink/5 rounded"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
