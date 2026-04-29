'use client';

import React, { useState, useRef } from 'react';
import { Upload, Plus, X, PencilLine, ArrowRight, Lock } from 'lucide-react';
import type { PieceState } from '@/types/domain';

interface ReferenceBoardProps {
  piece: PieceState;
  onUpdatePiece: (p: PieceState | ((prev: PieceState) => PieceState)) => void;
  onNextPhase: () => void;
  onUpload: (files: FileList) => Promise<void>;
  isUploading: boolean;
}

export function ReferenceBoard({
  piece,
  onUpdatePiece,
  onNextPhase,
  onUpload,
  isUploading
}: ReferenceBoardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [referenceMode, setReferenceMode] = useState<'library' | 'surface'>('library');

  const referenceImages = Array.isArray(piece.referenceImages) ? piece.referenceImages : [];

  const selectBase = (img: string) => {
    onUpdatePiece(prev => ({ ...prev, baseImage: img }));
  };

  const removeImage = (img: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdatePiece(prev => {
      const newRefs = prev.referenceImages.filter(i => i !== img);
      const newBase = prev.baseImage === img ? (newRefs.length > 0 ? newRefs[0] : null) : prev.baseImage;
      return {
        ...prev,
        referenceImages: newRefs,
        baseImage: newBase
      };
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-tls-bg p-8 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Reference Board</h2>
            <p className="mt-1 text-sm text-tls-muted font-medium">
              Upload references or sketch natively to define your project base.
            </p>
          </div>

          <div className="inline-flex rounded-2xl border border-tls-border bg-tls-panel-heavy p-1 shadow-tls-heavy">
            <button
              onClick={() => setReferenceMode('library')}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-wider transition ${
                referenceMode === 'library' ? 'bg-white text-black' : 'text-tls-muted hover:bg-tls-surface'
              }`}
            >
              <Upload className="h-4 w-4" />
              Library
            </button>
            <button
              onClick={() => setReferenceMode('surface')}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-wider transition ${
                referenceMode === 'surface' ? 'bg-white text-black' : 'text-tls-muted hover:bg-tls-surface'
              }`}
            >
              <PencilLine className="h-4 w-4" />
              Sketch
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-tls-panel-heavy rounded-tls-28 border border-tls-border-soft overflow-hidden flex flex-col p-6">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && onUpload(e.target.files)}
          />

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {referenceImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {referenceImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectBase(img)}
                    className={`group relative aspect-square cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
                      piece.baseImage === img
                        ? 'border-tls-amber ring-1 ring-tls-amber shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                        : 'border-transparent hover:border-tls-border'
                    } bg-black/40`}
                  >
                    <img src={img} alt={`Ref ${idx}`} className="h-full w-full object-contain" />
                    
                    <button
                      onClick={(e) => removeImage(img, e)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-lg transition-all hover:bg-red-500 hover:text-white group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {piece.baseImage === img && (
                      <div className="absolute bottom-0 left-0 right-0 bg-tls-amber py-1 text-center text-[9px] font-black uppercase text-black tracking-widest">
                        Active Base
                      </div>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="aspect-square flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-tls-border hover:border-tls-muted hover:bg-tls-surface transition-all group"
                >
                  <div className="h-10 w-10 rounded-full bg-tls-surface flex items-center justify-center text-tls-muted group-hover:text-white group-hover:bg-tls-border transition-all">
                    {isUploading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Plus className="h-5 w-5" />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-tls-faint group-hover:text-tls-muted">
                    {isUploading ? 'Uploading...' : 'Add more'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12">
                <div className="h-20 w-20 rounded-full bg-tls-surface flex items-center justify-center text-tls-faint mb-6">
                  {isUploading ? <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent" /> : <Upload className="h-10 w-10" />}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No references yet</h3>
                <p className="text-tls-muted text-sm max-w-xs mx-auto mb-8">
                  Upload your inspiration or start a fresh sketch to begin the design process.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-8 py-3 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-tls-amber transition-all shadow-lg"
                >
                  {isUploading ? 'Uploading...' : 'Upload References'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 h-16">
          {piece.baseImage && (
            <button
              onClick={onNextPhase}
              className="flex items-center gap-3 px-8 py-4 bg-tls-amber text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-tls-amber/10 hover:bg-white hover:scale-105 transition-all animate-in fade-in slide-in-from-bottom-2"
            >
              Continue to Lock Extraction
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
