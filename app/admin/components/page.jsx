'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listComponents, createComponent } from '../../../lib/api';

function ComponentRow({ component }) {
  return (
    <Link
      href={`/admin/components/${component.id}`}
      className="flex items-center justify-between gap-4 px-5 py-4 border-b border-hairline last:border-b-0 hover:bg-ink/[0.02] transition-colors"
    >
      <div className="min-w-0">
        <div className="font-medium text-ink truncate">
          {component.name}
          {!!component.is_default && <span className="ml-2 text-xs text-signal">Default</span>}
        </div>
        <div className="text-xs text-slate">Updated {component.updated_at}</div>
      </div>
      <span className="text-sm text-signal shrink-0">Edit →</span>
    </Link>
  );
}

export default function ComponentsAdmin() {
  const router = useRouter();
  const [headers, setHeaders] = useState([]);
  const [footers, setFooters] = useState([]);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(null);

  async function load() {
    try {
      setHeaders(await listComponents('header'));
      setFooters(await listComponents('footer'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addComponent(kind) {
    const name = prompt(`Name for new ${kind} component:`);
    if (!name) return;
    const defaultProps =
      kind === 'header'
        ? { logoText: 'Vireon Labs', nav: [{ label: 'Home', href: '/' }], cta: { label: 'Contact', href: '/contact' } }
        : { columns: [], copyright: '© Vireon Labs', social: [] };
    setCreating(kind);
    try {
      const created = await createComponent({ name, kind, props: defaultProps });
      router.push(`/admin/components/${created.id}`);
    } catch (err) {
      setError(err.message);
      setCreating(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-12">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Header & footer components</h1>
        <p className="text-sm text-slate mt-1">
          Reusable layout components. Assign one of each to a page from the page editor — edits here apply to
          every page using that component.
        </p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">Headers</h2>
          <button
            onClick={() => addComponent('header')}
            disabled={creating === 'header'}
            className="text-sm text-signal hover:underline disabled:opacity-50"
          >
            {creating === 'header' ? 'Creating…' : '+ New header'}
          </button>
        </div>
        {headers.length === 0 ? (
          <p className="text-sm text-slate">No headers yet.</p>
        ) : (
          <div className="border border-hairline bg-paper">
            {headers.map((h) => (
              <ComponentRow key={h.id} component={h} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">Footers</h2>
          <button
            onClick={() => addComponent('footer')}
            disabled={creating === 'footer'}
            className="text-sm text-signal hover:underline disabled:opacity-50"
          >
            {creating === 'footer' ? 'Creating…' : '+ New footer'}
          </button>
        </div>
        {footers.length === 0 ? (
          <p className="text-sm text-slate">No footers yet.</p>
        ) : (
          <div className="border border-hairline bg-paper">
            {footers.map((f) => (
              <ComponentRow key={f.id} component={f} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
