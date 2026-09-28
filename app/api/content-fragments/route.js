import { NextResponse } from 'next/server';
import { listFragmentsAdmin, createFragment } from '../../../lib/server/contentFragments';
import { jsonError, requireAuth } from '../../../lib/server/routeHelpers';

export async function GET(request) {
  try {
    requireAuth(request);
    const sp = new URL(request.url).searchParams;
    return NextResponse.json(
      await listFragmentsAdmin({
        modelId: sp.get('modelId'),
        modelApiName: sp.get('modelApiName'),
        search: sp.get('search'),
        limit: sp.get('limit') || undefined,
        offset: sp.get('offset') || undefined,
      })
    );
  } catch (err) {
    return jsonError(err);
  }
}

// body: { modelId, title, name?, status?, data }
export async function POST(request) {
  try {
    requireAuth(request);
    const body = await request.json();
    const fragment = await createFragment(Number(body.modelId), body);
    return NextResponse.json(fragment, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
