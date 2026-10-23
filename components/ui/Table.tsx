import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export default function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-slate-200 bg-white ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        {children}
      </table>
    </div>
  );
}
