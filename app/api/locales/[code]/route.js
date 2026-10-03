import { NextResponse } from 'next/server';
import { disableLocale, listEnabledLocales } from '../../../../lib/server/locales';
import { jsonError, requireAuth } from '../../../../lib/server/routeHelpers';
import { DEFAULT_LOCALE } from '../../../../lib/localeCatalog';

export async function DELETE(request, { params }) {
  try {
    requireAuth(request);
    await disableLocale(params.code);
    return NextResponse.json({ defaultLocale: DEFAULT_LOCALE, enabled: await listEnabledLocales() });
  } catch (err) {
    return jsonError(err);
  }
}
