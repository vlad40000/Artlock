'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Paintbrush, Trash2 } from 'lucide-react';

interface MaskCanvasProps {
  width: number;
  height: number;
  onExport: (blob: Blob) => void;
  isActive: boolean;
}

export function MaskCanvas({ width, height, onExport, isActive }: MaskCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set initial state - transparent black
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      const mouseEvent = e as React.MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isActive) return;
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) onExport(blob);
      }, 'image/png');
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (mode === 'draw') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'white'; 
    } else {
      ctx.globalCompositeOperation = 'destination-out';
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) onExport(blob);
    }, 'image/png');
  };

  if (!isActive) return null;

  return (
    <div 
      className="absolute inset-0 z-40 overflow-hidden pointer-events-none"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className={`w-full h-full object-contain pointer-events-auto cursor-crosshair opacity-60 transition-opacity ${isActive ? 'opacity-60' : 'opacity-0'}`}
        style={{ 
          imageRendering: 'pixelated',
          // Only allow pointer events if we are in 'draw' or 'erase' mode and isActive
          pointerEvents: isActive ? 'auto' : 'none'
        }}
      />
      
      {/* MASK CONTROLS */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-tls-panel-heavy backdrop-blur-tls-32 border border-tls-border px-4 py-2 rounded-2xl shadow-tls-heavy animate-tls-slide-up pointer-events-auto">
        <button 
          onClick={() => setMode('draw')}
          className={`p-2 rounded-lg transition-colors ${mode === 'draw' ? 'bg-tls-amber text-black' : 'text-white/40 hover:bg-white/10'}`}
          title="Paint Mask"
        >
          <Paintbrush size={18} />
        </button>
        <button 
          onClick={() => setMode('erase')}
          className={`p-2 rounded-lg transition-colors ${mode === 'erase' ? 'bg-tls-amber text-black' : 'text-white/40 hover:bg-white/10'}`}
          title="Erase Mask"
        >
          <Eraser size={18} />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <input 
          type="range" 
          min="10" 
          max="100" 
          value={brushSize} 
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          className="w-24 accent-tls-amber"
        />
        <div className="w-px h-6 bg-white/10 mx-1" />
        <button 
          onClick={handleClear}
          className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
          title="Clear Mask"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
