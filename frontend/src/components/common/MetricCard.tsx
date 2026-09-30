import React from 'react';
import { ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

interface MetricCardProps {
  label: string;
  score: number;
  description?: string;
  icon?: React.ElementType;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  score,
  description,
  icon: Icon = Sparkles,
}) => {
  const getBadgeClass = (val: number) => {
    if (val >= 80) return 'badge-optimal';
    if (val >= 65) return 'badge-optimal';
    if (val >= 50) return 'badge-moderate';
    return 'badge-action';
  };

  const badgeClass = getBadgeClass(score);

  return (
    <div className="surface-card rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 capitalize">{label}</h4>
            {description && <p className="text-[11px] text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
          {score}/100
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          {score >= 75 ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          )}
          {score >= 85 ? 'Optimal' : score >= 70 ? 'Good' : 'Needs Care'}
        </span>
        <span>Target: 85+</span>
      </div>
    </div>
  );
};
