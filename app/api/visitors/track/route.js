import { NextResponse } from 'next/server';
import { trackPageView } from '../../../../lib/server/visitors';
import { jsonError } from '../../../../lib/server/routeHelpers';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await trackPageView(body);
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err);
  }
}
