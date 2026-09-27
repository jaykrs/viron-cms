import { NextResponse } from 'next/server';
import db from '../../../../lib/server/db';
import { signToken } from '../../../../lib/server/auth';
import { jsonError } from '../../../../lib/server/routeHelpers';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    const user = await db.get('SELECT * FROM admin_users WHERE email = ?', [email]);
    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const token = signToken({ id: user.id, email: user.email });
    return NextResponse.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    return jsonError(err);
  }
}
