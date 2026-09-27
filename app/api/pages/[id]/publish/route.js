import { NextResponse } from 'next/server';
import { publishPage } from '../../../../../lib/server/pages';
import { jsonError, requireAuth } from '../../../../../lib/server/routeHelpers';

export async function POST(request, { params }) {
  try {
    requireAuth(request);
    const page = await publishPage(params.id);
    return NextResponse.json(page);
  } catch (err) {
    return jsonError(err);
  }
}
