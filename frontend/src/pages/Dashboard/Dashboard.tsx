import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLatestAnalysisApi } from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { MetricCard } from '../../components/common/MetricCard';
import {
  Sparkles,
  Sun,
  Moon,
  Calendar,
  CheckSquare,
  Square,
  ChevronRight,
  Droplet,
  ShieldCheck,
  AlertCircle,
  Activity,
  Layers,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['latestAnalysis'],
    queryFn: getLatestAnalysisApi,
  });

  // Local checklist state for today's routine
  const [completedRoutineItems, setCompletedRoutineItems] = useState<Record<string, boolean>>({});

  const toggleItem = (itemKey: string) => {
    setCompletedRoutineItems((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  if (isLoading) return <LoadingSpinner label="Loading DermaSense AI Dashboard..." size="lg" />;
  if (isError) return <ErrorAlert message={(error as Error).message} onRetry={() => refetch()} />;

  if (!data) return null;

  const { analysis, recommendation } = data;
  const { skinScore, subscores, detectedIssues, poresDetected, skinType } = analysis;

  const getScoreBadgeColor = (val: number) => {
    if (val >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (val >= 70) return 'text-teal-400 border-teal-500/30 bg-teal-500/10';
    if (val >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'medium':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'low':
        return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* 1. Header & Quick Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>DermaSense Health Summary</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Skin Health Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time AI diagnosis breakdown, subscore analysis, and tailored routines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 text-xs text-slate-300">
            <Droplet className="w-4 h-4 text-teal-400" />
            <span>Skin Type: <strong className="text-white capitalize">{skinType}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Top Score Hero Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Big Number Score Card */}
        <div className="lg:col-span-1 glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl" />

          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Overall AI Skin Score
          </h3>

          {/* Radial score display ring */}
          <div className="relative w-44 h-44 flex items-center justify-center mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="text-slate-800"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className="text-teal-400 transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * skinScore) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-white tracking-tight">{skinScore}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">out of 100</span>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getScoreBadgeColor(
              skinScore
            )}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{skinScore >= 80 ? 'Healthy & Vibrant' : 'Requires Attention'}</span>
          </div>
        </div>

        {/* AI Key Insights Box */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Activity className="w-4 h-4" />
              <span>AI Recommendation Engine Insights</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Diagnostic Summary</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
              "{recommendation.explanation}"
            </p>

            <div className="space-y-2">
              {recommendation.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300"
                >
                  <ChevronRight className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Subscores Breakdown Grid */}
      <div>
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-400" />
          Subscore Breakdown
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard label="Acne Score" score={subscores.acne} description="Clear skin & lesion control" />
          <MetricCard label="Pigmentation" score={subscores.pigmentation} description="Even tone & dark spot index" />
          <MetricCard label="Dark Circles" score={subscores.darkCircles} description="Periorbital brightness" />
          <MetricCard label="Wrinkles & Fine Lines" score={subscores.wrinkles} description="Elasticity & smooth texture" />
          <MetricCard label="Skin Texture" score={subscores.texture} description="Surface smoothness score" />
          <MetricCard label="Oil Balance" score={subscores.oilBalance} description="Sebum secretion equilibrium" />
        </div>
      </div>

      {/* 4. Detailed Issue Detection & Pores Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detected Issues */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Detected Skin Issues
          </h3>

          <div className="space-y-3">
            {detectedIssues.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.present ? 'bg-amber-400 animate-ping' : 'bg-slate-600'
                    }`}
                  />
                  <span className="font-semibold text-white">{item.issue}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Conf: {Math.round(item.confidence * 100)}%
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getSeverityBadge(
                      item.severity
                    )}`}
                  >
                    {item.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pores Analysis by Region */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Droplet className="w-4 h-4 text-teal-400" />
            Regional Pore Mapping
          </h3>

          <div className="space-y-3">
            {poresDetected.map((pore, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-slate-200">{pore.region}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Conf: {Math.round(pore.confidence * 100)}%
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getSeverityBadge(
                      pore.severity
                    )}`}
                  >
                    {pore.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Today's Recommended Routine Checklists */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800">
        <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-teal-400" />
          Today's Recommended Skincare Routine
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Morning Routine */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-4">
              <Sun className="w-4 h-4" />
              <span>Morning Steps</span>
            </div>
            <div className="space-y-2.5">
              {recommendation.routine.morning.map((step, idx) => {
                const key = `m_${idx}`;
                const checked = !!completedRoutineItems[key];
                return (
                  <div
                    key={key}
                    onClick={() => toggleItem(key)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                      checked
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-300 line-through opacity-70'
                        : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{step}</span>
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Night Routine */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-4">
              <Moon className="w-4 h-4" />
              <span>Night Steps</span>
            </div>
            <div className="space-y-2.5">
              {recommendation.routine.night.map((step, idx) => {
                const key = `n_${idx}`;
                const checked = !!completedRoutineItems[key];
                return (
                  <div
                    key={key}
                    onClick={() => toggleItem(key)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                      checked
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-300 line-through opacity-70'
                        : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{step}</span>
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Treatments */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-4">
              <Calendar className="w-4 h-4" />
              <span>Weekly Treatments</span>
            </div>
            <div className="space-y-2.5">
              {recommendation.routine.weekly.map((step, idx) => {
                const key = `w_${idx}`;
                const checked = !!completedRoutineItems[key];
                return (
                  <div
                    key={key}
                    onClick={() => toggleItem(key)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                      checked
                        ? 'bg-teal-500/10 border-teal-500/30 text-teal-300 line-through opacity-70'
                        : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{step}</span>
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-teal-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
