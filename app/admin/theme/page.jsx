'use client';

import { useEffect, useState } from 'react';
import { getTheme, updateTheme, listComponents } from '../../../lib/api';

export default function ThemePage() {
  const [theme, setTheme] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [footers, setFooters] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getTheme(), listComponents('header'), listComponents('footer')])
      .then(([t, h, f]) => {
        setTheme(t);
        setHeaders(h);
        setFooters(f);
      })
      .catch((err) => setError(err.message));
  }, []);

  function set(key, value) {
    setTheme((t) => ({ ...t, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const updated = await updateTheme({
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        cssTheme: theme.cssTheme,
        defaultHeaderId: theme.defaultHeaderId ? Number(theme.defaultHeaderId) : null,
        defaultFooterId: theme.defaultFooterId ? Number(theme.defaultFooterId) : null,
      });
      setTheme(updated);
      setStatus('Theme saved — applied across every page.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!theme) {
    return <div className="px-8 py-10 text-sm text-slate">{error || 'Loading…'}</div>;
  }

  return (
    <div className="max-w-xl mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Theme</h1>
      <p className="text-sm text-slate mt-1">
        Site-wide colors and default layout. These apply to every page unless a page picks its own header or
        footer.
      </p>

      {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}
      {status && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2">{status}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <section className="space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">Design</h2>
          <p className="text-xs text-slate -mt-2">
            Switches the stylesheet the whole public site renders with. Both designs use the same pages and
            content — only the look changes, instantly, with no republishing.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: 'classic', label: 'Classic', blurb: 'Flat, editorial — hairline borders, square corners.' },
              { value: 'modern', label: 'Modern', blurb: 'Rounded cards, soft shadows, gradient accents.' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('cssTheme', opt.value)}
                className={`text-left border px-4 py-3 transition-colors ${
                  theme.cssTheme === opt.value ? 'border-ink bg-ink/[0.03]' : 'border-hairline hover:border-ink/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-ink">{opt.label}</span>
                  {theme.cssTheme === opt.value && <span className="text-xs text-signal">Active</span>}
                </div>
                <p className="mt-1 text-xs text-slate">{opt.blurb}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">Colors</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate mb-1.5">Primary color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => set('primaryColor', e.target.value)}
                  className="w-11 h-11 border border-hairline cursor-pointer"
                />
                <input
                  value={theme.primaryColor}
                  onChange={(e) => set('primaryColor', e.target.value)}
                  className="flex-1 border border-hairline px-3 py-2.5 font-mono text-sm outline-none focus:border-ink"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate">Buttons, links, accents.</p>
            </div>
            <div>
              <label className="block text-sm text-slate mb-1.5">Secondary color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.secondaryColor}
                  onChange={(e) => set('secondaryColor', e.target.value)}
                  className="w-11 h-11 border border-hairline cursor-pointer"
                />
                <input
                  value={theme.secondaryColor}
                  onChange={(e) => set('secondaryColor', e.target.value)}
                  className="flex-1 border border-hairline px-3 py-2.5 font-mono text-sm outline-none focus:border-ink"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate">Category tags, small highlights.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">
            Default layout (component placement)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate mb-1.5">Default header</label>
              <select
                value={theme.defaultHeaderId || ''}
                onChange={(e) => set('defaultHeaderId', e.target.value)}
                className="w-full border border-hairline px-3 py-2.5 bg-paper"
              >
                <option value="">None</option>
                {headers.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate mb-1.5">Default footer</label>
              <select
                value={theme.defaultFooterId || ''}
                onChange={(e) => set('defaultFooterId', e.target.value)}
                className="w-full border border-hairline px-3 py-2.5 bg-paper"
              >
                <option value="">None</option>
                {footers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate">
            Used on any page that doesn&apos;t explicitly assign its own header/footer in the page editor.
          </p>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="bg-ink text-paper px-5 py-3 text-sm font-medium hover:bg-signal transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save theme'}
        </button>
      </form>
    </div>
  );
}
