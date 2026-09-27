'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listVisitors, deleteVisitorRecord } from '../../../lib/api';

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      setVisitors(await listVisitors());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(visitor) {
    if (!confirm(`Delete all data for ${visitor.email}? This removes their record and page-view history.`)) {
      return;
    }
    setBusyId(visitor.id);
    try {
      await deleteVisitorRecord(visitor.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-ink">Visitors</h1>
        <p className="text-sm text-slate mt-1">
          Everyone who accepted the cookie banner and shared their email, with a page-view count. Rejections
          aren&apos;t logged here — nothing is captured unless a visitor accepts.
        </p>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}

      {!visitors ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : visitors.length === 0 ? (
        <p className="text-sm text-slate">
          No one has accepted the cookie banner yet. Visit the public site and click Accept to see a row appear
          here.
        </p>
      ) : (
        <div className="border border-hairline bg-paper">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 text-xs text-slate border-b border-hairline">
            <span>Email</span>
            <span>First seen</span>
            <span>Last seen</span>
            <span>Page views</span>
            <span className="text-right">Actions</span>
          </div>
          {visitors.map((v) => (
            <div
              key={v.id}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4 border-b border-hairline last:border-b-0"
            >
              <Link href={`/admin/visitors/${v.id}`} className="font-medium text-ink hover:text-signal truncate">
                {v.email}
              </Link>
              <span className="text-xs text-slate whitespace-nowrap">{v.first_seen_at}</span>
              <span className="text-xs text-slate whitespace-nowrap">{v.last_seen_at}</span>
              <span className="text-xs font-mono text-ink">{v.page_view_count}</span>
              <div className="flex items-center justify-end gap-3 text-xs">
                <Link href={`/admin/visitors/${v.id}`} className="text-signal hover:underline">
                  View journey
                </Link>
                <button
                  disabled={busyId === v.id}
                  onClick={() => handleDelete(v)}
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
