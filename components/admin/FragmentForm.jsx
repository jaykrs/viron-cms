'use client';

import { useEffect, useState } from 'react';
import { listContentFragments } from '../../lib/api';
import AssetPicker from './AssetPicker';

const input = 'w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink bg-paper';

// ---- conversion between stored values and form-control values ----------

function toControl(field, v) {
  const one = (x) => {
    if (x === null || x === undefined) return '';
    if (field.type === 'json') return JSON.stringify(x, null, 2);
    if (field.type === 'datetime') return String(x).slice(0, 16);
    return String(x);
  };
  if (field.multiple) return Array.isArray(v) ? v.map(one) : [];
  if (field.type === 'boolean') return !!v;
  return one(v);
}

function fromControlOne(field, v) {
  if (field.type === 'boolean') return !!v;
  if (v === '' || v === null || v === undefined) return null;
  if (field.type === 'number' || field.type === 'integer' || field.type === 'reference') return Number(v);
  if (field.type === 'json') {
    try {
      return JSON.parse(v);
    } catch {
      throw new Error(`${field.label} is not valid JSON`);
    }
  }
  return v;
}

function fromControl(field, v) {
  if (field.multiple) return (v || []).map((x) => fromControlOne(field, x)).filter((x) => x !== null);
  return fromControlOne(field, v);
}

// ---- reference picker ----------------------------------------------------

function ReferenceSelect({ field, value, onChange }) {
  const [options, setOptions] = useState(null);
  useEffect(() => {
    listContentFragments({ modelApiName: field.refModel, limit: 200 })
      .then(setOptions)
      .catch(() => setOptions([]));
  }, [field.refModel]);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
      <option value="">{options ? `Choose a ${field.refModel}…` : 'Loading…'}</option>
      {(options || []).map((o) => (
        <option key={o.id} value={o.id}>
          {o.title}
          {o.status !== 'published' ? ' (draft)' : ''}
        </option>
      ))}
    </select>
  );
}

// ---- one control for one value ---------------------------------------------

function FieldControl({ field, value, onChange }) {
  const [picking, setPicking] = useState(false);

  switch (field.type) {
    case 'longtext':
      return <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} className={input} />;
    case 'richtext':
      return (
        <textarea rows={10} value={value} onChange={(e) => onChange(e.target.value)} className={`${input} font-mono text-sm`} />
      );
    case 'json':
      return (
        <textarea rows={6} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} className={`${input} font-mono text-xs`} />
      );
    case 'number':
      return <input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} className={input} />;
    case 'integer':
      return <input type="number" step="1" value={value} onChange={(e) => onChange(e.target.value)} className={input} />;
    case 'boolean':
      return (
        <label className="flex items-center gap-2 text-sm text-slate">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {field.label}
        </label>
      );
    case 'date':
      return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={input} />;
    case 'datetime':
      return <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className={input} />;
    case 'enum':
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
          <option value="">Choose…</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case 'reference':
      return <ReferenceSelect field={field} value={value} onChange={onChange} />;
    case 'image':
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input value={value} onChange={(e) => onChange(e.target.value)} className={`${input} font-mono text-sm`} placeholder="/uploads/…" />
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="shrink-0 text-sm font-medium border border-ink px-3 hover:bg-ink hover:text-paper transition-colors"
            >
              Choose
            </button>
          </div>
          {value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-24 border border-hairline object-cover" />
          )}
          <AssetPicker
            open={picking}
            onClose={() => setPicking(false)}
            onSelect={(url) => {
              onChange(url);
              setPicking(false);
            }}
          />
        </div>
      );
    default:
      return <input value={value} onChange={(e) => onChange(e.target.value)} className={input} />;
  }
}

// ---- a field: label + single or repeated control ---------------------------

function FieldRow({ field, value, onChange }) {
  const emptyItem = field.type === 'boolean' ? false : '';
  return (
    <div>
      {field.type !== 'boolean' || field.multiple ? (
        <label className="block text-sm text-slate mb-1.5">
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
          {field.multiple && <span className="text-xs text-slate"> (list)</span>}
        </label>
      ) : null}

      {field.multiple ? (
        <div className="space-y-2">
          {value.map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1">
                <FieldControl field={field} value={item} onChange={(v) => onChange(value.map((x, idx) => (idx === i ? v : x)))} />
              </div>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="text-xs text-red-500 hover:underline pt-3"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange([...value, emptyItem])}
            className="text-sm text-signal hover:underline"
          >
            + Add {field.label.toLowerCase()}
          </button>
        </div>
      ) : (
        <FieldControl field={field} value={value} onChange={onChange} />
      )}

      {field.helpText && <p className="mt-1 text-xs text-slate">{field.helpText}</p>}
    </div>
  );
}

export default function FragmentForm({ model, initial, isEdit, onSubmit, submitLabel, saving, error }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [name, setName] = useState(initial?.name || '');
  const [status, setStatus] = useState(initial?.status || 'draft');
  const [values, setValues] = useState(() =>
    Object.fromEntries(model.fields.map((f) => [f.name, toControl(f, initial?.data?.[f.name])]))
  );
  const [localError, setLocalError] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);
    try {
      const data = {};
      for (const f of model.fields) data[f.name] = fromControl(f, values[f.name]);
      onSubmit({ title, ...(name ? { name } : {}), status, data });
    } catch (err) {
      setLocalError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(error || localError) && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{localError || error}</div>
      )}

      <section className="grid grid-cols-3 gap-4 border-b border-hairline pb-6">
        <div className="col-span-3 md:col-span-1">
          <label className="block text-sm text-slate mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
        </div>
        <div className="col-span-3 md:col-span-1">
          <label className="block text-sm text-slate mb-1.5">Name (URL-safe)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${input} font-mono text-sm`}
            placeholder={isEdit ? '' : 'generated from title'}
          />
        </div>
        <div className="col-span-3 md:col-span-1">
          <label className="block text-sm text-slate mb-1.5">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
            <option value="draft">Draft (hidden from public GraphQL)</option>
            <option value="published">Published (public)</option>
          </select>
        </div>
      </section>

      {model.fields.map((f) => (
        <FieldRow key={f.name} field={f} value={values[f.name]} onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))} />
      ))}

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
