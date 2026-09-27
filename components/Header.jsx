'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Header({ data }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const { logoText, nav = [], cta } = data.props || {};

  return (
    <header className="border-b border-hairline bg-paper/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-content mx-auto px-6 flex items-center justify-between h-16">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-ink">
          {logoText || 'Vireon Labs'}
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[15px] text-slate hover:text-ink transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          {cta && (
            <Link
              href={cta.href}
              className="inline-flex items-center rounded-none border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-signal hover:border-signal transition-colors"
            >
              {cta.label}
            </Link>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="md:hidden flex flex-col justify-center gap-1.5 w-8 h-8"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`h-[2px] w-6 bg-ink transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`h-[2px] w-6 bg-ink transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span className={`h-[2px] w-6 bg-ink transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-hairline bg-paper px-6 py-4 flex flex-col gap-4">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-ink" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          {cta && (
            <Link
              href={cta.href}
              onClick={() => setOpen(false)}
              className="inline-flex w-fit items-center border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper"
            >
              {cta.label}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
