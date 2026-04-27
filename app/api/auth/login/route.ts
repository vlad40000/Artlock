import { NextResponse } from 'next/server';
import { createAuthSession, findUserByEmail, setSessionCookie, verifyPassword } from '@/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  const passwordMatches = user ? await verifyPassword(password, user.password_hash) : false;

  if (!user || !passwordMatches) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const session = await createAuthSession(user.id);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
}
