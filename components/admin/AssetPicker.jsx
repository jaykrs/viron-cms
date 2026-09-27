'use client';

import { useEffect, useState } from 'react';
import { listAssets, uploadAsset } from '../../lib/api';

export default function AssetPicker({ open, onClose, onSelect }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setAssets(await listAssets());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const asset = await uploadAsset(file);
      setAssets((prev) => [asset, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6" onClick={onClose}>
      <div
        className="bg-paper w-full max-w-2xl max-h-[80vh] flex flex-col border border-hairline"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <h3 className="font-display font-bold text-ink">Choose an image</h3>
          <button onClick={onClose} className="text-slate hover:text-ink text-sm">
            Close
          </button>
        </div>

        <div className="px-5 py-3 border-b border-hairline flex items-center gap-3">
          <label className="text-sm font-medium border border-ink px-3 py-1.5 cursor-pointer hover:bg-ink hover:text-paper transition-colors">
            {uploading ? 'Uploading…' : 'Upload new'}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-slate">Loading…</p>
          ) : assets.length === 0 ? (
            <p className="text-sm text-slate">No images yet — upload one above.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onSelect(asset.url)}
                  className="border border-hairline hover:border-signal transition-colors text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.original_name || ''} className="w-full h-24 object-cover" />
                  <div className="px-2 py-1.5 text-xs text-slate truncate">{asset.original_name}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
