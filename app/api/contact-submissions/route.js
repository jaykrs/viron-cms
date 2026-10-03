import { NextResponse } from 'next/server';
import { listSubmissions } from '../../../lib/server/contactSubmissions';
import { jsonError, requireAuth } from '../../../lib/server/routeHelpers';

// Admin — the inbox list behind the contact form. Supports optional
// ?status=new|read and ?search= filters, used by the admin UI.
export async function GET(request) {
  try {
    requireAuth(request);
    const { searchParams } = new URL(request.url);
    const result = await listSubmissions({
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err);
  }
}
