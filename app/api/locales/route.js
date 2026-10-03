import { NextResponse } from 'next/server';
import { listEnabledLocales, enableLocale } from '../../../lib/server/locales';
import { jsonError, requireAuth } from '../../../lib/server/routeHelpers';
import { DEFAULT_LOCALE } from '../../../lib/localeCatalog';

// Public: the header language switcher needs this on every page load.
export async function GET() {
  try {
    return NextResponse.json({ defaultLocale: DEFAULT_LOCALE, enabled: await listEnabledLocales() });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request) {
  try {
    requireAuth(request);
    const { code } = await request.json();
    return NextResponse.json({ defaultLocale: DEFAULT_LOCALE, enabled: await enableLocale(code) });
  } catch (err) {
    return jsonError(err);
  }
}
