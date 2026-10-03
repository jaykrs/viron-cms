'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getContactFormConfig, submitContactForm } from '../../lib/api';
import { LOCALE_CODE_RE } from '../../lib/localeCatalog';

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

function localeFromPathname(pathname) {
  const first = (pathname || '/').split('/').filter(Boolean)[0];
  return first && LOCALE_CODE_RE.test(first) ? first : 'en';
}

export default function ContactForm({ heading, subheading, email, phone, address }) {
  const pathname = usePathname();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [recaptchaRequired, setRecaptchaRequired] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const widgetRef = useRef(null);
  const widgetIdRef = useRef(null);

  // Ask the server whether reCAPTCHA is configured so the widget only
  // appears when it'll actually be enforced — no Google account needed to
  // try the demo.
  useEffect(() => {
    let cancelled = false;
    getContactFormConfig()
      .then((cfg) => {
        if (!cancelled) setRecaptchaRequired(!!cfg.recaptchaRequired && !!RECAPTCHA_SITE_KEY);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the Google reCAPTCHA script once we know it's needed, then render
  // the checkbox widget into our placeholder div.
  useEffect(() => {
    if (!recaptchaRequired) return;

    function render() {
      if (!window.grecaptcha || !widgetRef.current || widgetIdRef.current !== null) return;
      widgetIdRef.current = window.grecaptcha.render(widgetRef.current, { sitekey: RECAPTCHA_SITE_KEY });
      setWidgetReady(true);
    }

    if (window.grecaptcha && window.grecaptcha.render) {
      render();
      return;
    }

    const existing = document.querySelector('script[data-recaptcha-loader]');
    window.__onRecaptchaLoad = render;
    if (existing) return;

    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=__onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-recaptcha-loader', 'true');
    document.body.appendChild(script);
  }, [recaptchaRequired]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const form = e.target;
    const recaptchaToken =
      recaptchaRequired && window.grecaptcha && widgetIdRef.current !== null
        ? window.grecaptcha.getResponse(widgetIdRef.current)
        : undefined;

    if (recaptchaRequired && !recaptchaToken) {
      setError('Please complete the reCAPTCHA.');
      return;
    }

    setSubmitting(true);
    try {
      await submitContactForm({
        name: form.name.value,
        email: form.email.value,
        message: form.message.value,
        pagePath: pathname,
        locale: localeFromPathname(pathname),
        recaptchaToken,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      if (recaptchaRequired && window.grecaptcha && widgetIdRef.current !== null) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="block-contact-form__inner">
        <div>
          {heading && <h2 className="block-contact-form__heading">{heading}</h2>}
          {subheading && <p className="block-contact-form__subheading">{subheading}</p>}

          <dl className="block-contact-form__details">
            {email && (
              <div>
                <dt className="block-contact-form__details-label">Email</dt>
                <dd className="block-contact-form__details-value">{email}</dd>
              </div>
            )}
            {phone && (
              <div>
                <dt className="block-contact-form__details-label">Phone</dt>
                <dd className="block-contact-form__details-value">{phone}</dd>
              </div>
            )}
            {address && (
              <div>
                <dt className="block-contact-form__details-label">Office</dt>
                <dd className="block-contact-form__details-value">{address}</dd>
              </div>
            )}
          </dl>
        </div>

        <div>
          {submitted ? (
            <div className="block-contact-form__success">
              <p className="block-contact-form__success-title">Brief received.</p>
              <p className="block-contact-form__success-body">We reply within one business day.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="block-contact-form__form">
              <div>
                <label htmlFor="name" className="field-label">
                  Name
                </label>
                <input id="name" name="name" required className="field-input" />
              </div>
              <div>
                <label htmlFor="email" className="field-label">
                  Email
                </label>
                <input id="email" name="email" type="email" required className="field-input" />
              </div>
              <div>
                <label htmlFor="message" className="field-label">
                  Project brief
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  className="field-input resize-none"
                />
              </div>

              {recaptchaRequired && (
                <div>
                  <div ref={widgetRef} />
                  {!widgetReady && <p className="block-contact-form__recaptcha-hint">Loading reCAPTCHA…</p>}
                </div>
              )}

              {error && <p className="field-error">{error}</p>}

              <button type="submit" disabled={submitting} className="block-contact-form__submit">
                {submitting ? 'Sending…' : 'Send brief'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
