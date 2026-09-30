import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onRetry }) => {
  return (
    <div className="badge-action rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 my-4 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-xl bg-rose-200 dark:bg-rose-900/60 shrink-0">
          <AlertTriangle className="w-4 h-4 text-rose-800 dark:text-rose-200" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-rose-900 dark:text-rose-100">Notice</h4>
          <p className="text-xs text-rose-800/90 dark:text-rose-200/90 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 hover:bg-rose-50 transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};
