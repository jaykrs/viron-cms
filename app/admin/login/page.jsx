'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token } = await login(username, password);
      window.localStorage.setItem('cms_token', token);
      router.push('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-paper border border-hairline p-8">
        <h1 className="font-display text-xl font-bold text-ink">Admin console</h1>
        <p className="mt-1 text-sm text-slate">Sign in to author and publish pages.</p>

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{error}</div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-slate mb-1.5">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-sm text-slate mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-hairline px-3 py-2.5 outline-none focus:border-ink"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-ink text-paper py-2.5 text-sm font-medium hover:bg-signal transition-colors disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-4 text-xs text-slate">
          Demo credentials: admin / admin123
        </p>
      </form>
    </div>
  );
}
