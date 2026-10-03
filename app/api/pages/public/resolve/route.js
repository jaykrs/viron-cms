import { NextResponse } from 'next/server';
import { resolvePublicPage } from '../../../../../lib/server/pages';
import { jsonError } from '../../../../../lib/server/routeHelpers';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await resolvePublicPage(body.locale, Array.isArray(body.segments) ? body.segments : []);
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err);
  }
}
