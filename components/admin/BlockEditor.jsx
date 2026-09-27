'use client';

import { useRef, useState } from 'react';
import { BLOCK_DEFAULTS, BLOCK_TYPE_LABELS } from './blockDefaults';
import AssetPicker from './AssetPicker';

function BlockRow({ block, index, total, onChange, onRemove, onMove }) {
  const [text, setText] = useState(JSON.stringify(block.props, null, 2));
  const [jsonError, setJsonError] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const textareaRef = useRef(null);

  function commit(nextText) {
    try {
      const parsed = JSON.parse(nextText);
      setJsonError(null);
      onChange({ ...block, props: parsed });
    } catch {
      setJsonError('Invalid JSON — changes not saved until this is fixed.');
    }
  }

  function handleBlur() {
    commit(text);
  }

  // Inserts the chosen asset's URL (as a quoted JSON string) at the current
  // cursor position — this is what gives every block type, including Hero,
  // a way to pull an image in from the asset library without needing a
  // bespoke form field per block.
  function handleAssetSelected(url) {
    const el = textareaRef.current;
    const insertion = `"${url}"`;
    let nextText;
    if (el) {
      const start = el.selectionStart ?? text.length;
      const end = el.selectionEnd ?? text.length;
      nextText = text.slice(0, start) + insertion + text.slice(end);
    } else {
      nextText = text + insertion;
    }
    setText(nextText);
    commit(nextText);
    setPickerOpen(false);
  }

  return (
    <div className="border border-hairline bg-paper">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-hairline bg-ink/[0.03]">
        <span className="text-sm font-medium text-ink">
          {BLOCK_TYPE_LABELS[block.type] || block.type}
        </span>
        <div className="flex items-center gap-3 text-xs">
          <button type="button" onClick={() => setPickerOpen(true)} className="text-signal hover:underline">
            Insert image
          </button>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            className="text-slate hover:text-ink disabled:opacity-30"
          >
            Move up
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
            className="text-slate hover:text-ink disabled:opacity-30"
          >
            Move down
          </button>
          <button type="button" onClick={onRemove} className="text-red-500 hover:underline">
            Remove
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        rows={Math.min(16, Math.max(6, text.split('\n').length))}
        spellCheck={false}
        className="w-full font-mono text-xs p-4 outline-none resize-y bg-transparent"
      />
      {jsonError && <div className="px-4 pb-3 text-xs text-red-600">{jsonError}</div>}
      <p className="px-4 pb-3 text-[11px] text-slate">
        Tip: place your cursor where an image URL should go (e.g. after{' '}
        <code className="font-mono">&quot;image&quot;: </code>), then click Insert image.
      </p>

      <AssetPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleAssetSelected} />
    </div>
  );
}

export default function BlockEditor({ blocks, onChange }) {
  const [addType, setAddType] = useState('hero');

  function addBlock() {
    onChange([...blocks, { type: addType, props: BLOCK_DEFAULTS[addType] || {} }]);
  }

  function updateBlock(i, updated) {
    const next = [...blocks];
    next[i] = updated;
    onChange(next);
  }

  function removeBlock(i) {
    onChange(blocks.filter((_, idx) => idx !== i));
  }

  function moveBlock(from, to) {
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <BlockRow
          key={i}
          block={block}
          index={i}
          total={blocks.length}
          onChange={(updated) => updateBlock(i, updated)}
          onRemove={() => removeBlock(i)}
          onMove={moveBlock}
        />
      ))}

      <div className="flex items-center gap-3 pt-2">
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value)}
          className="border border-hairline px-3 py-2 text-sm bg-paper"
        >
          {Object.entries(BLOCK_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addBlock}
          className="text-sm font-medium border border-ink px-4 py-2 hover:bg-ink hover:text-paper transition-colors"
        >
          Add block
        </button>
      </div>
    </div>
  );
}
