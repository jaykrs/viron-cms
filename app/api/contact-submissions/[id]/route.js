import { NextResponse } from 'next/server';
import { getSubmissionById, updateStatus, deleteSubmission } from '../../../../lib/server/contactSubmissions';
import { jsonError, requireAuth } from '../../../../lib/server/routeHelpers';

export async function GET(request, { params }) {
  try {
    requireAuth(request);
    return NextResponse.json(await getSubmissionById(params.id));
  } catch (err) {
    return jsonError(err);
  }
}

// Marks a submission read/new. Body: { status: 'new' | 'read' }
export async function PUT(request, { params }) {
  try {
    requireAuth(request);
    const body = await request.json();
    return NextResponse.json(await updateStatus(params.id, body.status));
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    requireAuth(request);
    await deleteSubmission(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
