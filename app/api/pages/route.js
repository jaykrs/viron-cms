import { NextResponse } from 'next/server';
import { listPages, createPage } from '../../../lib/server/pages';
import { jsonError, requireAuth } from '../../../lib/server/routeHelpers';

export async function GET(request) {
  try {
    requireAuth(request);
    return NextResponse.json(await listPages());
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request) {
  try {
    requireAuth(request);
    const body = await request.json();
    const page = await createPage(body);
    return NextResponse.json(page, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
