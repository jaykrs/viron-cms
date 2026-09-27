import { NextResponse } from 'next/server';
import { exportSite } from '../../../lib/server/exportImport';
import { jsonError, requireAuth } from '../../../lib/server/routeHelpers';

export async function GET(request) {
  try {
    requireAuth(request);
    const bundle = await exportSite();
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="vireon-site-export-${date}.json"`,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
