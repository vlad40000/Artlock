import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { promisify } from 'util';
import { sql } from '@/lib/db';
import { env } from '@/lib/utils/env';

export const AUTH_COOKIE_NAME = 'tls_session';

const scrypt = promisify(scryptCallback);
const SESSION_TTL_DAYS = 30;

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
}

export interface AuthResult {
  user: AuthUser;
}

interface AppUserRow {
  id: string;
  email: string;
  display_name: string | null;
  image_url: string | null;
  password_hash: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getAdminEmails() {
  return new Set(
    env.adminEmails
      .split(',')
      .map((email) => normalizeEmail(email))
      .filter(Boolean),
  );
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function toAuthUser(user: Omit<AppUserRow, 'password_hash'>): AuthUser {
  const email = normalizeEmail(user.email);
  return {
    id: user.id,
    email,
    name: user.display_name,
    image: user.image_url,
    isAdmin: getAdminEmails().has(email),
  };
}

function isDatabaseUnavailable(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes('DATABASE_URL') || error.message.includes('fetch failed');
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString('base64url')}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [scheme, salt, key] = storedHash.split(':');
  if (scheme !== 'scrypt' || !salt || !key) return false;

  const expected = Buffer.from(key, 'base64url');
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function findUserByEmail(email: string) {
  const rows = (await sql`
    SELECT id, email, display_name, image_url, password_hash
    FROM app_user
    WHERE email = ${normalizeEmail(email)}
    LIMIT 1
  `) as AppUserRow[];

  return rows[0] ?? null;
}

export async function createAuthSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO auth_sessions (token_hash, user_id, expires_at)
    VALUES (${tokenHash}, ${userId}, ${expiresAt.toISOString()})
  `;

  return { token, expiresAt };
}

export function setSessionCookie(response: Response, token: string, expiresAt: Date) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  response.headers.append(
    'Set-Cookie',
    `${AUTH_COOKIE_NAME}=${token}; Path=/; Expires=${expiresAt.toUTCString()}; HttpOnly; SameSite=Lax${secure}`,
  );
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    try {
      await sql`
        DELETE FROM auth_sessions
        WHERE token_hash = ${hashSessionToken(token)}
      `;
    } catch (error) {
      if (!isDatabaseUnavailable(error)) throw error;
      console.warn('[auth] skipped session cleanup because the database is unavailable');
    }
  }
}

export async function auth(): Promise<AuthResult | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  let rows: Array<Omit<AppUserRow, 'password_hash'>>;
  try {
    rows = (await sql`
      SELECT u.id, u.email, u.display_name, u.image_url
      FROM auth_sessions s
      JOIN app_user u ON u.id = s.user_id
      WHERE s.token_hash = ${hashSessionToken(token)}
        AND s.expires_at > NOW()
      LIMIT 1
    `) as Array<Omit<AppUserRow, 'password_hash'>>;
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    console.warn('[auth] treating session as signed out because the database is unavailable');
    return null;
  }

  const user = rows[0];
  return user ? { user: toAuthUser(user) } : null;
}
