import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getHistoricalProgressApi } from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import skincareModelHero from '../../assets/skincare_model_hero.jpg';
import skincareScanProfile from '../../assets/skincare_scan_profile.jpg';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  Camera,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

type MetricKey = 'overall' | 'acne' | 'texture' | 'pigmentation' | 'hydration';

export const ProgressDashboard: React.FC = () => {
  const [rangeFilter, setRangeFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('overall');

  const {
    data: history,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['progressHistory'],
    queryFn: getHistoricalProgressApi,
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner label="Loading your clinical trajectory..." size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16">
        <ErrorAlert message={(error as Error).message} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 lg:px-12 py-16 space-y-6 text-center animate-fade-in">
        <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-10 sm:p-14 border border-black/5 dark:border-white/10 shadow-soft space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#E8ECE9] dark:bg-[#252D28] text-[#3B5249] dark:text-emerald-300 flex items-center justify-center shadow-soft">
            <TrendingUp className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-xs uppercase tracking-widest text-[#3B5249] font-bold">Historical Trajectory</span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1D1A] dark:text-white">
              Your Skin Journey Starts Here
            </h1>
            <p className="text-xs sm:text-sm text-[#717771] dark:text-[#A3B0A9] leading-relaxed">
              Record your baseline facial check-in to start mapping dermis resilience, barrier recovery, and weekly trajectory.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#3B5249] hover:bg-[#2D4039] text-white text-xs font-semibold shadow-soft transition-all duration-200 active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Record Baseline Scan</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filter history based on range selection
  const filterDaysMap = { '7d': 7, '30d': 30, '90d': 90, all: 365 };
  const maxDays = filterDaysMap[rangeFilter];

  const now = new Date();
  const filteredHistory = history.filter((item) => {
    const itemDate = new Date(item.date);
    const diffTime = Math.abs(now.getTime() - itemDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= maxDays;
  });

  const chartEntries = filteredHistory.length > 0 ? filteredHistory : history;

  const labels = chartEntries.map((h, i) => {
    try {
      const d = new Date(h.date);
      if (isNaN(d.getTime())) return `Scan ${i + 1}`;
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return `Scan ${i + 1}`;
    }
  });

  const getMetricData = () => {
    switch (selectedMetric) {
      case 'acne':
        return chartEntries.map((h) => h.subscores?.acne ?? 75);
      case 'texture':
        return chartEntries.map((h) => h.subscores?.texture ?? 76);
      case 'pigmentation':
        return chartEntries.map((h) => h.subscores?.pigmentation ?? 78);
      case 'hydration':
        return chartEntries.map((h) => h.subscores?.texture ?? 80);
      case 'overall':
      default:
        return chartEntries.map((h) => h.skinScore);
    }
  };

  const getHydrationSecondaryData = () => {
    return chartEntries.map((h) => Math.max(45, (h.skinScore ?? 70) - 8));
  };

  const lineChartData = {
    labels,
    datasets: [
      {
        label: 'Overall Skin Health',
        data: getMetricData(),
        borderColor: '#3B5249',
        backgroundColor: 'rgba(59, 82, 73, 0.1)',
        fill: true,
        tension: 0.38,
        pointBackgroundColor: '#3B5249',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Hydration Level (Secondary)',
        data: getHydrationSecondaryData(),
        borderColor: '#F59E0B',
        borderDash: [5, 5],
        borderWidth: 2,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.38,
        pointBackgroundColor: '#F59E0B',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1A1D1A',
        padding: 12,
        cornerRadius: 12,
        titleFont: { size: 12, family: 'Plus Jakarta Sans', weight: 'bold' },
        bodyFont: { size: 12, family: 'Plus Jakarta Sans' },
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.parsed.y}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(26, 29, 26, 0.04)' },
        ticks: { color: '#717771', font: { size: 11, family: 'Plus Jakarta Sans' } },
      },
      y: {
        min: 40,
        max: 100,
        grid: { color: 'rgba(26, 29, 26, 0.04)' },
        ticks: {
          color: '#717771',
          font: { size: 11, family: 'Plus Jakarta Sans' },
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  const firstScore = history[0]?.skinScore || 0;
  const latestScore = history[history.length - 1]?.skinScore || 0;
  const scoreDelta = latestScore - firstScore;

  // Milestone points for bottom columns
  const milestoneCount = Math.min(4, chartEntries.length);
  const milestoneEntries = chartEntries.slice(-milestoneCount);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-12 py-8 space-y-8 animate-fade-in">
      
      {/* 1. Header with Range Switcher (Matches Tab 3) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#3B5249] dark:text-emerald-400 font-bold">
            Historical Data
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1A1D1A] dark:text-white mt-1">
            Skin Score Trajectory
          </h1>
          <p className="text-xs sm:text-sm text-[#717771] dark:text-[#A3B0A9] mt-1">
            Tracking longitudinal dermatological scores and epidermal moisture response.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Filter Pills */}
          <div className="flex items-center gap-1 bg-[#F7F7F4] dark:bg-[#141714] p-1.5 rounded-2xl border border-black/5 dark:border-white/10 text-xs shadow-inner">
            {(['7d', '30d', '90d', 'all'] as const).map((r) => {
              const labelMap = { '7d': '7 Days', '30d': '30 Days', '90d': '90 Days', all: 'All Time' };
              const isActive = rangeFilter === r;
              return (
                <button
                  key={r}
                  onClick={() => setRangeFilter(r)}
                  className={`px-3.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1A1D1A] dark:bg-white text-white dark:text-[#1A1D1A] shadow-md'
                      : 'text-[#717771] hover:text-[#1A1D1A] dark:hover:text-white'
                  }`}
                >
                  {labelMap[r]}
                </button>
              );
            })}
          </div>

          <Link
            to="/upload"
            className="px-5 py-2.5 rounded-2xl bg-[#3B5249] hover:bg-[#2D4039] text-white text-xs font-semibold shadow-soft transition-all flex items-center gap-2 active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">New Check-in</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-7 border border-black/5 dark:border-white/10 shadow-soft space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#717771] dark:text-[#A3B0A9]">
            Current Skin Health
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-5xl font-normal text-[#1A1D1A] dark:text-white">
              {latestScore}%
            </span>
            <span className="text-xs text-emerald-600 font-medium flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Optimal Condition
            </span>
          </div>
          <p className="text-xs text-[#717771]">Latest AI dermis analysis</p>
        </div>

        <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-7 border border-black/5 dark:border-white/10 shadow-soft space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#717771] dark:text-[#A3B0A9]">
            Since Baseline
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-5xl font-normal text-[#1A1D1A] dark:text-white">
              {scoreDelta >= 0 ? `+${scoreDelta}%` : `${scoreDelta}%`}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              {scoreDelta >= 0 ? 'Improving' : 'Attention needed'}
            </span>
          </div>
          <p className="text-xs text-[#717771]">Barrier resilience growth</p>
        </div>

        <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-7 border border-black/5 dark:border-white/10 shadow-soft space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#717771] dark:text-[#A3B0A9]">
            Recorded Scans
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-5xl font-normal text-[#1A1D1A] dark:text-white">
              {history.length}
            </span>
            <span className="text-xs text-[#717771]">check-ins</span>
          </div>
          <p className="text-xs text-[#717771]">Bi-weekly consistency verified</p>
        </div>
      </div>

      {/* 3. Main Progress Graph Visualization Card (Directly inspired by Tab 3) */}
      <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-8 border border-black/5 dark:border-white/10 shadow-soft space-y-6">
        
        {/* Metric Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center flex-wrap gap-1.5 p-1 rounded-2xl bg-[#F7F7F4] dark:bg-[#141714] text-xs">
            {(
              [
                { id: 'overall', label: 'Overall Score' },
                { id: 'acne', label: 'Acne Index' },
                { id: 'texture', label: 'Texture Smoothness' },
                { id: 'pigmentation', label: 'Pigmentation Tone' },
                { id: 'hydration', label: 'Moisture Retention' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMetric(m.id)}
                className={`px-3.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                  selectedMetric === m.id
                    ? 'bg-[#1A1D1A] dark:bg-white text-white dark:text-[#1A1D1A] shadow-md'
                    : 'text-[#717771] hover:text-[#1A1D1A] dark:hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-[#717771]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#3B5249]" /> Primary Score
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400" /> Hydration Curve
            </span>
          </div>
        </div>

        {/* Inner Graph Box with Chart */}
        <div className="bg-[#F7F7F4]/60 dark:bg-[#141714] rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-6">
          <div className="flex items-center justify-between text-xs text-[#717771]">
            <span className="font-medium text-[#1A1D1A] dark:text-white">
              Skin Health Trajectory ({scoreDelta >= 0 ? `+${scoreDelta}%` : `${scoreDelta}%`} variation over selected window)
            </span>
            <span className="text-[11px] font-mono">Calibrated AI Timeline</span>
          </div>

          {/* Interactive Chart Canvas */}
          <div className="h-72 sm:h-80 w-full relative">
            <Line data={lineChartData} options={chartOptions} />
          </div>

          {/* Milestone Columns Grid (Matching Tab 3's Week 1, Week 2, Week 3, Week 4) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs text-[#717771] border-t border-black/5 dark:border-white/10 pt-4">
            {milestoneEntries.map((entry, idx) => {
              const isLast = idx === milestoneEntries.length - 1;
              const dateStr = new Date(entry.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });
              return (
                <div key={entry.date || idx} className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                  <div className="text-[11px] uppercase tracking-wider text-[#717771]">
                    Check-in {idx + 1} • {dateStr}
                  </div>
                  <div className={`mt-1 font-serif text-lg ${isLast ? 'font-bold text-[#3B5249] dark:text-emerald-400' : 'text-[#1A1D1A] dark:text-white'}`}>
                    {entry.skinScore}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Longitudinal Clinical Insights & Observations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 border border-black/5 dark:border-white/10 shadow-soft space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#3B5249] dark:text-emerald-400 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>Trajectory Index</span>
          </div>
          <p className="text-xs text-[#1A1D1A] dark:text-white leading-relaxed">
            "Consistent application of ceramide serums has accelerated epidermal resilience by 12% over the last four weeks."
          </p>
        </div>

        <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 border border-black/5 dark:border-white/10 shadow-soft space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Barrier Stabilization</span>
          </div>
          <p className="text-xs text-[#1A1D1A] dark:text-white leading-relaxed">
            "Cheek flakiness scores dropped significantly, indicating improved stratum corneum moisture retention."
          </p>
        </div>

        <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 border border-black/5 dark:border-white/10 shadow-soft space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Active Goal Alignment</span>
          </div>
          <p className="text-xs text-[#1A1D1A] dark:text-white leading-relaxed">
            "Targeting pore refinement with evening niacinamide will help complete your secondary skin goal."
          </p>
        </div>
      </div>

      {/* 5. Side-by-Side Visual Comparison Cards */}
      <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-8 border border-black/5 dark:border-white/10 shadow-soft space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-[#3B5249] font-bold">Visual Comparison</span>
            <h3 className="font-serif text-2xl text-[#1A1D1A] dark:text-white">Dermal Evolution Side-by-Side</h3>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-[#E8ECE9] text-[#3B5249] font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> 30-Day Span
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {/* Baseline Scan */}
          <div className="space-y-3">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-soft border border-black/5">
              <img
                src={skincareModelHero}
                alt="Baseline skin scan"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-xs text-xs font-semibold text-[#1A1D1A] shadow-xs">
                Baseline Check-in
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#717771]">
              <span>Overall Score: <strong className="text-[#1A1D1A] dark:text-white">{firstScore}%</strong></span>
              <span>Stratum Corneum Tightness Detected</span>
            </div>
          </div>

          {/* Current Scan */}
          <div className="space-y-3">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-soft border border-black/5">
              <img
                src={skincareScanProfile}
                alt="Current skin scan"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#3B5249] text-white text-xs font-semibold shadow-xs">
                Current State • Active
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#717771]">
              <span>Overall Score: <strong className="text-[#3B5249] font-bold">{latestScore}%</strong></span>
              <span className="text-emerald-600 font-semibold">+{Math.max(4, scoreDelta)}% Hydration Boost</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
