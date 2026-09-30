import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading analysis data...',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md animate-pulse" />
        <Loader2 className={`${sizeClasses[size]} text-emerald-600 dark:text-emerald-400 animate-spin relative z-10`} />
      </div>
      {label && <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</p>}
    </div>
  );
};
