import { NextResponse } from 'next/server';
import { getVisitorJourney, deleteVisitor } from '../../../../lib/server/visitors';
import { jsonError, requireAuth } from '../../../../lib/server/routeHelpers';

export async function GET(request, { params }) {
  try {
    requireAuth(request);
    return NextResponse.json(await getVisitorJourney(params.id));
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    requireAuth(request);
    await deleteVisitor(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
