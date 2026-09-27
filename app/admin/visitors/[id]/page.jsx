'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getVisitorJourney, deleteVisitorRecord } from '../../../../lib/api';

export default function VisitorJourneyPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getVisitorJourney(id)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleDelete() {
    if (!data) return;
    if (!confirm(`Delete all data for ${data.visitor.email}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteVisitorRecord(id);
      router.push('/admin/visitors');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-10">
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>
      </div>
    );
  }
  if (!data) return <div className="px-8 py-10 text-sm text-slate">Loading…</div>;

  const { visitor, views } = data;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <Link href="/admin/visitors" className="text-sm text-slate hover:text-ink">
        ← Back to visitors
      </Link>

      <div className="flex items-start justify-between mt-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{visitor.email}</h1>
          <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-slate max-w-md">
            <span>First seen</span>
            <span className="text-ink">{visitor.first_seen_at}</span>
            <span>Last seen</span>
            <span className="text-ink">{visitor.last_seen_at}</span>
            <span>Page views</span>
            <span className="text-ink">{views.length}</span>
            {visitor.user_agent && (
              <>
                <span>Browser</span>
                <span className="text-ink truncate" title={visitor.user_agent}>
                  {visitor.user_agent}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="text-sm font-medium border border-red-300 text-red-600 px-4 py-2 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
        >
          Delete visitor
        </button>
      </div>

      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate mt-10 mb-4">
        Journey
      </h2>

      {views.length === 0 ? (
        <p className="text-sm text-slate">No page views recorded yet.</p>
      ) : (
        <ol className="border-l-2 border-hairline pl-6 space-y-6">
          {views.map((v, i) => (
            <li key={v.id} className="relative">
              <span className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-signal" />
              <div className="text-sm font-medium text-ink">
                {i + 1}. {v.page_title || v.path}
              </div>
              <div className="text-xs font-mono text-slate mt-0.5">{v.path}</div>
              <div className="text-xs text-slate mt-1">
                {v.created_at}
                {v.referrer && <span> — via {v.referrer}</span>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
