import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, clearAuthSession } from '@/auth';

export async function POST() {
  await clearAuthSession();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
