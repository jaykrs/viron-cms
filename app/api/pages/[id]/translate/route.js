import { NextResponse } from 'next/server';
import { duplicatePageForLocale } from '../../../../../lib/server/pages';
import { jsonError, requireAuth } from '../../../../../lib/server/routeHelpers';

export async function POST(request, { params }) {
  try {
    requireAuth(request);
    const { locale } = await request.json();
    const page = await duplicatePageForLocale(params.id, locale);
    return NextResponse.json(page, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
