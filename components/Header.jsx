'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { DEFAULT_LOCALE } from '../lib/localeCatalog';

function LanguageSwitcher({ locale, enabledLocales }) {
  const router = useRouter();
  const pathname = usePathname() || '/';

  if (!enabledLocales || enabledLocales.length < 2) return null;

  const prefix = locale !== DEFAULT_LOCALE ? `/${locale}` : '';
  const remainder = prefix && pathname.startsWith(prefix) ? pathname.slice(prefix.length) || '/' : pathname;

  function targetFor(code) {
    if (code === DEFAULT_LOCALE) return remainder;
    return remainder === '/' ? `/${code}` : `/${code}${remainder}`;
  }

  return (
    <select
      aria-label="Choose language"
      value={locale}
      onChange={(e) => router.push(targetFor(e.target.value))}
      className="lang-switcher"
    >
      {enabledLocales.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

export default function Header({ data, locale = DEFAULT_LOCALE, enabledLocales = [] }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const { logoText, nav = [], cta } = data.props || {};
  const home = locale === DEFAULT_LOCALE ? '/' : `/${locale}`;

  return (
    <header className="site-header">
      <div className="site-header__bar">
        <Link href={home} className="site-header__logo">
          {logoText || 'Vireon Labs'}
        </Link>

        <nav className="site-header__nav">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="site-header__nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-header__actions">
          <LanguageSwitcher locale={locale} enabledLocales={enabledLocales} />
          {cta && (
            <Link href={cta.href} className="site-header__cta">
              {cta.label}
            </Link>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="site-header__burger"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`site-header__burger-line ${open ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`site-header__burger-line--fade ${open ? 'opacity-0' : ''}`} />
          <span className={`site-header__burger-line ${open ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="site-header__mobile-menu">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="site-header__mobile-link"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2">
            <LanguageSwitcher locale={locale} enabledLocales={enabledLocales} />
          </div>
          {cta && (
            <Link href={cta.href} onClick={() => setOpen(false)} className="site-header__mobile-cta">
              {cta.label}
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
