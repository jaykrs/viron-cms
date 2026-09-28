'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  listContentModels, listContentFragments, updateContentFragment, deleteContentFragment,
} from '../../../lib/api';

function FragmentsList() {
  const params = useSearchParams();
  const [models, setModels] = useState([]);
  const [fragments, setFragments] = useState(null);
  const [modelId, setModelId] = useState(params.get('modelId') || '');
  const [search, setSearch] = useState('');
  const [newModel, setNewModel] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    listContentModels().then(setModels).catch((e) => setError(e.message));
  }, []);

  async function load() {
    try {
      setFragments(await listContentFragments({ modelId, search }));
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, search]);

  async function toggle(f) {
    try {
      await updateContentFragment(f.id, { status: f.status === 'published' ? 'draft' : 'published' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }
  async function remove(f) {
    if (!confirm(`Delete "${f.title}"?`)) return;
    try {
      await deleteContentFragment(f.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-start justify-between mb-8 gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Content fragments</h1>
          <p className="text-sm text-slate mt-1">Structured content entries. Published ones are served by the public GraphQL API.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={newModel} onChange={(e) => setNewModel(e.target.value)} className="border border-hairline px-3 py-2 text-sm bg-paper">
            <option value="">Model…</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {newModel ? (
            <Link href={`/admin/content-fragments/new?model=${newModel}`} className="inline-flex items-center bg-ink text-paper px-4 py-2 text-sm font-medium hover:bg-signal transition-colors">
              New fragment
            </Link>
          ) : (
            <span className="inline-flex items-center bg-ink/30 text-paper px-4 py-2 text-sm font-medium">New fragment</span>
          )}
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}

      <div className="flex items-center gap-3 mb-4">
        <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="border border-hairline px-3 py-2 text-sm bg-paper">
          <option value="">All models</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or name"
          className="border border-hairline px-3 py-2 text-sm bg-paper w-64 outline-none focus:border-ink"
        />
      </div>

      {!fragments ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : fragments.length === 0 ? (
        <p className="text-sm text-slate">
          {models.length === 0 ? (
            <>No models yet — <Link href="/admin/content-models/new" className="text-signal underline">create a content model</Link> first.</>
          ) : (
            'No fragments match.'
          )}
        </p>
      ) : (
        <div className="border border-hairline bg-paper">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-6 px-5 py-3 text-xs text-slate border-b border-hairline">
            <span>Fragment</span>
            <span>Status</span>
            <span>Updated</span>
            <span className="text-right">Actions</span>
          </div>
          {fragments.map((f) => (
            <div key={f.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-6 items-center px-5 py-4 border-b border-hairline last:border-b-0">
              <div>
                <Link href={`/admin/content-fragments/${f.id}`} className="font-medium text-ink hover:text-signal">
                  {f.title}
                </Link>
                <div className="text-xs font-mono text-slate mt-0.5">{f.path}</div>
              </div>
              <span className={`text-xs font-medium px-2 py-1 w-fit ${f.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-amber/10 text-amber'}`}>
                {f.status}
              </span>
              <span className="text-xs text-slate whitespace-nowrap">{f.updatedAt}</span>
              <div className="flex items-center justify-end gap-3 text-xs">
                <button onClick={() => toggle(f)} className="text-signal hover:underline">
                  {f.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <Link href={`/admin/content-fragments/${f.id}`} className="text-slate hover:text-ink hover:underline">
                  Edit
                </Link>
                <button onClick={() => remove(f)} className="text-red-500 hover:underline">
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

export default function ContentFragmentsPage() {
  return (
    <Suspense fallback={<div className="px-8 py-10 text-sm text-slate">Loading…</div>}>
      <FragmentsList />
    </Suspense>
  );
}
