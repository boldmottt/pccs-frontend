'use client';

import React from 'react';

interface ColorSwatchProps {
  color: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showAlpha?: boolean;
  onCopy?: (color: string) => void;
}

export function ColorSwatch({
  color,
  label,
  size = 'md',
  showAlpha = false,
  onCopy,
}: ColorSwatchProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  // Ensure color has # prefix
  const displayColor = color.startsWith('#') ? color : `#${color}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCopy) {
      onCopy(displayColor);
    }
    navigator.clipboard.writeText(displayColor);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizes[size]} rounded-lg shadow-md cursor-pointer transition-transform hover:scale-110 hover:shadow-lg relative group`}
        style={{
          backgroundColor: displayColor,
          backgroundImage: showAlpha
            ? `linear-gradient(45deg, #ccc 25%, transparent 25%),
               linear-gradient(-45deg, #ccc 25%, transparent 25%),
               linear-gradient(45deg, transparent 75%, #ccc 75%),
               linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
        }}
        role="img"
        aria-label={`Color swatch: ${label || displayColor}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleCopy(e as unknown as React.MouseEvent);
          }
        }}
      >
        {/* Copy indicator */}
        <div className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg transition-opacity">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>
      {label && (
        <span className="text-xs font-medium text-gray-600 truncate max-w-full">
          {label}
        </span>
      )}
    </div>
  );
}

// Color Picker Input
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-3">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        type="color"
        value={value.startsWith('#') ? value : `#${value}`}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
        aria-label="Color picker"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 px-2 py-1 text-sm border rounded-lg font-mono"
        placeholder="#000000"
        aria-label="Hex color value"
      />
    </div>
  );
}
