'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getContactSubmission,
  updateContactSubmissionStatus,
  deleteContactSubmission,
} from '../../../../lib/api';

export default function ContactSubmissionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [row, setRow] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await getContactSubmission(id);
      setRow(data);
      if (data.status === 'new') {
        await updateContactSubmissionStatus(id, 'read');
        setRow({ ...data, status: 'read' });
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    if (!row || !confirm(`Delete the submission from ${row.name}?`)) return;
    setBusy(true);
    try {
      await deleteContactSubmission(id);
      router.push('/admin/contact-submissions');
    } catch (err) {
      setError(err.message);
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
  if (!row) return <div className="px-8 py-10 text-sm text-slate">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <Link href="/admin/contact-submissions" className="text-sm text-slate hover:text-ink">
        ← Back to contact submissions
      </Link>

      <div className="flex items-start justify-between mt-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{row.name}</h1>
          <a href={`mailto:${row.email}`} className="text-sm text-signal hover:underline">
            {row.email}
          </a>
        </div>
        <button
          disabled={busy}
          onClick={handleDelete}
          className="text-sm text-red-500 hover:underline disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-slate max-w-md">
        <span>Received</span>
        <span className="text-ink">{row.created_at}</span>
        <span>Page</span>
        <span className="text-ink">{row.page_path || '—'}</span>
        <span>Locale</span>
        <span className="text-ink">{row.locale || '—'}</span>
      </div>

      <div className="mt-8 border border-hairline p-6 whitespace-pre-wrap text-sm text-ink leading-relaxed">
        {row.message}
      </div>
    </div>
  );
}
