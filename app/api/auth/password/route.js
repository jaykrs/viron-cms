import { NextResponse } from 'next/server';
import { changePassword } from '../../../../lib/server/auth';
import { jsonError, requireAuth } from '../../../../lib/server/routeHelpers';

export async function PUT(request) {
  try {
    const user = requireAuth(request);
    const { currentPassword, newPassword } = await request.json();
    await changePassword(user.id, currentPassword, newPassword);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
