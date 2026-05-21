'use client';

import React, { useState, useRef } from 'react';

const TEXT_MODELS = [
  { id: 'gemini-3.1-pro-preview',  label: 'Gemini 3.1 Pro Preview (current)', tag: 'current' },
  { id: 'gemini-2.5-pro',          label: 'Gemini 2.5 Pro (stable)',           tag: 'stable'  },
  { id: 'gemini-2.5-flash',        label: 'Gemini 2.5 Flash (fast/cheap)',     tag: 'fast'    },
];

const IMAGE_MODELS = [
  { id: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image (current · Nano Banana 2)', tag: 'current' },
  { id: 'gemini-3-pro-image-preview',     label: 'Gemini 3 Pro Image (Nano Banana Pro · thinking)', tag: 'pro'     },
  { id: 'gemini-2.5-flash-image',         label: 'Gemini 2.5 Flash Image (Nano Banana)',            tag: 'older'   },
];

const PHASES = [
  { id: '1A',         label: 'Phase 1A — Lock Extraction',    modelKind: 'text',  desc: 'Reads image, outputs 7 visual locks as structured text' },
  { id: 'flash-theme', label: 'Flash Theme Extraction',       modelKind: 'text',  desc: 'Reads tattoo image, outputs style/palette/motif JSON' },
  { id: '1B',         label: 'Phase 1B — Surgical Edit',      modelKind: 'image', desc: 'Image-to-image: apply a delta using lock constraints' },
  { id: '3',          label: 'Phase 3 — Flash Sheet Variants', modelKind: 'image', desc: 'Image-to-image: generate LINEWORK / B&G / COLOR panels' },
];

interface TestResult {
  model: string;
  phase: string;
  latencyMs: number;
  text: string | null;
  imageBase64: string | null;
  imageMimeType: string | null;
  usageMetadata: Record<string, number> | null;
  error?: string;
}

const TAG_COLORS: Record<string, string> = {
  current: 'bg-tls-amber/20 text-tls-amber border-tls-amber/30',
  stable:  'bg-tls-emerald/20 text-tls-emerald border-tls-emerald/30',
  fast:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pro:     'bg-purple-500/20 text-purple-400 border-purple-500/30',
  older:   'bg-white/10 text-white/40 border-white/10',
};

export function ModelTestClient() {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [phase, setPhase] = useState(PHASES[0]);
  const [selectedModels, setSelectedModels] = useState<string[]>(['gemini-3.1-pro-preview']);
  const [delta1, setDelta1] = useState('Apply a subtle line weight increase to the outer silhouette');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  const availableModels = phase.modelKind === 'text' ? TEXT_MODELS : IMAGE_MODELS;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageMimeType(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setImageBase64(data.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const toggleModel = (id: string) => {
    setSelectedModels(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const runTest = async () => {
    if (!imageBase64 || selectedModels.length === 0 || running) return;
    setRunning(true);
    setResults([]);

    const runs = selectedModels.map(async (model): Promise<TestResult> => {
      try {
        const resp = await fetch('/api/admin/model-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phase: phase.id,
            modelOverride: model,
            imageBase64,
            mimeType: imageMimeType,
            delta1: phase.id === '1B' ? delta1 : undefined,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) return { model, phase: phase.id, latencyMs: 0, text: null, imageBase64: null, imageMimeType: null, usageMetadata: null, error: data.error };
        return data;
      } catch (err) {
        return { model, phase: phase.id, latencyMs: 0, text: null, imageBase64: null, imageMimeType: null, usageMetadata: null, error: err instanceof Error ? err.message : 'Unknown error' };
      }
    });

    // Run sequentially to avoid rate limits
    const out: TestResult[] = [];
    for (const run of runs) {
      out.push(await run);
      setResults([...out]);
    }
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-tls-bg text-white p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-tls-amber mb-2">Admin · Model Test Harness</div>
          <h1 className="text-3xl font-black text-white">Prompt × Model Benchmarking</h1>
          <p className="text-white/40 mt-2 text-sm">Test prompt contracts against different Gemini models. Compare output quality and latency side-by-side.</p>
        </div>

        <div className="grid grid-cols-[320px,1fr] gap-8">

          {/* Left: Config panel */}
          <div className="space-y-6">

            {/* Image upload */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">Test Image</div>
              {imageBase64 ? (
                <div className="relative">
                  <img src={`data:${imageMimeType};base64,${imageBase64}`} className="w-full rounded-xl" alt="Test" />
                  <button onClick={() => { setImageBase64(null); if (uploadRef.current) uploadRef.current.value = ''; }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white/60 hover:text-white flex items-center justify-center text-lg">
                    ×
                  </button>
                </div>
              ) : (
                <button onClick={() => uploadRef.current?.click()}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-white/10 hover:border-tls-amber/40 flex flex-col items-center justify-center gap-2 transition-colors">
                  <div className="text-3xl text-white/10">↑</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Upload tattoo reference</div>
                </button>
              )}
              <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            {/* Phase selector */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">Prompt Phase</div>
              <div className="space-y-2">
                {PHASES.map(p => (
                  <button key={p.id} onClick={() => { setPhase(p); setSelectedModels([]); }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${phase.id === p.id ? 'border-tls-amber bg-tls-amber/10' : 'border-white/[0.06] hover:border-white/20'}`}>
                    <div className="text-[11px] font-black uppercase tracking-widest text-white">{p.label}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Phase 1B delta input */}
            {phase.id === '1B' && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">Test Delta (1B)</div>
                <textarea value={delta1} onChange={e => setDelta1(e.target.value)} rows={3}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-tls-amber resize-none" />
              </div>
            )}

            {/* Model selector */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  {phase.modelKind === 'text' ? 'Text Models' : 'Image Models'}
                </div>
                <button onClick={() => setCompareMode(p => !p)}
                  className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border transition-all ${compareMode ? 'border-tls-amber text-tls-amber' : 'border-white/10 text-white/30'}`}>
                  Compare mode
                </button>
              </div>
              <div className="space-y-2">
                {availableModels.map(m => {
                  const selected = selectedModels.includes(m.id);
                  return (
                    <button key={m.id}
                      onClick={() => compareMode ? toggleModel(m.id) : setSelectedModels([m.id])}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all ${selected ? 'border-tls-amber bg-tls-amber/10' : 'border-white/[0.06] hover:border-white/20'}`}>
                      <div className="flex items-center gap-2">
                        <div className="text-[11px] font-black text-white flex-1">{m.label}</div>
                        <span className={`px-1.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${TAG_COLORS[m.tag]}`}>{m.tag}</span>
                      </div>
                      <div className="text-[10px] text-white/30 font-mono mt-0.5">{m.id}</div>
                    </button>
                  );
                })}
              </div>
              {compareMode && selectedModels.length > 0 && (
                <div className="mt-2 text-[10px] text-white/30">{selectedModels.length} model{selectedModels.length > 1 ? 's' : ''} selected — will run sequentially</div>
              )}
            </div>

            {/* Run button */}
            <button
              disabled={!imageBase64 || selectedModels.length === 0 || running}
              onClick={runTest}
              className="w-full py-4 rounded-2xl bg-tls-amber text-black font-black text-[12px] uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40"
            >
              {running ? 'Running...' : `Run Test${selectedModels.length > 1 ? ` (${selectedModels.length} models)` : ''}`}
            </button>
          </div>

          {/* Right: Results */}
          <div className="space-y-6">
            {results.length === 0 && !running && (
              <div className="h-64 flex items-center justify-center rounded-2xl border-2 border-dashed border-white/[0.06]">
                <div className="text-center text-white/20">
                  <div className="text-4xl mb-3">⚡</div>
                  <div className="text-[11px] font-black uppercase tracking-widest">Results appear here</div>
                </div>
              </div>
            )}

            {running && results.length === 0 && (
              <div className="h-64 flex items-center justify-center rounded-2xl border border-white/[0.08]">
                <div className="text-center">
                  <div className="text-tls-amber text-[11px] font-black uppercase tracking-widest animate-pulse">Running...</div>
                  <div className="text-white/30 text-xs mt-2">Calling Gemini API</div>
                </div>
              </div>
            )}

            {results.map((result, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
                {/* Result header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Phase {result.phase}</div>
                    <div className="font-mono text-white text-sm">{result.model.replace('models/', '')}</div>
                  </div>
                  <div className="text-right">
                    {result.error ? (
                      <div className="text-red-400 text-[11px] font-black uppercase tracking-widest">FAILED</div>
                    ) : (
                      <>
                        <div className={`text-2xl font-black tabular-nums ${result.latencyMs > 30000 ? 'text-red-400' : result.latencyMs > 15000 ? 'text-tls-amber' : 'text-tls-emerald'}`}>
                          {(result.latencyMs / 1000).toFixed(1)}s
                        </div>
                        <div className="text-[9px] text-white/30 uppercase tracking-widest">latency</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Usage metadata */}
                {result.usageMetadata && (
                  <div className="flex gap-4 px-5 py-3 border-b border-white/[0.04] bg-white/[0.02]">
                    {Object.entries(result.usageMetadata).map(([k, v]) => (
                      <div key={k} className="text-center">
                        <div className="text-white font-black tabular-nums text-sm">{v.toLocaleString()}</div>
                        <div className="text-[8px] text-white/30 uppercase tracking-widest">{k.replace('TokenCount', '')}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Error */}
                {result.error && (
                  <div className="px-5 py-4 text-red-400 text-sm">{result.error}</div>
                )}

                {/* Text output */}
                {result.text && (
                  <div className="px-5 py-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Output</div>
                    <pre className="text-white/80 text-[11px] leading-relaxed whitespace-pre-wrap font-mono bg-black/20 rounded-xl p-4 overflow-auto max-h-96">
                      {result.text}
                    </pre>
                  </div>
                )}

                {/* Image output */}
                {result.imageBase64 && (
                  <div className="px-5 py-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Generated Image</div>
                    <img
                      src={`data:${result.imageMimeType ?? 'image/png'};base64,${result.imageBase64}`}
                      className="w-full rounded-xl border border-white/10"
                      alt="Model output"
                    />
                    <a
                      href={`data:${result.imageMimeType ?? 'image/png'};base64,${result.imageBase64}`}
                      download={`test-${result.phase}-${result.model.split('/').pop()}.png`}
                      className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors"
                    >
                      ↓ Download
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
