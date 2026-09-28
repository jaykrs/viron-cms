'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listContentModels, deleteContentModel } from '../../../lib/api';

const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

export default function ContentModelsPage() {
  const [models, setModels] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setModels(await listContentModels());
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function handleDelete(model) {
    if (!confirm(`Delete the "${model.name}" model?`)) return;
    setError(null);
    try {
      await deleteContentModel(model.id, false);
    } catch (err) {
      if (err.status === 409 && /fragment/i.test(err.message)) {
        if (confirm(`${err.message}\n\nDelete the model AND all of its fragments? This cannot be undone.`)) {
          try {
            await deleteContentModel(model.id, true);
          } catch (e2) {
            setError(e2.message);
          }
        }
      } else {
        setError(err.message);
      }
    }
    await load();
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Content models</h1>
          <p className="text-sm text-slate mt-1">
            Define the structure of your content. Each model generates a form, plus GraphQL queries and mutations.
          </p>
        </div>
        <Link href="/admin/content-models/new" className="inline-flex items-center bg-ink text-paper px-4 py-2.5 text-sm font-medium hover:bg-signal transition-colors">
          New model
        </Link>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}

      {!models ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : models.length === 0 ? (
        <p className="text-sm text-slate">No models yet. Create one to start authoring structured content.</p>
      ) : (
        <div className="border border-hairline bg-paper">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-6 px-5 py-3 text-xs text-slate border-b border-hairline">
            <span>Model</span>
            <span>Fields</span>
            <span>Fragments</span>
            <span className="text-right">Actions</span>
          </div>
          {models.map((m) => (
            <div key={m.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-6 items-center px-5 py-4 border-b border-hairline last:border-b-0">
              <div>
                <Link href={`/admin/content-models/${m.id}`} className="font-medium text-ink hover:text-signal">
                  {m.name}
                </Link>
                <div className="text-xs font-mono text-slate mt-0.5">
                  {lowerFirst(m.apiName)}List · create{m.apiName}
                </div>
                {m.description && <div className="text-xs text-slate mt-0.5">{m.description}</div>}
              </div>
              <span className="text-xs font-mono">{m.fields.length}</span>
              <Link href={`/admin/content-fragments?modelId=${m.id}`} className="text-xs font-mono text-signal hover:underline">
                {m.fragmentCount}
              </Link>
              <div className="flex items-center justify-end gap-3 text-xs">
                <Link href={`/admin/content-fragments/new?model=${m.id}`} className="text-signal hover:underline">
                  New fragment
                </Link>
                <Link href={`/admin/content-models/${m.id}`} className="text-slate hover:text-ink hover:underline">
                  Edit
                </Link>
                <button onClick={() => handleDelete(m)} className="text-red-500 hover:underline">
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
