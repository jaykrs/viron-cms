'use client';

import { useEffect, useState } from 'react';
import { listComponents, updateComponent, createComponent } from '../../../lib/api';

function ComponentCard({ component, onSaved }) {
  const [text, setText] = useState(JSON.stringify(component.props, null, 2));
  const [name, setName] = useState(component.name);
  const [jsonError, setJsonError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  async function handleSave() {
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
      await updateComponent(component.id, { name, props: parsed });
      setStatus('Saved.');
    } catch (err) {
      setJsonError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-hairline bg-paper">
      <div className="px-4 py-3 border-b border-hairline flex items-center justify-between gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="font-medium text-ink bg-transparent outline-none border-b border-transparent focus:border-ink"
        />
        <span className="text-xs text-slate uppercase tracking-wide">{component.kind}</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        spellCheck={false}
        className="w-full font-mono text-xs p-4 outline-none resize-y"
      />
      <div className="px-4 pb-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-medium border border-ink px-4 py-2 hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {jsonError && <span className="text-xs text-red-600">{jsonError}</span>}
        {status && <span className="text-xs text-green-700">{status}</span>}
      </div>
    </div>
  );
}

export default function ComponentsAdmin() {
  const [headers, setHeaders] = useState([]);
  const [footers, setFooters] = useState([]);
  const [error, setError] = useState(null);

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
    try {
      await createComponent({ name, kind, props: defaultProps });
      await load();
    } catch (err) {
      setError(err.message);
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
          <button onClick={() => addComponent('header')} className="text-sm text-signal hover:underline">
            + New header
          </button>
        </div>
        <div className="space-y-4">
          {headers.map((h) => (
            <ComponentCard key={h.id} component={h} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">Footers</h2>
          <button onClick={() => addComponent('footer')} className="text-sm text-signal hover:underline">
            + New footer
          </button>
        </div>
        <div className="space-y-4">
          {footers.map((f) => (
            <ComponentCard key={f.id} component={f} />
          ))}
        </div>
      </section>
    </div>
  );
}
