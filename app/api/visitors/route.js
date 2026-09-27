import { NextResponse } from 'next/server';
import { listVisitors, upsertVisitor } from '../../../lib/server/visitors';
import { jsonError, requireAuth } from '../../../lib/server/routeHelpers';

export async function GET(request) {
  try {
    requireAuth(request);
    return NextResponse.json(await listVisitors());
  } catch (err) {
    return jsonError(err);
  }
}

// Public — called from the cookie banner when a visitor accepts and
// submits their email. No auth: this is the whole point of the endpoint.
export async function POST(request) {
  try {
    const body = await request.json();
    const userAgent = request.headers.get('user-agent') || null;
    const visitor = await upsertVisitor({ ...body, userAgent });
    return NextResponse.json(visitor, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
