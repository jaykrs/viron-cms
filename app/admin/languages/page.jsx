'use client';

import { useEffect, useState } from 'react';
import { listLocales, enableLocale, disableLocale } from '../../../lib/api';
import { LOCALE_CATALOG, DEFAULT_LOCALE } from '../../../lib/localeCatalog';

export default function LanguagesPage() {
  const [state, setState] = useState(null);
  const [toAdd, setToAdd] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setState(await listLocales());
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const enabledCodes = new Set((state?.enabled || []).map((l) => l.code));
  const available = LOCALE_CATALOG.filter((l) => !enabledCodes.has(l.code));

  async function handleAdd(e) {
    e.preventDefault();
    if (!toAdd) return;
    setBusy(true);
    setError(null);
    try {
      setState(await enableLocale(toAdd));
      setToAdd('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(code) {
    if (!confirm(`Remove ${code}? Pages in this language must be deleted or re-assigned first.`)) return;
    setBusy(true);
    setError(null);
    try {
      setState(await disableLocale(code));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Languages</h1>
      <p className="text-sm text-slate mt-1">
        English is the default language and is always served at the site root (<code>/</code>). Every other
        language you enable here gets a URL prefix — e.g. French pages live at <code>/fr/...</code> — and
        appears in the header language switcher.
      </p>

      {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}

      {!state ? (
        <p className="mt-6 text-sm text-slate">Loading…</p>
      ) : (
        <>
          <div className="mt-8 border border-hairline bg-paper">
            {state.enabled.map((l) => (
              <div key={l.code} className="flex items-center justify-between px-5 py-3 border-b border-hairline last:border-b-0">
                <div>
                  <span className="font-medium text-ink">{l.label}</span>
                  <span className="ml-2 font-mono text-xs text-slate">{l.code}</span>
                  {l.code === DEFAULT_LOCALE && (
                    <span className="ml-2 text-xs text-slate">· default, served at /</span>
                  )}
                </div>
                {l.code !== DEFAULT_LOCALE && (
                  <button disabled={busy} onClick={() => handleRemove(l.code)} className="text-xs text-red-500 hover:underline disabled:opacity-50">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {available.length > 0 && (
            <form onSubmit={handleAdd} className="mt-6 flex items-center gap-3">
              <select
                value={toAdd}
                onChange={(e) => setToAdd(e.target.value)}
                className="border border-hairline px-3 py-2.5 text-sm bg-paper"
              >
                <option value="">Add a language…</option>
                {available.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label} ({l.code})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!toAdd || busy}
                className="bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:bg-signal transition-colors disabled:opacity-60"
              >
                Add
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
