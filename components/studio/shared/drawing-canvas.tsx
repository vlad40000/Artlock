'use client';

import { useRef, useState, useEffect } from 'react';

interface DrawingCanvasProps {
  brushColor: string;
  brushSize: number;
  brushOpacity: number;
  tool: 'brush' | 'eraser';
  backgroundColor: string;
  scale: number;
  offset: { x: number; y: number };
  onScaleChange: (scale: number) => void;
  onOffsetChange: (offset: { x: number; y: number }) => void;
  // Added for Artlock integration
  width?: number;
  height?: number;
  backgroundImage?: string;
  onExport?: (blob: Blob) => void;
  isActive?: boolean;
}

export function DrawingCanvas({
  brushColor,
  brushSize,
  brushOpacity,
  tool,
  backgroundColor,
  scale,
  offset,
  onScaleChange,
  onOffsetChange,
  width = 1024,
  height = 1024,
  backgroundImage,
  onExport,
  isActive = true,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [canvasSize] = useState({ width, height });
  const [showPanCursor, setShowPanCursor] = useState(false);

  // Track modifier keys for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.code === 'Space') {
        setShowPanCursor(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey && e.code !== 'Space') {
        setShowPanCursor(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Make canvas transparent - background will be handled by CSS
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [canvasSize]);

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    // Adjusted for internal coordinate space vs CSS space
    const viewScale = rect.width / canvasSize.width;
    
    return {
      x: (clientX - rect.left) / viewScale,
      y: (clientY - rect.top) / viewScale,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    if (e.button === 1 || e.buttons === 4 || (e.ctrlKey || e.metaKey)) {
      // Middle mouse button or Ctrl+click for panning
      setIsPanning(true);
      setLastPos({ x: e.clientX, y: e.clientY });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(e.clientX, e.clientY);
    setIsDrawing(true);
    setLastPos(point);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up drawing style
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.globalAlpha = 1;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
      ctx.globalAlpha = brushOpacity;
    }
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw a dot at the starting point
    ctx.beginPath();
    ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Also start line
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastPos.x;
      const dy = e.clientY - lastPos.y;
      onOffsetChange({ x: offset.x + dx, y: offset.y + dy });
      setLastPos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!isDrawing || !isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getCanvasPoint(e.clientX, e.clientY);

    // Draw a line from last point to current point
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    setLastPos(point);
  };

  const stopDrawing = () => {
    if (isDrawing && onExport) {
       const canvas = canvasRef.current;
       if (canvas) {
         canvas.toBlob((blob) => {
           if (blob) onExport(blob);
         }, 'image/png');
       }
    }
    setIsDrawing(false);
    setIsPanning(false);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isActive) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(0.1, scale * delta), 10);
    
    onScaleChange(newScale);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-transparent"
      onWheel={handleWheel}
      style={{ touchAction: 'none' }}
    >
      {/* Background layer */}
      <div
        className="transition-transform duration-75 ease-out"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: canvasSize.width,
          height: canvasSize.height,
          marginLeft: -canvasSize.width / 2,
          marginTop: -canvasSize.height / 2,
          backgroundColor: backgroundColor,
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
      />
      
      {/* Drawing canvas layer */}
      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        className="transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          cursor: isPanning 
            ? 'grabbing' 
            : showPanCursor 
            ? 'grab' 
            : tool === 'eraser' 
            ? 'crosshair' 
            : 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'8\' fill=\'none\' stroke=\'black\' stroke-width=\'2\'/%3E%3C/svg%3E") 12 12, crosshair',
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginLeft: -canvasSize.width / 2,
          marginTop: -canvasSize.height / 2,
          opacity: 0.6,
        }}
      />
    </div>
  );
}
