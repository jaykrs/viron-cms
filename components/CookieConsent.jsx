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
    <div className="cookie-consent">
      <div className="cookie-consent__inner">
        {status === 'prompt' && (
          <div className="cookie-consent__row">
            <p className="cookie-consent__text">
              We use cookies to understand how visitors use this site. Accepting shares your email with us so
              we can follow up — reject and you can keep browsing with nothing tracked either way.
            </p>
            <div className="cookie-consent__actions">
              <button type="button" onClick={handleReject} className="btn-outline">
                Reject
              </button>
              <button type="button" onClick={() => setStatus('emailForm')} className="btn-outline--dark">
                Accept
              </button>
            </div>
          </div>
        )}

        {status === 'emailForm' && (
          <form onSubmit={handleEmailSubmit} className="cookie-consent__form">
            <p className="cookie-consent__form-text">One last step — what&apos;s your email?</p>
            <div className="cookie-consent__form-fields">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="cookie-consent__input"
              />
              <button type="submit" disabled={submitting} className="cookie-consent__submit">
                {submitting ? 'Saving…' : 'Continue'}
              </button>
            </div>
            {error && <span className="cookie-consent__error">{error}</span>}
          </form>
        )}
      </div>
    </div>
  );
}
