import { NextResponse } from 'next/server';
import { listAssets, saveUploadedFile } from '../../../lib/server/assets';
import { jsonError, requireAuth } from '../../../lib/server/routeHelpers';

export const runtime = 'nodejs'; // needs fs access — not available on the edge runtime

export async function GET(request) {
  try {
    requireAuth(request);
    return NextResponse.json(await listAssets());
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request) {
  try {
    requireAuth(request);
    const formData = await request.formData();
    const file = formData.get('file');
    const asset = await saveUploadedFile(file);
    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
