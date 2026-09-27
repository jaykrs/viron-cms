'use client';

import { useState } from 'react';

export default function ContactForm({ heading, subheading, email, phone, address }) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section>
      <div className="max-w-content mx-auto px-6 py-16 grid md:grid-cols-2 gap-16">
        <div>
          {heading && <h2 className="font-display text-2xl md:text-3xl font-bold text-ink">{heading}</h2>}
          {subheading && <p className="mt-3 text-slate max-w-[420px]">{subheading}</p>}

          <dl className="mt-10 space-y-4 text-sm">
            {email && (
              <div>
                <dt className="text-slate">Email</dt>
                <dd className="text-ink font-medium">{email}</dd>
              </div>
            )}
            {phone && (
              <div>
                <dt className="text-slate">Phone</dt>
                <dd className="text-ink font-medium">{phone}</dd>
              </div>
            )}
            {address && (
              <div>
                <dt className="text-slate">Office</dt>
                <dd className="text-ink font-medium">{address}</dd>
              </div>
            )}
          </dl>
        </div>

        <div>
          {submitted ? (
            <div className="border border-hairline p-8">
              <p className="font-display text-lg font-bold text-ink">Brief received.</p>
              <p className="mt-2 text-sm text-slate">
                We reply within one business day. This is a demo form — nothing was actually sent.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm text-slate mb-1.5">
                  Name
                </label>
                <input
                  id="name"
                  required
                  className="w-full border border-hairline px-4 py-2.5 bg-paper focus:border-ink outline-none"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm text-slate mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="w-full border border-hairline px-4 py-2.5 bg-paper focus:border-ink outline-none"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm text-slate mb-1.5">
                  Project brief
                </label>
                <textarea
                  id="message"
                  rows={5}
                  required
                  className="w-full border border-hairline px-4 py-2.5 bg-paper focus:border-ink outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center border border-ink bg-ink px-5 py-3 text-sm font-medium text-paper hover:bg-signal hover:border-signal transition-colors"
              >
                Send brief
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
