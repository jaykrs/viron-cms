'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getComponent, updateComponent, deleteComponent } from '../../../../lib/api';

export default function ComponentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [component, setComponent] = useState(null);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [jsonError, setJsonError] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getComponent(id)
      .then((c) => {
        setComponent(c);
        setName(c.name);
        setText(JSON.stringify(c.props, null, 2));
      })
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    let parsed;
    try {
      parsed = JSON.parse(text);
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON.');
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const updated = await updateComponent(id, { name, props: parsed });
      setComponent(updated);
      setStatus('Saved.');
    } catch (err) {
      setJsonError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!component || !confirm(`Delete "${component.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteComponent(id);
      router.push('/admin/components');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (error && !component) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-10">
        <Link href="/admin/components" className="text-sm text-slate hover:text-ink">
          ← Back to header & footer
        </Link>
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>
      </div>
    );
  }
  if (!component) return <div className="px-8 py-10 text-sm text-slate">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <Link href="/admin/components" className="text-sm text-slate hover:text-ink">
        ← Back to header & footer
      </Link>

      <div className="flex items-start justify-between mt-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{component.name}</h1>
          <span className="text-xs text-slate uppercase tracking-wide">{component.kind}</span>
          {!!component.is_default && <span className="ml-2 text-xs text-signal">Default</span>}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-500 hover:underline disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}

      <form onSubmit={handleSave} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm text-slate mb-1.5">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-hairline px-3 py-2.5 bg-paper outline-none focus:border-ink"
          />
        </div>

        <div>
          <label className="block text-sm text-slate mb-1.5">Props (JSON)</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={18}
            spellCheck={false}
            className="w-full font-mono text-xs border border-hairline p-4 outline-none resize-y focus:border-ink"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="text-sm font-medium border border-ink bg-ink text-paper px-5 py-2.5 hover:bg-signal hover:border-signal transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {jsonError && <span className="text-xs text-red-600">{jsonError}</span>}
          {status && <span className="text-xs text-green-700">{status}</span>}
        </div>
      </form>
    </div>
  );
}
