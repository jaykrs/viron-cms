import { NextResponse } from 'next/server';
import { getComponentById, updateComponent, deleteComponent } from '../../../../lib/server/components';
import { jsonError, requireAuth } from '../../../../lib/server/routeHelpers';

export async function GET(request, { params }) {
  try {
    return NextResponse.json(await getComponentById(params.id));
  } catch (err) {
    return jsonError(err);
  }
}

export async function PUT(request, { params }) {
  try {
    requireAuth(request);
    const body = await request.json();
    const component = await updateComponent(params.id, body);
    return NextResponse.json(component);
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(request, { params }) {
  try {
    requireAuth(request);
    await deleteComponent(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return jsonError(err);
  }
}
