import { NextResponse } from 'next/server';
import { deleteAsset } from '../../../../lib/server/assets';
import { jsonError, requireAuth } from '../../../../lib/server/routeHelpers';

export const runtime = 'nodejs';

export async function DELETE(request, { params }) {
  try {
    requireAuth(request);
    await deleteAsset(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
