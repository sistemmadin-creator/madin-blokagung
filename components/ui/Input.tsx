import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full space-y-1">
      {label && <label className="block text-xs font-semibold text-slate-700">{label}</label>}
      <input
        className={`w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-madin-600 focus:border-transparent ${className}`}
        {...props}
      />
      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
    </div>
  );
}
