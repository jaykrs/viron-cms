'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listPages, publishPage, unpublishPage, deletePage } from '../../lib/api';

export default function AdminDashboard() {
  const [pages, setPages] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      setPages(await listPages());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePublishToggle(page) {
    setBusyId(page.id);
    try {
      if (page.status === 'published') await unpublishPage(page.id);
      else await publishPage(page.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(page) {
    if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    setBusyId(page.id);
    try {
      await deletePage(page.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Pages</h1>
          <p className="text-sm text-slate mt-1">Create, author, and publish site pages.</p>
        </div>
        <Link
          href="/admin/pages/new"
          className="inline-flex items-center bg-ink text-paper px-4 py-2.5 text-sm font-medium hover:bg-signal transition-colors"
        >
          New page
        </Link>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}

      {!pages ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : pages.length === 0 ? (
        <p className="text-sm text-slate">No pages yet. Create your first page to get started.</p>
      ) : (
        <div className="border border-hairline bg-paper">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 text-xs text-slate border-b border-hairline">
            <span>Page</span>
            <span>Route</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          {pages.map((page) => (
            <div
              key={page.id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-4 border-b border-hairline last:border-b-0"
            >
              <div>
                <Link href={`/admin/pages/${page.id}/edit`} className="font-medium text-ink hover:text-signal">
                  {page.title}
                </Link>
                <div className="text-xs text-slate mt-0.5 font-mono">/{page.slug}</div>
              </div>
              <span className="text-xs text-slate">{page.route_type}</span>
              <span
                className={`text-xs font-medium px-2 py-1 w-fit ${
                  page.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-amber/10 text-amber'
                }`}
              >
                {page.status}
              </span>
              <div className="flex items-center justify-end gap-3 text-xs">
                <button
                  disabled={busyId === page.id}
                  onClick={() => handlePublishToggle(page)}
                  className="text-signal hover:underline disabled:opacity-50"
                >
                  {page.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <Link href={`/admin/pages/${page.id}/edit`} className="text-slate hover:text-ink hover:underline">
                  Edit
                </Link>
                <button
                  disabled={busyId === page.id}
                  onClick={() => handleDelete(page)}
                  className="text-red-500 hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
