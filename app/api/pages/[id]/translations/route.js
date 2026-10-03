import { NextResponse } from 'next/server';
import { listTranslations } from '../../../../../lib/server/pages';
import { jsonError, requireAuth } from '../../../../../lib/server/routeHelpers';

export async function GET(request, { params }) {
  try {
    requireAuth(request);
    return NextResponse.json(await listTranslations(params.id));
  } catch (err) {
    return jsonError(err);
  }
}
