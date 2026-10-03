import { NextResponse } from 'next/server';
import { createSubmission } from '../../../lib/server/contactSubmissions';
import { verifyRecaptcha, isConfigured as recaptchaConfigured } from '../../../lib/server/recaptcha';
import { jsonError } from '../../../lib/server/routeHelpers';

// Public — called from the ContactForm block on the live site. No auth:
// this is how a visitor gets a message to the site owner in the first
// place. reCAPTCHA is verified here (a no-op if it isn't configured) before
// the submission is persisted.
export async function POST(request) {
  try {
    const body = await request.json();
    await verifyRecaptcha(body.recaptchaToken);
    const submission = await createSubmission({
      name: body.name,
      email: body.email,
      message: body.message,
      pagePath: body.pagePath,
      locale: body.locale,
    });
    return NextResponse.json({ ...submission, recaptchaRequired: recaptchaConfigured() }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}

// Lets the public form know up front whether it should render the widget,
// without exposing the secret key.
export async function GET() {
  return NextResponse.json({ recaptchaRequired: recaptchaConfigured() });
}
