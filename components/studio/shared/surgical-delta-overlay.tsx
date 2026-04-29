'use client';

import React from 'react';

export interface SurgicalDelta {
  x: number; // 0.0 - 1.0
  y: number; // 0.0 - 1.0
  label?: string;
  type?: 'inclusion' | 'exclusion' | 'hint';
}

interface SurgicalDeltaOverlayProps {
  deltas: SurgicalDelta[];
  width: number;
  height: number;
  isVisible?: boolean;
}

/**
 * SurgicalDeltaOverlay - Renders normalized surgical hints/regions over the canvas.
 * Correctly scales to match the base image's natural dimensions.
 */
export function SurgicalDeltaOverlay({ 
  deltas, 
  width, 
  height, 
  isVisible = true 
}: SurgicalDeltaOverlayProps) {
  if (!isVisible || !deltas.length) return null;

  return (
    <svg 
      className="absolute inset-0 z-50 pointer-events-none w-full h-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ imageRendering: 'pixelated' }}
    >
      {deltas.map((delta, i) => {
        const color = delta.type === 'exclusion' ? '#ef4444' : '#22c55e'; // red-500 : green-500
        return (
          <g key={i} className="animate-pulse">
            <circle 
              cx={delta.x * width} 
              cy={delta.y * height} 
              r={width * 0.015} // Scale radius relative to image size
              fill="none"
              stroke={color}
              strokeWidth={width * 0.002}
              strokeDasharray={width * 0.01}
            />
            <circle 
              cx={delta.x * width} 
              cy={delta.y * height} 
              r={width * 0.003}
              fill={color}
            />
            {delta.label && (
              <text
                x={delta.x * width + width * 0.02}
                y={delta.y * height}
                fill="white"
                fontSize={width * 0.012}
                className="font-bold drop-shadow-md select-none"
                alignmentBaseline="middle"
              >
                {delta.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
