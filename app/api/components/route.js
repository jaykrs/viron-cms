import { NextResponse } from 'next/server';
import { listComponents, createComponent } from '../../../lib/server/components';
import { jsonError, requireAuth } from '../../../lib/server/routeHelpers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json(await listComponents(searchParams.get('kind')));
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request) {
  try {
    requireAuth(request);
    const body = await request.json();
    const component = await createComponent(body);
    return NextResponse.json(component, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
