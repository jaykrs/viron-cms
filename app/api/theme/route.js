import { NextResponse } from 'next/server';
import { getTheme, updateTheme } from '../../../lib/server/theme';
import { jsonError, requireAuth } from '../../../lib/server/routeHelpers';

export async function GET() {
  try {
    return NextResponse.json(await getTheme());
  } catch (err) {
    return jsonError(err);
  }
}

export async function PUT(request) {
  try {
    requireAuth(request);
    const body = await request.json();
    const theme = await updateTheme(body);
    return NextResponse.json(theme);
  } catch (err) {
    return jsonError(err);
  }
}
