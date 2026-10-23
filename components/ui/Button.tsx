import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition focus:outline-none';
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-xs md:text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };
  const variants = {
    primary: 'bg-madin-700 hover:bg-madin-800 text-white shadow-sm',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    outline: 'border border-slate-200 hover:bg-slate-50 text-slate-700',
    ghost: 'hover:bg-slate-100 text-slate-600',
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
