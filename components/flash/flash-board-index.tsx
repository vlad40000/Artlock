'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Layers, ArrowRight } from 'lucide-react';
import type { FlashBoard } from '@/types/flash';

export function FlashBoardIndex({ boards }: { boards: FlashBoard[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch('/api/flash/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to create board');
      router.push(`/flash/${data.board.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-tls-bg overflow-hidden flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/studio')} className="text-white/30 hover:text-white transition-colors text-sm">
            ← Studio
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-tls-amber" />
            <span className="text-white font-black text-sm tracking-[0.14em] uppercase">Flash Boards</span>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-tls-amber text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors"
        >
          <Plus size={14} />
          New Board
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-8">
        {boards.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center">
              <Layers size={28} className="text-white/10" />
            </div>
            <div>
              <div className="text-white/20 text-[11px] font-black uppercase tracking-[0.3em] mb-2">No Flash Boards</div>
              <div className="text-white/40 text-sm">Create your first board to start building your flash collection.</div>
            </div>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-tls-amber text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors"
            >
              <Plus size={14} />
              Create Flash Board
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => router.push(`/flash/${board.id}`)}
                  className="group relative text-left p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-tls-amber/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-tls-amber/10 border border-tls-amber/20 flex items-center justify-center">
                      <Layers size={18} className="text-tls-amber" />
                    </div>
                    <ArrowRight size={16} className="text-white/20 group-hover:text-tls-amber transition-colors mt-1" />
                  </div>
                  <div className="text-white font-black text-sm mb-1">{board.title}</div>
                  {board.description && (
                    <div className="text-white/40 text-[11px] leading-relaxed">{board.description}</div>
                  )}
                  <div className="mt-4 text-[10px] text-white/20 font-black uppercase tracking-widest">
                    {new Date(board.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}

              {/* New board card */}
              <button
                onClick={() => setCreating(true)}
                className="group text-left p-6 rounded-2xl border border-dashed border-white/10 hover:border-tls-amber/30 hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-3 min-h-[140px]"
              >
                <Plus size={20} className="text-white/20 group-hover:text-tls-amber transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/50 transition-colors">
                  New Board
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setCreating(false); setTitle(''); setError(null); }} />
          <div className="relative w-[min(440px,90vw)] bg-tls-panel border border-tls-border rounded-2xl p-8 shadow-2xl">
            <h2 className="text-white font-black text-lg mb-1">New Flash Board</h2>
            <p className="text-white/40 text-[12px] mb-6">Give your collection a name — e.g. "Traditional Americana" or "Fine Line Botanicals".</p>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Board name..."
              className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-tls-amber placeholder:text-white/20 mb-4"
            />
            {error && <div className="text-red-400 text-[11px] mb-4">{error}</div>}
            <div className="flex gap-3">
              <button
                onClick={() => { setCreating(false); setTitle(''); setError(null); }}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={busy || !title.trim()}
                className="flex-1 py-3 rounded-xl bg-tls-amber text-black text-[11px] font-black uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40"
              >
                {busy ? 'Creating...' : 'Create Board'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
