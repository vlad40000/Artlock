'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, ArrowRight, Mail, Lock as LockIcon, AlertCircle, Loader2 } from 'lucide-react';

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
    <div className="tls-shell min-h-screen flex items-center justify-center p-4">
      {/* Background with Image Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/artlock_login_bg_1777336215397.png" 
          alt="background" 
          className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/80 to-tls-bg/40" />
      </div>

      {/* Login Card */}
      <main className="relative z-10 w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-500">
        <div className="tls-panel-heavy backdrop-blur-tls-32 border border-white/10 rounded-tls-34 p-8 shadow-tls-artboard">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-tls-amber/10 border border-tls-amber/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(251,191,36,0.15)]">
              <ShieldCheck className="text-tls-amber" size={32} strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Artlock Studio</h1>
            <p className="text-tls-muted text-sm uppercase tracking-[0.2em] font-black">
              Tattoo Lock System
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-tls-faint px-1">
                Artist Email
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-tls-amber transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@studio.com"
                  required
                  disabled={busy}
                  className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/10 focus:border-tls-amber focus:bg-white/[0.08] outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-tls-faint px-1">
                Access Key
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-tls-amber transition-colors">
                  <LockIcon size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={busy}
                  className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/10 focus:border-tls-amber focus:bg-white/[0.08] outline-none transition-all"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-in slide-in-from-top-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={busy}
              className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-tls-amber transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {busy ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span>Initialize Session</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] text-tls-faint uppercase tracking-widest font-black leading-loose">
              Secure Environment<br />
              v0.4.0 — Production Build
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
