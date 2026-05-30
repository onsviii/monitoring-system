/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'neutral' | 'ai';
  id?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  id,
  className = '',
}) => {
  const baseClasses = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none border transition-all duration-200';

  const variants = {
    neutral: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
    primary: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    ai: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-sm font-medium animate-pulse',
  };

  return (
    <span
      id={id}
      className={`${baseClasses} ${variants[variant]} ${className}`}
    >
      {variant === 'ai' && <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin-slow" />}
      {children || (variant === 'ai' ? 'AI-generated' : '')}
    </span>
  );
};
export default Badge;
