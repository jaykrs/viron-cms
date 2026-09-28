import { NextResponse } from 'next/server';
import { listModels, createModel } from '../../../lib/server/contentFragments';
import { jsonError, requireAuth } from '../../../lib/server/routeHelpers';

export async function GET(request) {
  try {
    requireAuth(request);
    return NextResponse.json(await listModels({ withCounts: true }));
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request) {
  try {
    requireAuth(request);
    const model = await createModel(await request.json());
    return NextResponse.json(model, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
