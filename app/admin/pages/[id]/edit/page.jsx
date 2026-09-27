'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getPage,
  updatePage,
  publishPage,
  unpublishPage,
  listComponents,
} from '../../../../../lib/api';
import BlockEditor from '../../../../../components/admin/BlockEditor';

export default function EditPage() {
  const { id } = useParams();
  const router = useRouter();
  const [page, setPage] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [footers, setFooters] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [p, h, f] = await Promise.all([
        getPage(id),
        listComponents('header'),
        listComponents('footer'),
      ]);
      setPage(p);
      setHeaders(h);
      setFooters(f);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function set(key, value) {
    setPage((p) => ({ ...p, [key]: value }));
  }
  function setSeo(key, value) {
    setPage((p) => ({ ...p, seo: { ...p.seo, [key]: value } }));
  }

  async function handleSave(e) {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const updated = await updatePage(id, {
        title: page.title,
        slug: page.slug,
        routeType: page.route_type,
        paramName: page.param_name,
        navLabel: page.nav_label,
        navOrder: page.nav_order,
        showInNav: page.showInNav,
        headerId: page.header_id ? Number(page.header_id) : null,
        footerId: page.footer_id ? Number(page.footer_id) : null,
        seo: page.seo,
        blocks: page.blocks.map((b) => ({ type: b.type, props: b.props })),
      });
      setPage(updated);
      setStatus('Saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishToggle() {
    setSaving(true);
    try {
      const updated = page.status === 'published' ? await unpublishPage(id) : await publishPage(id);
      setPage((p) => ({ ...p, status: updated.status, published_at: updated.published_at }));
      setStatus(updated.status === 'published' ? 'Published.' : 'Unpublished.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !page) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-10">
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>
      </div>
    );
  }
  if (!page) return <div className="px-8 py-10 text-sm text-slate">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10 pb-24">
      <Link href="/admin" className="text-sm text-slate hover:text-ink">
        ← Back to pages
      </Link>

      <div className="flex items-start justify-between mt-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{page.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="font-mono text-slate">/{page.slug}</span>
            <span
              className={`px-2 py-0.5 font-medium ${
                page.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-amber/10 text-amber'
              }`}
            >
              {page.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePublishToggle}
            disabled={saving}
            className="text-sm font-medium border border-ink px-4 py-2 hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
          >
            {page.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}
      {status && <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2">{status}</div>}

      <form onSubmit={handleSave} className="mt-8 space-y-10">
        <section className="space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">Page settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate mb-1.5">Title</label>
              <input
                value={page.title}
                onChange={(e) => set('title', e.target.value)}
                className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-sm text-slate mb-1.5">Nav label</label>
              <input
                value={page.nav_label || ''}
                onChange={(e) => set('nav_label', e.target.value)}
                className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate mb-1.5">
              {page.route_type === 'dynamic' ? 'Slug pattern' : 'Slug'}
            </label>
            <input
              value={page.slug}
              onChange={(e) => set('slug', e.target.value)}
              className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate mb-1.5">Header component</label>
              <select
                value={page.header_id || ''}
                onChange={(e) => set('header_id', e.target.value)}
                className="w-full border border-hairline px-3 py-2.5 bg-paper"
              >
                <option value="">Use theme default</option>
                {headers.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate mb-1.5">Footer component</label>
              <select
                value={page.footer_id || ''}
                onChange={(e) => set('footer_id', e.target.value)}
                className="w-full border border-hairline px-3 py-2.5 bg-paper"
              >
                <option value="">Use theme default</option>
                {footers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showInNav"
              checked={page.showInNav}
              onChange={(e) => set('showInNav', e.target.checked)}
            />
            <label htmlFor="showInNav" className="text-sm text-slate">
              Show in header navigation
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">SEO & metadata</h2>
          <div>
            <label className="block text-sm text-slate mb-1.5">Meta title</label>
            <input
              value={page.seo.title || ''}
              onChange={(e) => setSeo('title', e.target.value)}
              className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1.5">Meta description</label>
            <textarea
              rows={2}
              value={page.seo.description || ''}
              onChange={(e) => setSeo('description', e.target.value)}
              className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate mb-1.5">Keywords</label>
              <input
                value={page.seo.keywords || ''}
                onChange={(e) => setSeo('keywords', e.target.value)}
                className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-sm text-slate mb-1.5">Canonical URL</label>
              <input
                value={page.seo.canonical || ''}
                onChange={(e) => setSeo('canonical', e.target.value)}
                className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="noIndex"
              checked={!!page.seo.noIndex}
              onChange={(e) => setSeo('noIndex', e.target.checked)}
            />
            <label htmlFor="noIndex" className="text-sm text-slate">
              Hide from search engines (noindex)
            </label>
          </div>
          {page.route_type === 'dynamic' && (
            <p className="text-xs text-slate">
              Tip: use <code>{`{{${page.param_name}}}`}</code> in title/description to inject the URL parameter.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">Content blocks</h2>
          <BlockEditor blocks={page.blocks} onChange={(blocks) => set('blocks', blocks)} />
        </section>

        <div className="sticky bottom-0 bg-[#F5F5F2] border-t border-hairline py-4 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-ink text-paper px-5 py-3 text-sm font-medium hover:bg-signal transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {page.status !== 'published' && (
            <span className="text-xs text-slate">This page is a draft and won&apos;t appear on the live site until published.</span>
          )}
        </div>
      </form>
    </div>
  );
}
