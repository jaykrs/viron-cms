import { NextResponse } from 'next/server';
import { importSite } from '../../../lib/server/exportImport';
import { jsonError, requireAuth } from '../../../lib/server/routeHelpers';

export async function POST(request) {
  try {
    requireAuth(request);
    const bundle = await request.json();
    const summary = await importSite(bundle);
    return NextResponse.json(summary);
  } catch (err) {
    return jsonError(err);
  }
}
