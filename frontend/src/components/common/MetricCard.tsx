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
  const getScoreColor = (val: number) => {
    if (val >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (val >= 70) return 'text-teal-400 border-teal-500/30 bg-teal-500/10';
    if (val >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getBarGradient = (val: number) => {
    if (val >= 85) return 'from-emerald-500 to-teal-400';
    if (val >= 70) return 'from-teal-500 to-indigo-400';
    if (val >= 50) return 'from-amber-500 to-orange-400';
    return 'from-rose-500 to-red-400';
  };

  const scoreBadgeStyle = getScoreColor(score);
  const barGradient = getBarGradient(score);

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition-all duration-300 group">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800/80 text-teal-400 border border-slate-700/60 group-hover:scale-110 transition-transform">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200 capitalize">{label}</h4>
            {description && <p className="text-xs text-slate-400">{description}</p>}
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${scoreBadgeStyle}`}
        >
          {score}/100
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden p-0.5 border border-slate-700/40">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
        <span className="flex items-center gap-1">
          {score >= 75 ? (
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3 h-3 text-amber-400" />
          )}
          {score >= 85 ? 'Optimal' : score >= 70 ? 'Good' : 'Needs Care'}
        </span>
        <span>Target: 90+</span>
      </div>
    </div>
  );
};
