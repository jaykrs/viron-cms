'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { submitVisitorConsent, trackPageView as trackPageViewApi } from '../lib/api';

const CONSENT_COOKIE = 'vireon_consent';
const VISITOR_COOKIE = 'vireon_visitor';
const COOKIE_MAX_AGE_DAYS = 365;

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name, value, days) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${days * 24 * 60 * 60}; SameSite=Lax`;
}

function generateVisitorId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function CookieConsent() {
  const pathname = usePathname();
  // 'loading' | 'prompt' | 'emailForm' | 'done'
  const [status, setStatus] = useState('loading');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isAdminRoute = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) return;
    const consent = getCookie(CONSENT_COOKIE);
    setStatus(consent === 'accepted' || consent === 'rejected' ? 'done' : 'prompt');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminRoute]);

  // Log a page view for already-consented visitors on every route change.
  useEffect(() => {
    if (isAdminRoute) return;
    if (getCookie(CONSENT_COOKIE) !== 'accepted') return;
    const visitorUid = getCookie(VISITOR_COOKIE);
    if (!visitorUid) return;
    trackPageViewApi(visitorUid, pathname, document.title, document.referrer).catch(() => {
      // best-effort — a failed analytics ping shouldn't affect the visitor
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isAdminRoute]);

  if (isAdminRoute || status === 'loading' || status === 'done') return null;

  function handleReject() {
    setCookie(CONSENT_COOKIE, 'rejected', COOKIE_MAX_AGE_DAYS);
    setStatus('done');
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let visitorUid = getCookie(VISITOR_COOKIE);
      if (!visitorUid) {
        visitorUid = generateVisitorId();
        setCookie(VISITOR_COOKIE, visitorUid, COOKIE_MAX_AGE_DAYS);
      }
      await submitVisitorConsent(visitorUid, email);
      setCookie(CONSENT_COOKIE, 'accepted', COOKIE_MAX_AGE_DAYS);
      setStatus('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-hairline bg-paper shadow-[0_-4px_16px_rgba(14,21,38,0.06)]">
      <div className="max-w-content mx-auto px-6 py-5">
        {status === 'prompt' && (
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
            <p className="text-sm text-slate max-w-xl">
              We use cookies to understand how visitors use this site. Accepting shares your email with us so
              we can follow up — reject and you can keep browsing with nothing tracked either way.
            </p>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleReject}
                className="text-sm font-medium border border-hairline px-4 py-2 hover:border-ink transition-colors"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => setStatus('emailForm')}
                className="text-sm font-medium border border-ink bg-ink text-paper px-4 py-2 hover:bg-signal hover:border-signal transition-colors"
              >
                Accept
              </button>
            </div>
          </div>
        )}

        {status === 'emailForm' && (
          <form
            onSubmit={handleEmailSubmit}
            className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between"
          >
            <p className="text-sm text-slate">One last step — what&apos;s your email?</p>
            <div className="flex items-center gap-3">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="border border-hairline px-3 py-2 text-sm outline-none focus:border-ink w-56"
              />
              <button
                type="submit"
                disabled={submitting}
                className="text-sm font-medium border border-ink bg-ink text-paper px-4 py-2 hover:bg-signal hover:border-signal transition-colors disabled:opacity-60 shrink-0"
              >
                {submitting ? 'Saving…' : 'Continue'}
              </button>
            </div>
            {error && <span className="text-xs text-red-600">{error}</span>}
          </form>
        )}
      </div>
    </div>
  );
}
