import { NextResponse } from 'next/server';
import { getFragmentById, updateFragment, deleteFragment } from '../../../../lib/server/contentFragments';
import { jsonError, requireAuth } from '../../../../lib/server/routeHelpers';

export async function GET(request, { params }) {
  try {
    requireAuth(request);
    return NextResponse.json(await getFragmentById(params.id));
  } catch (err) {
    return jsonError(err);
  }
}

export async function PUT(request, { params }) {
  try {
    requireAuth(request);
    return NextResponse.json(await updateFragment(Number(params.id), await request.json()));
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    requireAuth(request);
    await deleteFragment(Number(params.id));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
