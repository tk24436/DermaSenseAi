import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHistoricalProgressApi } from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { TrendingUp, Calendar, Award, ShieldCheck, Sparkles } from 'lucide-react';

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const ProgressDashboard: React.FC = () => {
  const [rangeFilter, setRangeFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

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

  if (isLoading) return <LoadingSpinner label="Loading skin progress trends..." size="lg" />;
  if (isError) return <ErrorAlert message={(error as Error).message} onRetry={() => refetch()} />;

  if (!history || history.length === 0) return null;

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

  const labels = filteredHistory.map((h) => h.date);
  const skinScores = filteredHistory.map((h) => h.skinScore);
  const acneScores = filteredHistory.map((h) => h.subscores.acne);
  const textureScores = filteredHistory.map((h) => h.subscores.texture);

  // Line Chart Data
  const lineChartData = {
    labels,
    datasets: [
      {
        label: 'Overall Skin Score',
        data: skinScores,
        borderColor: '#14b8a6',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(20, 184, 166, 0.4)');
          gradient.addColorStop(1, 'rgba(20, 184, 166, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#14b8a6',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Acne Control',
        data: acneScores,
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'Texture Score',
        data: textureScores,
        borderColor: '#6366f1',
        backgroundColor: 'transparent',
        borderDash: [3, 3],
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  // Bar Chart Data
  const barChartData = {
    labels,
    datasets: [
      {
        label: 'Overall Skin Score',
        data: skinScores,
        backgroundColor: 'rgba(20, 184, 166, 0.8)',
        borderRadius: 8,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 12, weight: '600' },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        padding: 12,
        boxPadding: 6,
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y: {
        min: 50,
        max: 100,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
    },
  };

  // Progress summary calculation
  const firstScore = skinScores[0] || 0;
  const latestScore = skinScores[skinScores.length - 1] || 0;
  const scoreDelta = latestScore - firstScore;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Skin Health Tracking</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Historical Progress Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track your skinScore trajectory over time and evaluate routine effectiveness.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto">
          {(['7d', '30d', '90d', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRangeFilter(r)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase transition-all cursor-pointer ${
                rangeFilter === r
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r === 'all' ? 'All Time' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Overall Improvement</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white flex items-center gap-2">
            <span>{scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} pts</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                scoreDelta >= 0
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
              }`}
            >
              {scoreDelta >= 0 ? 'Upward Trend' : 'Needs Adjustment'}
            </span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Current Skin Score</span>
            <ShieldCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold text-teal-400">{latestScore}/100</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total AI Check-ins</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{filteredHistory.length} Scans</div>
        </div>
      </div>

      {/* Chart Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <h3 className="text-base font-bold text-white">skinScore Trajectory</h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                chartType === 'line' ? 'bg-slate-800 text-teal-400' : 'text-slate-400'
              }`}
            >
              Line Chart
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                chartType === 'bar' ? 'bg-slate-800 text-teal-400' : 'text-slate-400'
              }`}
            >
              Bar Chart
            </button>
          </div>
        </div>

        <div className="h-80 sm:h-96 w-full pt-4">
          {chartType === 'line' ? (
            <Line data={lineChartData} options={chartOptions} />
          ) : (
            <Bar data={barChartData} options={chartOptions} />
          )}
        </div>
      </div>
    </div>
  );
};
