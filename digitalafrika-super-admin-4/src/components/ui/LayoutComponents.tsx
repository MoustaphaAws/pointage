import React, { ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export function Card({ children, className, title }: { children: ReactNode, className?: string, title?: string }) {
  return (
    <div className={cn("bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden", className)}>
      {title && (
        <div className="px-4 py-3 border-b border-slate-100 bg-white">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export function Button({ variant = 'primary', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
  };
  
  return (
    <button 
      className={cn(
        "px-4 py-2 text-sm font-medium rounded-lg transition-all active:scale-95 disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Badge({ children, variant = 'info' }: { children: ReactNode, variant?: 'success' | 'warning' | 'error' | 'info' }) {
  const variants = {
    success: "bg-emerald-100 text-emerald-700 border-emerald-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    error: "bg-red-100 text-red-700 border-red-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", variants[variant])}>
      {children}
    </span>
  );
}
