'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  listContactSubmissions,
  updateContactSubmissionStatus,
  deleteContactSubmission,
} from '../../../lib/api';

export default function ContactSubmissionsPage() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      setData(await listContactSubmissions({ status: status || undefined, search: search || undefined }));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    load();
  }

  async function toggleStatus(row) {
    setBusyId(row.id);
    try {
      await updateContactSubmissionStatus(row.id, row.status === 'new' ? 'read' : 'new');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(row) {
    if (!confirm(`Delete the submission from ${row.name}?`)) return;
    setBusyId(row.id);
    try {
      await deleteContactSubmission(row.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Contact submissions</h1>
          <p className="text-sm text-slate mt-1">
            Everything sent through the public contact form, newest first.
            {data ? ` ${data.newCount} unread.` : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1">
          {['', 'new', 'read'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-xs border ${
                status === s ? 'bg-ink text-paper border-ink' : 'border-hairline text-slate hover:text-ink'
              }`}
            >
              {s === '' ? 'All' : s === 'new' ? 'Unread' : 'Read'}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearchSubmit} className="flex gap-2 ml-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, message…"
            className="border border-hairline px-3 py-1.5 text-sm bg-paper focus:border-ink outline-none w-64"
          />
          <button type="submit" className="px-3 py-1.5 text-xs border border-hairline hover:border-ink">
            Search
          </button>
        </form>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}

      {!data ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : data.items.length === 0 ? (
        <p className="text-sm text-slate">
          No submissions yet. Fill in the contact form on the public site to see one appear here.
        </p>
      ) : (
        <div className="border border-hairline bg-paper">
          <div className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 text-xs text-slate border-b border-hairline">
            <span>Status</span>
            <span>From</span>
            <span>Message</span>
            <span>Page</span>
            <span>Received</span>
            <span className="text-right">Actions</span>
          </div>
          {data.items.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-4 items-center px-5 py-4 border-b border-hairline last:border-b-0"
            >
              <span
                className={`text-[10px] uppercase tracking-wide px-2 py-0.5 border ${
                  row.status === 'new' ? 'border-signal text-signal' : 'border-hairline text-slate'
                }`}
              >
                {row.status}
              </span>
              <Link href={`/admin/contact-submissions/${row.id}`} className="min-w-0">
                <div className="font-medium text-ink truncate">{row.name}</div>
                <div className="text-xs text-slate truncate">{row.email}</div>
              </Link>
              <p className="text-sm text-slate truncate">{row.message}</p>
              <span className="text-xs text-slate whitespace-nowrap">
                {row.page_path || '—'}
                {row.locale ? ` (${row.locale})` : ''}
              </span>
              <span className="text-xs text-slate whitespace-nowrap">{row.created_at}</span>
              <div className="flex items-center justify-end gap-3 text-xs">
                <button
                  disabled={busyId === row.id}
                  onClick={() => toggleStatus(row)}
                  className="text-signal hover:underline disabled:opacity-50"
                >
                  Mark {row.status === 'new' ? 'read' : 'unread'}
                </button>
                <button
                  disabled={busyId === row.id}
                  onClick={() => handleDelete(row)}
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
