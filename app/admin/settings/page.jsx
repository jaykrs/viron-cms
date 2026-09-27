'use client';

import { useState } from 'react';
import { changePassword } from '../../../lib/api';

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setStatus('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold text-ink">Account settings</h1>
      <p className="text-sm text-slate mt-1">Update the password for your admin login.</p>

      {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}
      {status && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2">{status}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-slate mb-1.5">Current password</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="block text-sm text-slate mb-1.5">New password</label>
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink"
          />
          <p className="mt-1 text-xs text-slate">At least 6 characters.</p>
        </div>
        <div>
          <label className="block text-sm text-slate mb-1.5">Confirm new password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-ink text-paper px-5 py-3 text-sm font-medium hover:bg-signal transition-colors disabled:opacity-60"
        >
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
