'use client';

import { useEffect, useState } from 'react';
import { listContentModels } from '../../lib/api';

export const TYPE_LABELS = {
  text: 'Single-line text',
  longtext: 'Multi-line text',
  richtext: 'Rich text (HTML / Markdown)',
  number: 'Number (decimal)',
  integer: 'Whole number',
  boolean: 'Yes / No',
  date: 'Date',
  datetime: 'Date & time',
  enum: 'Enumeration (pick one)',
  image: 'Image (from assets)',
  reference: 'Fragment reference',
  json: 'JSON',
};
const NO_MULTI = new Set(['boolean', 'json', 'richtext']);

function words(label) {
  return String(label || '').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean);
}
function toCamel(label) {
  const w = words(label);
  if (!w.length) return '';
  const s = w.map((x, i) => (i === 0 ? x.charAt(0).toLowerCase() + x.slice(1) : x.charAt(0).toUpperCase() + x.slice(1))).join('');
  return /^[a-z]/.test(s) ? s : `field${s}`;
}
function toPascal(label) {
  const s = words(label).map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join('');
  return /^[A-Z]/.test(s) ? s : s ? `M${s}` : '';
}

const blankField = () => ({
  label: '', name: '', nameTouched: false, type: 'text', required: false, multiple: false,
  optionsText: '', refModel: '', helpText: '',
});

function fromModelFields(fields) {
  return (fields || []).map((f) => ({
    label: f.label, name: f.name, nameTouched: true, type: f.type, required: !!f.required,
    multiple: !!f.multiple, optionsText: (f.options || []).join('\n'), refModel: f.refModel || '', helpText: f.helpText || '',
  }));
}

export default function ModelEditor({ initial, isEdit, onSubmit, submitLabel, saving, error }) {
  const [name, setName] = useState(initial?.name || '');
  const [apiName, setApiName] = useState(initial?.apiName || '');
  const [apiTouched, setApiTouched] = useState(!!isEdit);
  const [description, setDescription] = useState(initial?.description || '');
  const [fields, setFields] = useState(initial ? fromModelFields(initial.fields) : [blankField()]);
  const [models, setModels] = useState([]);

  useEffect(() => {
    listContentModels().then(setModels).catch(() => {});
  }, []);

  const refChoices = [...new Set([...models.map((m) => m.apiName), apiName].filter(Boolean))];

  function patchField(i, patch) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function move(i, dir) {
    setFields((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      name,
      apiName,
      description,
      fields: fields.map((f) => ({
        name: f.name,
        label: f.label || f.name,
        type: f.type,
        required: f.required,
        multiple: f.multiple && !NO_MULTI.has(f.type),
        helpText: f.helpText,
        ...(f.type === 'enum' ? { options: f.optionsText.split('\n').map((o) => o.trim()).filter(Boolean) } : {}),
        ...(f.type === 'reference' ? { refModel: f.refModel } : {}),
      })),
    });
  }

  const input = 'w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink bg-paper';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}

      <section className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate mb-1.5">Model name</label>
          <input
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!apiTouched) setApiName(toPascal(e.target.value));
            }}
            className={input}
            placeholder="e.g. Blog post"
          />
        </div>
        <div>
          <label className="block text-sm text-slate mb-1.5">GraphQL API name</label>
          <input
            required
            disabled={isEdit}
            value={apiName}
            onChange={(e) => {
              setApiTouched(true);
              setApiName(e.target.value);
            }}
            className={`${input} font-mono text-sm disabled:opacity-60`}
            placeholder="BlogPost"
          />
          <p className="mt-1 text-xs text-slate">
            {isEdit
              ? 'Fixed after creation — it is part of your public GraphQL contract.'
              : 'PascalCase. Generates the type, queries and mutations (e.g. blogPostList, createBlogPost).'}
          </p>
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-slate mb-1.5">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={input} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-slate">Fields</h2>
        </div>
        {isEdit && (
          <p className="text-xs text-slate">
            Changing a field&apos;s key creates a new field — values already stored under the old key stay in
            the database but are no longer exposed. Existing fragments are re-checked against these rules
            the next time they are saved.
          </p>
        )}

        {fields.map((f, i) => (
          <div key={i} className="border border-hairline bg-paper">
            <div className="flex items-center justify-between px-4 py-2 border-b border-hairline bg-ink/[0.03] text-xs">
              <span className="font-medium text-ink">{f.label || f.name || `Field ${i + 1}`}</span>
              <div className="flex items-center gap-3">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="text-slate hover:text-ink disabled:opacity-30">
                  Move up
                </button>
                <button type="button" disabled={i === fields.length - 1} onClick={() => move(i, 1)} className="text-slate hover:text-ink disabled:opacity-30">
                  Move down
                </button>
                <button
                  type="button"
                  disabled={fields.length === 1}
                  onClick={() => setFields((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-red-500 hover:underline disabled:opacity-30"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate mb-1">Label</label>
                <input
                  value={f.label}
                  onChange={(e) =>
                    patchField(i, { label: e.target.value, ...(f.nameTouched ? {} : { name: toCamel(e.target.value) }) })
                  }
                  className={input}
                />
              </div>
              <div>
                <label className="block text-xs text-slate mb-1">Field key</label>
                <input
                  required
                  value={f.name}
                  onChange={(e) => patchField(i, { name: e.target.value, nameTouched: true })}
                  className={`${input} font-mono text-sm`}
                  placeholder="publishDate"
                />
              </div>
              <div>
                <label className="block text-xs text-slate mb-1">Type</label>
                <select
                  value={f.type}
                  onChange={(e) => patchField(i, { type: e.target.value, ...(NO_MULTI.has(e.target.value) ? { multiple: false } : {}) })}
                  className={input}
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {f.type === 'enum' && (
                <div className="col-span-3">
                  <label className="block text-xs text-slate mb-1">Options (one per line)</label>
                  <textarea
                    rows={3}
                    value={f.optionsText}
                    onChange={(e) => patchField(i, { optionsText: e.target.value })}
                    className={`${input} font-mono text-sm`}
                  />
                </div>
              )}

              {f.type === 'reference' && (
                <div className="col-span-3">
                  <label className="block text-xs text-slate mb-1">References a fragment of model</label>
                  <select value={f.refModel} onChange={(e) => patchField(i, { refModel: e.target.value })} className={input}>
                    <option value="">Choose a model…</option>
                    {refChoices.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="col-span-3">
                <label className="block text-xs text-slate mb-1">Help text (shown under the field in the form)</label>
                <input value={f.helpText} onChange={(e) => patchField(i, { helpText: e.target.value })} className={input} />
              </div>

              <div className="col-span-3 flex items-center gap-6 text-sm text-slate">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={f.required} onChange={(e) => patchField(i, { required: e.target.checked })} />
                  Required
                </label>
                <label className={`flex items-center gap-2 ${NO_MULTI.has(f.type) ? 'opacity-40' : ''}`}>
                  <input
                    type="checkbox"
                    disabled={NO_MULTI.has(f.type)}
                    checked={f.multiple && !NO_MULTI.has(f.type)}
                    onChange={(e) => patchField(i, { multiple: e.target.checked })}
                  />
                  Multiple values (list)
                </label>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setFields((prev) => [...prev, blankField()])}
          className="text-sm font-medium border border-ink px-4 py-2 hover:bg-ink hover:text-paper transition-colors"
        >
          Add field
        </button>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="bg-ink text-paper px-5 py-3 text-sm font-medium hover:bg-signal transition-colors disabled:opacity-60"
      >
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
