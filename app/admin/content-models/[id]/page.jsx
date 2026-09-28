'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getContentModel, updateContentModel } from '../../../../lib/api';
import ModelEditor from '../../../../components/admin/ModelEditor';

export default function EditModelPage() {
  const { id } = useParams();
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getContentModel(id).then(setModel).catch((err) => setError(err.message));
  }, [id]);

  async function handleSubmit(payload) {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const { apiName, ...rest } = payload; // apiName is immutable
      setModel(await updateContentModel(id, rest));
      setStatus('Model saved — the GraphQL schema updates immediately.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!model) return <div className="px-8 py-10 text-sm text-slate">{error || 'Loading…'}</div>;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10 pb-24">
      <Link href="/admin/content-models" className="text-sm text-slate hover:text-ink">
        ← Back to models
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mt-3 mb-8">Edit “{model.name}”</h1>
      {status && <div className="mb-6 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2">{status}</div>}
      {/* key remounts the editor with fresh state after each successful save */}
      <ModelEditor key={model.version} initial={model} isEdit onSubmit={handleSubmit} submitLabel="Save model" saving={saving} error={error} />
    </div>
  );
}
