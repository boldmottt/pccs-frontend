'use client';

import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  variant?: 'info' | 'warning' | 'success' | 'error';
}

export function Tooltip({
  content,
  children,
  position = 'top',
  variant = 'info',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const variants = {
    info: 'bg-gray-900 text-white',
    warning: 'bg-yellow-500 text-gray-900',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
  };

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={`
            absolute z-50 px-3 py-2 text-sm rounded-lg shadow-lg whitespace-nowrap
            transition-all duration-200 pointer-events-none
            ${variants[variant]}
            ${positionStyles[position]}
          `}
          role="tooltip"
          aria-label={content}
        >
          {content}
          <div
            className={`
              absolute w-2 h-2 transform rotate-45
              ${variants[variant]}
              ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2' : ''}
              ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2' : ''}
              ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2' : ''}
              ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2' : ''}
            `}
          />
        </div>
      )}
    </div>
  );
}

// Helper component for easier usage
interface HelpIconProps {
  content: string;
  children?: React.ReactNode;
}

export function HelpIcon({ content, children }: HelpIconProps) {
  return (
    <Tooltip content={content} position="top">
      <span className="inline-flex items-center justify-center w-5 h-5 text-gray-500 bg-gray-200 rounded-full text-xs font-medium cursor-help">
        {children || '?'}
      </span>
    </Tooltip>
  );
}
