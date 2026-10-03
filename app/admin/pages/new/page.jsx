'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPage, listComponents, listLocales } from '../../../../lib/api';
import { DEFAULT_LOCALE } from '../../../../lib/localeCatalog';

export default function NewPage() {
  const router = useRouter();
  const [headers, setHeaders] = useState([]);
  const [footers, setFooters] = useState([]);
  const [locales, setLocales] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    routeType: 'static',
    paramName: '',
    navLabel: '',
    showInNav: true,
    headerId: '',
    footerId: '',
    locale: DEFAULT_LOCALE,
  });

  useEffect(() => {
    listComponents('header').then(setHeaders).catch(() => {});
    listComponents('footer').then(setFooters).catch(() => {});
    listLocales().then((d) => setLocales(d.enabled)).catch(() => {});
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const page = await createPage({
        title: form.title,
        slug: form.slug || undefined,
        locale: form.locale,
        routeType: form.routeType,
        paramName: form.routeType === 'dynamic' ? form.paramName : null,
        navLabel: form.navLabel || form.title,
        showInNav: form.showInNav,
        headerId: form.headerId ? Number(form.headerId) : null,
        footerId: form.footerId ? Number(form.footerId) : null,
      });
      router.push(`/admin/pages/${page.id}/edit`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <Link href="/admin" className="text-sm text-slate hover:text-ink">
        ← Back to pages
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mt-3">New page</h1>
      <p className="text-sm text-slate mt-1">
        Give the page a route, then add content blocks after creating it.
      </p>

      {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm text-slate mb-1.5">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink"
            placeholder="e.g. Case Studies"
          />
        </div>

        {locales.length > 1 && (
          <div>
            <label className="block text-sm text-slate mb-1.5">Language</label>
            <select
              value={form.locale}
              onChange={(e) => set('locale', e.target.value)}
              className="w-full border border-hairline px-3 py-2.5 bg-paper"
            >
              {locales.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                  {l.code === DEFAULT_LOCALE ? ' (default, served at /)' : ` (served at /${l.code}/...)`}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate">
              A translation shares its slug with the same page in other languages — use the same slug as the
              English version if you want them linked.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm text-slate mb-1.5">Route type</label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.routeType === 'static'}
                onChange={() => set('routeType', 'static')}
              />
              Static slug
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.routeType === 'dynamic'}
                onChange={() => set('routeType', 'dynamic')}
              />
              Dynamic (URL parameter)
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate mb-1.5">
            {form.routeType === 'dynamic' ? 'Slug pattern' : 'Slug'}
          </label>
          <input
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink font-mono text-sm"
            placeholder={form.routeType === 'dynamic' ? 'solutions/:industrySlug' : 'about (blank = auto from title)'}
          />
          {form.routeType === 'dynamic' && (
            <p className="mt-1.5 text-xs text-slate">
              Use a <code>:paramName</code> segment. Any URL matching the pattern renders this page, with the
              matched value available in block content as <code>{'{{paramName}}'}</code>.
            </p>
          )}
        </div>

        {form.routeType === 'dynamic' && (
          <div>
            <label className="block text-sm text-slate mb-1.5">Parameter name</label>
            <input
              value={form.paramName}
              onChange={(e) => set('paramName', e.target.value)}
              className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink font-mono text-sm"
              placeholder="industrySlug"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate mb-1.5">Header component</label>
            <select
              value={form.headerId}
              onChange={(e) => set('headerId', e.target.value)}
              className="w-full border border-hairline px-3 py-2.5 bg-paper"
            >
              <option value="">Use theme default</option>
              {headers.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate mb-1.5">Footer component</label>
            <select
              value={form.footerId}
              onChange={(e) => set('footerId', e.target.value)}
              className="w-full border border-hairline px-3 py-2.5 bg-paper"
            >
              <option value="">Use theme default</option>
              {footers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showInNav"
            checked={form.showInNav}
            onChange={(e) => set('showInNav', e.target.checked)}
          />
          <label htmlFor="showInNav" className="text-sm text-slate">
            Show in header navigation (static pages only)
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-ink text-paper px-5 py-3 text-sm font-medium hover:bg-signal transition-colors disabled:opacity-60"
        >
          {saving ? 'Creating…' : 'Create page'}
        </button>
      </form>
    </div>
  );
}
