import { NextResponse } from 'next/server';
import { getPageById, updatePage, deletePage } from '../../../../lib/server/pages';
import { jsonError, requireAuth } from '../../../../lib/server/routeHelpers';

export async function GET(request, { params }) {
  try {
    requireAuth(request);
    return NextResponse.json(await getPageById(params.id));
  } catch (err) {
    return jsonError(err);
  }
}

export async function PUT(request, { params }) {
  try {
    requireAuth(request);
    const body = await request.json();
    const page = await updatePage(params.id, body);
    return NextResponse.json(page);
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    requireAuth(request);
    await deletePage(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
