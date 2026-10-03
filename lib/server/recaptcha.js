const { ApiError } = require('./errors');

// Both keys must be set for enforcement to turn on — this mirrors the rest
// of the app's "optional services degrade gracefully" pattern (Redis,
// Turso): without a secret key configured, the contact form works with no
// reCAPTCHA step at all, so the demo doesn't require a Google account to
// try. Set NEXT_PUBLIC_RECAPTCHA_SITE_KEY (client) and RECAPTCHA_SECRET_KEY
// (server) to turn it on for real.
function isConfigured() {
  return !!process.env.RECAPTCHA_SECRET_KEY;
}

async function verifyRecaptcha(token) {
  if (!isConfigured()) return; // not configured — nothing to verify

  if (!token) throw new ApiError(400, 'Please complete the reCAPTCHA.');

  let result;
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET_KEY, response: token }),
    });
    result = await res.json();
  } catch {
    throw new ApiError(502, 'Could not reach the reCAPTCHA verification service. Please try again.');
  }

  if (!result.success) {
    throw new ApiError(400, 'reCAPTCHA verification failed. Please try again.');
  }
}

module.exports = { verifyRecaptcha, isConfigured };
