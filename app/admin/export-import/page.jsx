'use client';

import { useState } from 'react';
import { downloadSiteExport, importSiteBundle } from '../../../lib/api';

export default function ExportImportPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    setStatus(null);
    try {
      await downloadSiteExport();
      setStatus('Export downloaded.');
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    setStatus(null);
    try {
      const text = await file.text();
      const bundle = JSON.parse(text);
      const summary = await importSiteBundle(bundle);
      setStatus(
        `Imported ${summary.pagesImported} page(s) and ${summary.componentsImported} component(s)` +
          (summary.themeUpdated ? ', and updated the theme.' : '.')
      );
    } catch (err) {
      setError(err.message.includes('JSON') ? 'That file is not valid JSON.' : err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Export &amp; import</h1>
      <p className="text-sm text-slate mt-1">
        Back up or move the site&apos;s content — every page (with its blocks and SEO), the header/footer
        library, and the theme.
      </p>

      {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}
      {status && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2">{status}</div>
      )}

      <section className="mt-8 border border-hairline bg-paper p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">Export</h2>
        <p className="mt-2 text-sm text-slate">
          Downloads a single JSON file containing every page, the header/footer library, and the theme.
          Visitor and analytics data is never included.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="mt-4 bg-ink text-paper px-5 py-3 text-sm font-medium hover:bg-signal transition-colors disabled:opacity-60"
        >
          {exporting ? 'Preparing…' : 'Download export'}
        </button>
      </section>

      <section className="mt-6 border border-hairline bg-paper p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">Import</h2>
        <p className="mt-2 text-sm text-slate">
          Upload a previously exported JSON file. Pages are matched by slug and components by name — importing
          updates matching content and creates anything new. Nothing outside the file is deleted, so this is
          safe to run more than once.
        </p>
        <label className="mt-4 inline-flex items-center border border-ink px-5 py-3 text-sm font-medium cursor-pointer hover:bg-ink hover:text-paper transition-colors">
          {importing ? 'Importing…' : 'Choose file to import'}
          <input type="file" accept="application/json" className="hidden" onChange={handleImport} disabled={importing} />
        </label>
      </section>
    </div>
  );
}
