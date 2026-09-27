import { NextResponse } from 'next/server';
import { getPublicNav } from '../../../../../lib/server/pages';
import { jsonError } from '../../../../../lib/server/routeHelpers';

export async function GET() {
  try {
    return NextResponse.json(await getPublicNav());
  } catch (err) {
    return jsonError(err);
  }
}
