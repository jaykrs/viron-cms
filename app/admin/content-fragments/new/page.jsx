'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { listContentModels, createContentFragment } from '../../../../lib/api';
import FragmentForm from '../../../../components/admin/FragmentForm';

function NewFragment() {
  const router = useRouter();
  const modelParam = useSearchParams().get('model');
  const [models, setModels] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listContentModels().then(setModels).catch((e) => setError(e.message));
  }, []);

  const model = models && models.find((m) => String(m.id) === String(modelParam));

  async function handleSubmit(payload) {
    setSaving(true);
    setError(null);
    try {
      await createContentFragment({ modelId: model.id, ...payload });
      router.push(`/admin/content-fragments?modelId=${model.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10 pb-24">
      <Link href="/admin/content-fragments" className="text-sm text-slate hover:text-ink">
        ← Back to fragments
      </Link>
      {!models ? (
        <p className="mt-6 text-sm text-slate">{error || 'Loading…'}</p>
      ) : !model ? (
        <>
          <h1 className="font-display text-2xl font-bold text-ink mt-3 mb-6">Choose a model</h1>
          {models.length === 0 && <p className="text-sm text-slate">No models yet. Create one under Content models.</p>}
          <div className="border border-hairline bg-paper">
            {models.map((m) => (
              <Link key={m.id} href={`/admin/content-fragments/new?model=${m.id}`} className="block px-5 py-4 border-b border-hairline last:border-b-0 hover:bg-ink/[0.03]">
                <div className="font-medium text-ink">{m.name}</div>
                {m.description && <div className="text-xs text-slate mt-0.5">{m.description}</div>}
              </Link>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-bold text-ink mt-3 mb-8">New {model.name}</h1>
          <FragmentForm model={model} onSubmit={handleSubmit} submitLabel={`Create ${model.name}`} saving={saving} error={error} />
        </>
      )}
    </div>
  );
}

export default function NewFragmentPage() {
  return (
    <Suspense fallback={<div className="px-8 py-10 text-sm text-slate">Loading…</div>}>
      <NewFragment />
    </Suspense>
  );
}
