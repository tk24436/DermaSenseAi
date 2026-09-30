import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLatestAnalysisApi, getHistoricalProgressApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import skincareModelHero from '../../assets/skincare_model_hero.jpg';
import skincareScanProfile from '../../assets/skincare_scan_profile.jpg';
import skincareProducts from '../../assets/skincare_products.jpg';
import {
  Sparkles,
  Camera,
  TrendingUp,
  Check,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Wand2,
  ScanLine,
  CheckCircle,
  Heart,
  Plus,
  Quote,
  X,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const { data: history } = useQuery({
    queryKey: ['progressHistory'],
    queryFn: getHistoricalProgressApi,
  });

  // Routine category filter: 'all' | 'face' | 'body' | 'lip' | 'eye'
  const [routineCategory, setRoutineCategory] = useState<'all' | 'face' | 'body' | 'lip' | 'eye'>('all');
  // Routine check items
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({
    'step-0': true,
    'step-1': true,
    'step-2': true,
  });
  // Favorite state for recommendation card
  const [isFavorite, setIsFavorite] = useState(false);
  // Full analysis modal state
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  // How it works state for zero-state
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const displayName = user?.name || 'Anne Miller';

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner label="Preparing your clinical skin dashboard..." size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <ErrorAlert message={(error as Error).message} onRetry={() => refetch()} />
      </div>
    );
  }

  // --- ZERO STATE SCREEN (NO SCANS YET) ---
  if (!data?.analysis || !data?.recommendation) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-12 py-10 lg:py-16 space-y-8 animate-fade-in">
        <div className="skincare-card p-8 lg:p-14 relative overflow-hidden bg-white dark:bg-[#1D221E] shadow-soft-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            {/* Visual Photography Left */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-soft">
                <img
                  src={skincareModelHero}
                  alt="DermaSense Radiance"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-white/90 dark:bg-black/60 backdrop-blur-md border border-white/40 flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-[#1A1D1A] dark:text-[#EFEFEA]">
                    Natural Glow Guide • AI Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Content Right */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <span className="text-xs uppercase tracking-widest font-semibold text-[#3B5249] dark:text-emerald-400 block">
                Your Skin Companion Starts Here
              </span>

              <h1 className="font-serif text-4xl lg:text-6xl text-[#1A1D1A] dark:text-[#EFEFEA] leading-[1.1]">
                Let's get to know <span className="italic font-light">your skin.</span>
              </h1>

              <p className="text-sm lg:text-base text-[#717771] dark:text-[#8E9991] leading-relaxed max-w-xl">
                Take your first skin scan and we'll create a personalized clinical skin profile, barrier resilience score, and step-by-step daily regimen tailored for you.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to="/upload"
                  className="px-8 py-3.5 rounded-2xl btn-sage shadow-soft flex items-center gap-2 text-sm font-semibold cursor-pointer active:scale-95 transition-transform"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start your skin scan</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowHowItWorks(!showHowItWorks)}
                  className="px-6 py-3.5 rounded-2xl bg-[#E8ECE9] dark:bg-[#252D28] text-[#1A1D1A] dark:text-[#EFEFEA] text-sm font-semibold hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  {showHowItWorks ? 'Hide preview' : 'How it works'}
                </button>
              </div>
            </div>
          </div>

          {/* How It Works Drawer */}
          {showHowItWorks && (
            <div className="mt-12 pt-8 border-t border-black/5 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
              <div className="p-5 rounded-2xl bg-[#F7F7F4] dark:bg-[#181D19] space-y-2 border border-black/5">
                <span className="w-7 h-7 rounded-xl bg-[#3B5249] text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h4 className="text-sm font-bold text-[#1A1D1A] dark:text-[#EFEFEA]">Facial Scan</h4>
                <p className="text-xs text-[#717771] leading-relaxed">
                  Use your camera in natural daylight to capture bare skin texture.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#F7F7F4] dark:bg-[#181D19] space-y-2 border border-black/5">
                <span className="w-7 h-7 rounded-xl bg-[#3B5249] text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h4 className="text-sm font-bold text-[#1A1D1A] dark:text-[#EFEFEA]">AI Dermis Analysis</h4>
                <p className="text-xs text-[#717771] leading-relaxed">
                  Evaluates barrier resilience, pore concentration, and hydration balance.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#F7F7F4] dark:bg-[#181D19] space-y-2 border border-black/5">
                <span className="w-7 h-7 rounded-xl bg-[#3B5249] text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h4 className="text-sm font-bold text-[#1A1D1A] dark:text-[#EFEFEA]">Custom Regimen</h4>
                <p className="text-xs text-[#717771] leading-relaxed">
                  Generates daily morning and evening steps without incompatible bio-actives.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const { analysis, recommendation } = data;
  const { skinScore, subscores, skinType, poresDetected } = analysis;

  // Calculate score delta
  let scoreDelta = 5;
  if (history && history.length > 1) {
    scoreDelta = skinScore - history[0].skinScore;
  }

  // Routine steps list
  const defaultRoutineList = [
    {
      id: 'step-0',
      title: 'Hydrating Gentle Cleanser',
      badge: 'AM Step 1',
      badgeColor: 'bg-amber-100 text-amber-800',
      desc: 'Cleanse with lukewarm water for 60 seconds.',
      time: '08:00 AM',
      category: 'face',
    },
    {
      id: 'step-1',
      title: 'Hyaluronic Acid Serum',
      badge: 'AM Step 2',
      badgeColor: 'bg-amber-100 text-amber-800',
      desc: 'Apply 3-4 drops on damp skin to boost moisture.',
      time: '08:05 AM',
      category: 'face',
    },
    {
      id: 'step-2',
      title: 'Daily Barrier Cream SPF 50+',
      badge: 'AM Step 3',
      badgeColor: 'bg-amber-100 text-amber-800',
      desc: 'Broad spectrum protection against UV photo-damage.',
      time: '08:10 AM',
      category: 'face',
    },
    {
      id: 'step-3',
      title: 'Peptide Eye Contour Cream',
      badge: 'PM Step 1',
      badgeColor: 'bg-indigo-100 text-indigo-800',
      desc: 'Gentle tap around orbital bone to reduce dark circles.',
      time: '09:00 PM',
      category: 'eye',
    },
    {
      id: 'step-4',
      title: 'Rich Ceramide Repair Night Mask',
      badge: 'PM Step 2',
      badgeColor: 'bg-indigo-100 text-indigo-800',
      desc: 'Overnight barrier nourishment for dry cheek zones.',
      time: '09:15 PM',
      category: 'face',
    },
  ];

  // Dynamic filter
  const filteredSteps = defaultRoutineList.filter(
    (item) => routineCategory === 'all' || item.category === routineCategory
  );

  const completedCount = defaultRoutineList.filter((item) => completedSteps[item.id]).length;
  const progressPercent = Math.round((completedCount / defaultRoutineList.length) * 100);

  return (
    <div className="tab-content space-y-8 animate-fade-in max-w-7xl mx-auto px-4 lg:px-12 py-6 lg:py-8">
      {/* 1. Greeting Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#3B5249] dark:text-emerald-400 block">
            Your Daily Companion
          </span>
          <h1 className="font-serif text-4xl lg:text-5xl text-[#1A1D1A] dark:text-[#EFEFEA] mt-1">
            Hello <span className="italic font-light">{displayName}</span>
          </h1>
          <p className="text-[#717771] dark:text-[#8E9991] text-sm mt-1">
            Your skin vitality is showing positive trajectory today ({scoreDelta >= 0 ? `+${scoreDelta}%` : `${scoreDelta}%`} barrier resilience).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#1D221E]/70 border border-black/5 dark:border-white/10 backdrop-blur-sm text-xs font-medium text-[#717771] flex items-center gap-2 shadow-soft">
            <Calendar className="w-4 h-4 text-[#3B5249] dark:text-emerald-400" />
            <span>03 Sep 2026 • Today</span>
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="px-5 py-2.5 rounded-2xl btn-sage text-xs font-semibold shadow-soft transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>New AI Scan</span>
          </button>
        </div>
      </div>

      {/* 2. Top Health & AI Overview Row Grid (12 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Health Report Metric Card (Dark Luxury Hero Pill Style) */}
        <div className="lg:col-span-5 bg-[#1A1D1A] text-white rounded-3xl p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden shadow-soft-lg group">
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-emerald-900/30 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Health Report
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/80 border border-white/10">
                Last Scan: 2 days ago
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 my-2">
              <div>
                <h3 className="text-xs uppercase text-white/60 font-medium">Overall Skin Health</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-serif text-5xl lg:text-6xl tracking-tight text-white">
                    {skinScore}%
                  </span>
                  <span className="text-xs text-emerald-400 font-medium flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +5%
                  </span>
                </div>
                <p className="text-xs text-white/70 mt-2 max-w-[200px] leading-relaxed">
                  Optimal barrier condition detected. Balanced moisture with mild cheek dryness.
                </p>
              </div>

              {/* Circular Radial Gauge Indicator */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-400 transition-all duration-1000 ease-out"
                    strokeDasharray={`${skinScore}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-300" />
                  <span className="text-[10px] text-white/80 mt-1 font-medium">Good</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex items-center justify-between gap-2 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs text-white/80">Skin Barrier Stable</span>
            </div>
            <button
              onClick={() => setShowAnalysisModal(true)}
              className="text-xs text-emerald-300 hover:text-white flex items-center gap-1 transition-colors font-medium cursor-pointer"
            >
              <span>Full Analysis</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Mesh Scanner Visual Preview Card */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1D221E] rounded-3xl p-6 border border-black/5 dark:border-white/5 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-[#3B5249] dark:text-emerald-400" />
              <h3 className="font-serif text-xl text-[#1A1D1A] dark:text-[#EFEFEA]">
                AI Facial Diagnostics Overlay
              </h3>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-[#E8ECE9] dark:bg-[#252D28] text-[#3B5249] dark:text-emerald-400 font-medium capitalize">
              {skinType} Skin Profile
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            {/* AI Scan Portrait Overlay */}
            <div className="sm:col-span-6 relative rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-square bg-slate-100 dark:bg-slate-900 border border-black/5 shadow-inner group">
              <img
                src={skincareScanProfile}
                alt="AI Scan Facial Target"
                className="w-full h-full object-cover"
              />

              {/* AI Mesh Overlay Graphic */}
              <div className="absolute inset-0 scannable-mesh opacity-60 pointer-events-none" />

              {/* Sweeping Laser Scan Effect */}
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent scan-line shadow-[0_0_15px_#34d399] pointer-events-none" />

              {/* AI Bounding Spot Indicators */}
              <div className="absolute top-[35%] left-[42%] w-4 h-4 border-2 border-emerald-400 rounded-full animate-ping pointer-events-none" />
              <div className="absolute top-[35%] left-[42%] w-4 h-4 border border-emerald-300 rounded-full bg-emerald-400/20 pointer-events-none" />
              <div className="absolute bottom-[30%] left-[55%] w-3 h-3 border border-amber-400 rounded-full bg-amber-400/20 pointer-events-none" />

              {/* Floating Metric Tag */}
              <div className="absolute bottom-3 left-3 bg-[#1A1D1A]/80 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span>{poresDetected?.length || 3} Concern Zones</span>
              </div>
            </div>

            {/* Core Metrics Diagnostics Slider Bars */}
            <div className="sm:col-span-6 space-y-4">
              {/* Metric 1 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#1A1D1A] dark:text-[#EFEFEA] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400" /> Acne Risk Index
                  </span>
                  <span className="font-bold text-[#1A1D1A] dark:text-[#EFEFEA]">
                    {100 - (subscores?.acne ?? 70)}%{' '}
                    <span className="text-[10px] text-[#717771] font-normal">(Mild)</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#F7F7F4] dark:bg-[#181D19] rounded-full overflow-hidden p-0.5 border border-black/5 dark:border-white/10">
                  <div
                    className="h-full bg-rose-400 rounded-full transition-all duration-1000"
                    style={{ width: `${100 - (subscores?.acne ?? 70)}%` }}
                  />
                </div>
              </div>

              {/* Metric 2 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#1A1D1A] dark:text-[#EFEFEA] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Dryness / Texture
                  </span>
                  <span className="font-bold text-[#1A1D1A] dark:text-[#EFEFEA]">
                    {100 - (subscores?.texture ?? 75)}%{' '}
                    <span className="text-[10px] text-amber-600 font-normal">(Elevated)</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#F7F7F4] dark:bg-[#181D19] rounded-full overflow-hidden p-0.5 border border-black/5 dark:border-white/10">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                    style={{ width: `${100 - (subscores?.texture ?? 75)}%` }}
                  />
                </div>
              </div>

              {/* Metric 3 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#1A1D1A] dark:text-[#EFEFEA] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Moisture Retention
                  </span>
                  <span className="font-bold text-[#1A1D1A] dark:text-[#EFEFEA]">
                    {subscores?.texture ?? 80}%{' '}
                    <span className="text-[10px] text-emerald-600 font-normal">(Optimal)</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#F7F7F4] dark:bg-[#181D19] rounded-full overflow-hidden p-0.5 border border-black/5 dark:border-white/10">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${subscores?.texture ?? 80}%` }}
                  />
                </div>
              </div>

              {/* AI Recommendation Banner */}
              <div className="p-3 rounded-2xl bg-[#E8ECE9]/70 dark:bg-[#252D28] border border-[#3B5249]/20 flex items-start gap-3 mt-2">
                <div className="p-1.5 bg-[#3B5249] text-white rounded-xl mt-0.5">
                  <Wand2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-[#1A1D1A] dark:text-[#EFEFEA]">AI Recommendation</h5>
                  <p className="text-[11px] text-[#717771] dark:text-[#8E9991] leading-snug">
                    Focus on Ceramide & Hyaluronic Serums to tackle lower cheek dryness.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Content: Routine Tracker & Recommended Products Grid (12 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Daily Skincare Routine Steps */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-8 border border-black/5 dark:border-white/5 shadow-soft space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/10">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#3B5249] dark:text-emerald-400 font-bold">
                Personalized Schedule
              </span>
              <h2 className="font-serif text-2xl text-[#1A1D1A] dark:text-[#EFEFEA]">
                Daily Skincare Routine
              </h2>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              {(['all', 'face', 'body', 'lip', 'eye'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setRoutineCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs capitalize transition-all cursor-pointer ${
                    routineCategory === cat
                      ? 'bg-[#1A1D1A] dark:bg-white text-white dark:text-[#1A1D1A] font-semibold'
                      : 'text-[#717771] hover:bg-[#F7F7F4] dark:hover:bg-[#181D19] font-medium'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Progress Bar for Steps completed */}
          <div className="bg-[#F7F7F4] dark:bg-[#181D19] p-4 rounded-2xl flex items-center justify-between gap-4 border border-black/5 dark:border-white/10">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-[#1A1D1A] dark:text-[#EFEFEA]">
                {completedCount} of {defaultRoutineList.length} Steps Completed Today
              </div>
              <div className="text-[11px] text-[#717771] dark:text-[#8E9991]">
                Morning sequence finished. Ready for evening treatment.
              </div>
            </div>
            <div className="w-24 h-2 bg-white dark:bg-black/40 rounded-full overflow-hidden border border-black/5">
              <div
                className="h-full bg-[#3B5249] dark:bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Routine Steps Checklist */}
          <div className="space-y-3">
            {filteredSteps.map((step) => {
              const isChecked = !!completedSteps[step.id];

              return (
                <div
                  key={step.id}
                  className="group p-4 rounded-2xl bg-[#F7F7F4]/60 dark:bg-[#181D19]/60 hover:bg-[#F7F7F4] dark:hover:bg-[#181D19] border border-black/5 dark:border-white/5 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <button
                      onClick={() => toggleStep(step.id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 active:scale-75 hover:scale-105 cursor-pointer ${
                        isChecked
                          ? 'border-[#3B5249] bg-[#3B5249] text-white shadow-xs'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1D221E] text-transparent hover:border-[#3B5249]'
                      }`}
                    >
                      <Check className={`w-4 h-4 stroke-[3] transition-transform duration-200 ${isChecked ? 'scale-100' : 'scale-50'}`} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-bold text-[#1A1D1A] dark:text-[#EFEFEA] transition-all ${
                            isChecked ? 'line-through text-[#717771]/70 dark:text-[#8E9991]/70' : ''
                          }`}
                        >
                          {step.title}
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${step.badgeColor}`}>
                          {step.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#717771] dark:text-[#8E9991] mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#717771]">{step.time}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (5 cols): AI Product Recommendations Card */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-8 border border-black/5 dark:border-white/5 shadow-soft flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs uppercase tracking-wider text-[#3B5249] dark:text-emerald-400 font-bold">
                    Matched For Your Profile
                  </span>
                  <h3 className="font-serif text-2xl text-[#1A1D1A] dark:text-[#EFEFEA]">
                    For You Recommendations
                  </h3>
                </div>
                <button
                  onClick={() => setShowAnalysisModal(true)}
                  className="text-xs text-[#3B5249] dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                >
                  See All
                </button>
              </div>

              {/* Featured Product Showcase Card */}
              <div className="bg-[#F7F7F4] dark:bg-[#181D19] rounded-2xl p-5 border border-black/5 dark:border-white/10 relative overflow-hidden space-y-4">
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="w-8 h-8 rounded-full bg-white dark:bg-[#1D221E] flex items-center justify-center text-gray-400 hover:text-rose-500 shadow-sm transition-colors cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {/* Product Visual */}
                  <div className="w-28 h-28 rounded-xl bg-white dark:bg-black/30 p-2 flex items-center justify-center border border-black/5 dark:border-white/10 shrink-0 shadow-inner">
                    <img
                      src={skincareProducts}
                      alt="Oriflame Love Nature Face Lotion"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#3B5249] dark:text-emerald-400">
                      AI Top Match • 98%
                    </span>
                    <h4 className="font-serif text-lg font-normal leading-tight text-[#1A1D1A] dark:text-[#EFEFEA]">
                      Oriflame Love Nature Face Lotion
                    </h4>
                    <p className="text-[11px] text-[#717771] dark:text-[#8E9991]">
                      Organic Tea Tree & Lime formula for barrier balance.
                    </p>

                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="font-bold text-[#1A1D1A] dark:text-[#EFEFEA] text-base">$389</span>
                      <span className="text-xs text-[#717771] line-through">$412</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                        Save $23
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => alert('Product added to your cart!')}
                    className="flex-1 py-2.5 rounded-xl btn-dark text-white text-xs font-semibold shadow-soft transition-all text-center cursor-pointer"
                  >
                    Buy Now
                  </button>
                  <button
                    onClick={() => alert('Step added to your daily routine schedule!')}
                    className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#1D221E] hover:bg-gray-50 border border-black/10 dark:border-white/10 text-[#1A1D1A] dark:text-[#EFEFEA] text-xs font-semibold shadow-sm cursor-pointer"
                  >
                    Add to Routine
                  </button>
                </div>
              </div>

              {/* Mini Recommendations Strip */}
              <div className="mt-4 space-y-2">
                <div className="p-3 rounded-xl bg-white dark:bg-[#181D19] border border-black/5 dark:border-white/10 flex items-center justify-between hover:border-[#3B5249]/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#F7F7F4] dark:bg-[#141714] p-1 border border-black/5 shrink-0 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-[#3B5249] dark:text-emerald-400" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-[#1A1D1A] dark:text-[#EFEFEA]">
                        Ceramide Hydrating Barrier Lotion
                      </h5>
                      <span className="text-[10px] text-[#717771] dark:text-[#8E9991]">
                        $24.00 • Moisture & Texture Support
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => alert('Added to routine!')}
                    className="p-2 rounded-lg bg-[#F7F7F4] dark:bg-[#1D221E] text-[#1A1D1A] dark:text-[#EFEFEA] hover:bg-[#3B5249] hover:text-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Skincare Philosophy Quote */}
            <div className="mt-6 p-4 rounded-2xl bg-[#E8ECE9]/60 dark:bg-[#252D28] border border-[#3B5249]/10 flex items-center gap-3">
              <Quote className="w-6 h-6 text-[#3B5249] dark:text-emerald-400 shrink-0" />
              <p className="text-xs italic text-[#1A1D1A] dark:text-[#EFEFEA] font-serif">
                "Consistency in barrier protection yields a 3x higher luminosity recovery rate."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Full Analysis Consultation Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in transition-all">
          <div className="skincare-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-10 relative space-y-6 bg-white dark:bg-[#1D221E] animate-scale-in shadow-soft-lg">
            <button
              onClick={() => setShowAnalysisModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-[#717771] transition-transform active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-[#3B5249] dark:text-emerald-400 font-bold">
                Clinical Diagnostics
              </span>
              <h2 className="font-serif text-3xl text-[#1A1D1A] dark:text-[#EFEFEA]">
                Comprehensive Skin Analysis
              </h2>
              <p className="text-xs text-[#717771]">
                Evaluated from your latest scan and localized pore distribution.
              </p>
            </div>

            {/* Visual Portrait & Overall Health Status */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-[#F7F7F4] dark:bg-[#181D19] border border-black/5 dark:border-white/10">
              <div className="relative w-28 h-36 rounded-2xl overflow-hidden shadow-soft shrink-0">
                <img
                  src={skincareScanProfile}
                  alt="Skin profile scan"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium backdrop-blur-xs">
                  Dermal Scan
                </span>
              </div>

              <div className="space-y-1.5 text-center sm:text-left">
                <span className="font-serif text-4xl font-semibold text-[#1A1D1A] dark:text-[#EFEFEA]">
                  {skinScore}%
                </span>
                <h4 className="text-sm font-bold text-[#1A1D1A] dark:text-[#EFEFEA]">
                  Skin Health Index
                </h4>
                <p className="text-xs text-[#717771] dark:text-[#8E9991] leading-relaxed">
                  {recommendation.explanation ||
                    'Optimal barrier condition detected. Balanced moisture with mild cheek dryness.'}
                </p>
              </div>
            </div>

            {/* Subscore Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#717771]">
                Dermis Characteristic Ratings
              </h3>

              <div className="space-y-2.5">
                {[
                  { label: 'Acne Risk Index', pct: 100 - (subscores?.acne ?? 70), status: 'Mild (30%)', color: 'bg-rose-400' },
                  { label: 'Dryness / Flakiness', pct: 100 - (subscores?.texture ?? 75), status: 'Elevated (65%)', color: 'bg-amber-400' },
                  { label: 'Moisture Retention', pct: subscores?.texture ?? 80, status: 'Optimal (80%)', color: 'bg-emerald-500' },
                  { label: 'Pigment Uniformity', pct: subscores?.pigmentation ?? 78, status: 'Good (78%)', color: 'bg-[#3B5249]' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-3.5 rounded-2xl bg-[#F7F7F4] dark:bg-[#181D19] space-y-1.5 border border-black/5 dark:border-white/5"
                  >
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[#1A1D1A] dark:text-[#EFEFEA]">{item.label}</span>
                      <span className="font-bold text-[#1A1D1A] dark:text-[#EFEFEA]">{item.status}</span>
                    </div>
                    <div className="w-full h-2 bg-white dark:bg-black/30 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-6 py-2.5 rounded-xl btn-dark text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
