'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const raw = searchParams.get('next') || '/studio';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/studio';
  }, [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Login failed');
      }

      router.replace(nextPath as any);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="studio-root">
      <div className="studio-empty-state">
        <form className="studio-empty-state__content" onSubmit={onSubmit}>
          <div className="studio-empty-state__icon-wrap">
            <span className="text-accent" style={{ fontSize: 28, fontWeight: 800 }}>T</span>
          </div>

          <h1 className="studio-empty-state__title">Sign in to Tattoo Lock System</h1>
          <p className="studio-empty-state__subtitle">Reference -&gt; Lock -&gt; Delta</p>

          <label style={{ width: '100%', maxWidth: 360 }}>
            <span style={{ display: 'block', marginBottom: 8, color: 'rgba(255,255,255,.62)', fontSize: 13 }}>
              Email
            </span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
              style={{
                width: '100%',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,.14)',
                background: 'rgba(255,255,255,.06)',
                color: 'white',
                padding: '13px 14px',
                outline: 'none',
              }}
            />
          </label>

          <label style={{ width: '100%', maxWidth: 360 }}>
            <span style={{ display: 'block', marginBottom: 8, color: 'rgba(255,255,255,.62)', fontSize: 13 }}>
              Password
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
              style={{
                width: '100%',
                borderRadius: 14,
                border: '1px solid rgba(255,255,255,.14)',
                background: 'rgba(255,255,255,.06)',
                color: 'white',
                padding: '13px 14px',
                outline: 'none',
              }}
            />
          </label>

          {error ? (
            <div className="studio-toast studio-toast--error" style={{ position: 'static', transform: 'none' }}>
              <span>{error}</span>
            </div>
          ) : null}

          <button className="button button-primary studio-empty-state__button" type="submit" disabled={busy}>
            <span>{busy ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>
      </div>
    </main>
  );
}
