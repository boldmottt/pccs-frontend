'use client';

import React, { InputHTMLAttributes } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  id: string;
  labelHidden?: boolean;
}

export function FormInput({
  label,
  error,
  helperText,
  id,
  labelHidden = false,
  className = '',
  ...props
}: FormInputProps) {
  const inputClass = error
    ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
    : 'border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="mb-4">
      <div className="flex items-center">
        <label
          htmlFor={id}
          className={`block text-sm font-medium text-gray-700 mb-1 ${
            labelHidden ? 'sr-only' : ''
          }`}
        >
          {label}
        </label>
        {error && (
          <span className="ml-2 text-xs text-red-600" role="alert">
            필수 항목입니다
          </span>
        )}
      </div>
      <input
        id={id}
        className={`
          w-full px-3 py-2 border rounded-lg shadow-sm
          placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-offset-0
          transition-all duration-200
          ${inputClass}
          ${className}
        `}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${id}-helper`} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
}

// Select component
interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  id: string;
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  error,
  id,
}: FormSelectProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-3 py-2 border rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-offset-0
          transition-all duration-200
          ${error ? 'border-red-300' : 'border-gray-300'}
          focus:border-blue-500 focus:ring-blue-500
        `}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Textarea component
interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  id: string;
  rows?: number;
  placeholder?: string;
}

export function FormTextarea({
  label,
  value,
  onChange,
  error,
  id,
  rows = 4,
  placeholder,
}: FormTextareaProps) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`
          w-full px-3 py-2 border rounded-lg shadow-sm
          placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-offset-0
          transition-all duration-200
          ${error ? 'border-red-300' : 'border-gray-300'}
          focus:border-blue-500 focus:ring-blue-500
        `}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
