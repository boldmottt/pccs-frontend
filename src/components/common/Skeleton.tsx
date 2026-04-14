'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'image' | 'circle' | 'rounded';
  width?: string;
  height?: string;
  lines?: number;
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-gray-200 rounded';

  const variants = {
    text: 'h-4 w-full',
    image: 'w-full h-full',
    circle: 'rounded-full',
    rounded: 'rounded-lg',
  };

  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseStyles} ${variants[variant]}`}
            style={{ width, height }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${className}`}
      style={{ width, height }}
    />
  );
}

// Loading wrapper component
interface LoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
}

export function LoadingWrapper({ isLoading, children }: LoadingWrapperProps) {
  if (isLoading) {
    return <div className="animate-pulse">{children}</div>;
  }
  return <>{children}</>;
}
