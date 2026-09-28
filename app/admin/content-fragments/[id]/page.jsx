'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getContentFragment, getContentModel, updateContentFragment } from '../../../../lib/api';
import FragmentForm from '../../../../components/admin/FragmentForm';

export default function EditFragmentPage() {
  const { id } = useParams();
  const [fragment, setFragment] = useState(null);
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const f = await getContentFragment(id);
        setFragment(f);
        setModel(await getContentModel(f.modelId));
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [id]);

  async function handleSubmit(payload) {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      setFragment(await updateContentFragment(id, payload));
      setStatus('Saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!fragment || !model) return <div className="px-8 py-10 text-sm text-slate">{error || 'Loading…'}</div>;

  return (
    <div className="max-w-2xl mx-auto px-8 py-10 pb-24">
      <Link href={`/admin/content-fragments?modelId=${model.id}`} className="text-sm text-slate hover:text-ink">
        ← Back to fragments
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mt-3">{fragment.title}</h1>
      <div className="mt-1 mb-8 text-xs text-slate">
        <span className="font-mono">{fragment.path}</span> · {model.name} · id {fragment.id}
      </div>
      {status && <div className="mb-6 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2">{status}</div>}
      <FragmentForm
        key={fragment.updatedAt + fragment.name}
        model={model}
        initial={fragment}
        isEdit
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        saving={saving}
        error={error}
      />
    </div>
  );
}
