'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createContentModel } from '../../../../lib/api';
import ModelEditor from '../../../../components/admin/ModelEditor';

export default function NewModelPage() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(payload) {
    setSaving(true);
    setError(null);
    try {
      await createContentModel(payload);
      router.push('/admin/content-models');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10 pb-24">
      <Link href="/admin/content-models" className="text-sm text-slate hover:text-ink">
        ← Back to models
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink mt-3 mb-8">New content model</h1>
      <ModelEditor onSubmit={handleSubmit} submitLabel="Create model" saving={saving} error={error} />
    </div>
  );
}
