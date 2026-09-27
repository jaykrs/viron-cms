'use client';

import { useEffect, useState } from 'react';
import { listAssets, uploadAsset, deleteAsset } from '../../../lib/api';

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  async function load() {
    try {
      setAssets(await listAssets());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadAsset(file);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleDelete(asset) {
    if (!confirm(`Delete "${asset.original_name}"? Pages already referencing this URL will show a broken image.`)) {
      return;
    }
    try {
      await deleteAsset(asset.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleCopy(asset) {
    navigator.clipboard.writeText(asset.url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Assets</h1>
          <p className="text-sm text-slate mt-1">
            Upload images here, then insert them into any content block from the page editor.
          </p>
        </div>
        <label className="inline-flex items-center bg-ink text-paper px-4 py-2.5 text-sm font-medium hover:bg-signal transition-colors cursor-pointer">
          {uploading ? 'Uploading…' : 'Upload image'}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}

      {!assets ? (
        <p className="text-sm text-slate">Loading…</p>
      ) : assets.length === 0 ? (
        <p className="text-sm text-slate">No images yet. Upload your first one above.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <div key={asset.id} className="border border-hairline bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.url} alt={asset.original_name} className="w-full h-32 object-cover" />
              <div className="p-3">
                <div className="text-xs font-medium text-ink truncate">{asset.original_name}</div>
                <div className="text-[11px] text-slate mt-0.5">{formatSize(asset.size)}</div>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <button onClick={() => handleCopy(asset)} className="text-signal hover:underline">
                    {copiedId === asset.id ? 'Copied!' : 'Copy URL'}
                  </button>
                  <button onClick={() => handleDelete(asset)} className="text-red-500 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
