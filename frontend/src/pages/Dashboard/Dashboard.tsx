import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLatestAnalysisApi, getHistoricalProgressApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import skincareModelHero from '../../assets/skincare_model_hero.jpg';
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
  Quote,
  X,
  Loader2,
  Leaf,
  Droplets,
  Sun,
  FlaskConical,
} from 'lucide-react';

// ─── Gemini product recommendation hook ───────────────────────────────────────
// Keyed ONLY on skinType → stable across multiple scans of same skin type
interface GeminiProduct {
  name: string;
  reason: string;
  type: 'cleanser' | 'moisturiser' | 'sunscreen' | 'serum' | 'treatment' | 'other';
}

const GEMINI_CACHE_KEY = 'dermasense_gemini_products_v2';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

async function fetchGeminiProducts(skinType: string): Promise<GeminiProduct[]> {
  if (!GEMINI_API_KEY) return [];

  const prompt = `You are a dermatology product expert for India.
Give a short list of exactly 5 real, commonly available skincare products in India suited for ${skinType} skin.
For each product:
- name: the real product name (brand + product)
- reason: one short sentence (max 12 words) why it suits ${skinType} skin
- type: one of: cleanser, moisturiser, sunscreen, serum, treatment

Respond ONLY with a valid JSON array, no markdown, no extra text. Example:
[{"name":"Cetaphil Gentle Skin Cleanser","reason":"Mild surfactants keep combination skin balanced.","type":"cleanser"}]`;

  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    }),
  });

  if (!res.ok) return [];
  const json = await res.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  // strip possible ```json fences
  const clean = raw.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed.slice(0, 5) as GeminiProduct[];
  } catch {}
  return [];
}

function useGeminiProducts(skinType: string) {
  const [products, setProducts] = useState<GeminiProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    // Check localStorage cache (keyed by skinType)
    try {
      const raw = localStorage.getItem(GEMINI_CACHE_KEY);
      if (raw) {
        const cache = JSON.parse(raw);
        if (cache.skinType === skinType && Array.isArray(cache.products) && cache.products.length > 0) {
          setProducts(cache.products);
          return;
        }
      }
    } catch {}

    if (!GEMINI_API_KEY) {
      // Graceful offline fallback — real Indian products per skin type
      const fallbacks: Record<string, GeminiProduct[]> = {
        oily: [
          { name: 'Minimalist 2% Salicylic Acid Cleanser', reason: 'Unclogs pores and reduces excess sebum production.', type: 'cleanser' },
          { name: 'Neutrogena Oil-Free Moisture', reason: 'Lightweight hydration without adding shine.', type: 'moisturiser' },
          { name: 'Re\'equil Oxybenzone & OMC-free Sunscreen SPF 50', reason: 'Non-greasy broad-spectrum UV protection.', type: 'sunscreen' },
          { name: 'Minimalist Niacinamide 10% + Zinc 1%', reason: 'Controls sebum, reduces pores and blemishes.', type: 'serum' },
          { name: 'Dot & Key Waterlight Gel Moisturiser', reason: 'Ultra-light gel soothes oily T-zone flare.', type: 'moisturiser' },
        ],
        dry: [
          { name: 'CeraVe Hydrating Cleanser', reason: 'Ceramides restore skin barrier without stripping moisture.', type: 'cleanser' },
          { name: 'Cetaphil Moisturizing Cream', reason: 'Intense 24hr hydration for dry and sensitive skin.', type: 'moisturiser' },
          { name: 'Lotus Safe Sun UV Screen SPF 50', reason: 'Moisturising sunscreen suited for dry Indian skin.', type: 'sunscreen' },
          { name: 'The Ordinary Hyaluronic Acid 2% + B5', reason: 'Deep moisture retention for dry, flaky skin.', type: 'serum' },
          { name: 'Plum Grape Seed & Sea Buckthorn Glow Restore Oil', reason: 'Nourishing facial oil for severely dry skin.', type: 'treatment' },
        ],
        combination: [
          { name: 'Cetaphil Gentle Skin Cleanser', reason: 'Balances oily T-zone while preserving dry cheek areas.', type: 'cleanser' },
          { name: 'Minimalist Polyglutamic Acid 2% Moisturiser', reason: 'Hydrates without greasiness for combination skin.', type: 'moisturiser' },
          { name: 'Bioderma Photoderm MAX SPF 100', reason: 'High protection for Indian sun without whitecast.', type: 'sunscreen' },
          { name: 'Minimalist Alpha Arbutin 2% + HA', reason: 'Evens skin tone across dry and oily zones.', type: 'serum' },
          { name: 'Plum Green Tea Pore Cleansing Face Wash', reason: 'Controls shine on T-zone, gentle on dry cheeks.', type: 'cleanser' },
        ],
        neutral: [
          { name: 'Simple Kind to Skin Moisturising Face Wash', reason: 'No harsh chemicals for balanced normal skin.', type: 'cleanser' },
          { name: 'Pond\'s Bright Beauty SPF 30 Moisturiser', reason: 'Daily SPF + hydration in one step.', type: 'moisturiser' },
          { name: 'Lakme Sun Expert SPF 50 PA+++ Tinted Sunscreen', reason: 'Lightweight Indian-market sunscreen with natural finish.', type: 'sunscreen' },
          { name: 'Minimalist Vitamin C 10% Serum', reason: 'Brightens and antioxidant protection for healthy skin.', type: 'serum' },
          { name: 'Kaya Skin Clinic Brightening Serum', reason: 'Clinically developed for Indian skin tone uniformity.', type: 'treatment' },
        ],
      };
      const list = fallbacks[skinType] ?? fallbacks['combination'];
      setProducts(list);
      localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({ skinType, products: list }));
      return;
    }

    setLoading(true);
    try {
      const list = await fetchGeminiProducts(skinType);
      if (list.length > 0) {
        setProducts(list);
        localStorage.setItem(GEMINI_CACHE_KEY, JSON.stringify({ skinType, products: list }));
      }
    } catch {}
    setLoading(false);
  }, [skinType]);

  useEffect(() => { load(); }, [load]);
  return { products, loading };
}

// ─── Icon helper for product type ────────────────────────────────────────────
const productTypeConfig = {
  cleanser:    { label: 'Cleanser',    color: 'text-sky-600    bg-sky-50    dark:bg-sky-950/40    border-sky-200   dark:border-sky-800',    Icon: Droplets },
  moisturiser: { label: 'Moisturiser', color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', Icon: Leaf },
  sunscreen:   { label: 'Sunscreen',   color: 'text-amber-700  bg-amber-50  dark:bg-amber-950/40  border-amber-200  dark:border-amber-800',  Icon: Sun },
  serum:       { label: 'Serum',       color: 'text-violet-700 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800', Icon: FlaskConical },
  treatment:   { label: 'Treatment',   color: 'text-rose-700   bg-rose-50   dark:bg-rose-950/40   border-rose-200   dark:border-rose-800',   Icon: Wand2 },
  other:       { label: 'Product',     color: 'text-[#3B5249]  bg-[#E8ECE9] dark:bg-[#252D28]     border-[#3B5249]/20',                        Icon: Sparkles },
} as const;

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
  // Routine check items — all start unticked
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
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

  // ⚠️ Must be called here — before any early returns — to satisfy React's Rules of Hooks.
  // Uses skinType from data if available, empty string otherwise (hook safely no-ops until type is known).
  const { products: geminiProducts, loading: geminiLoading } = useGeminiProducts(
    data?.analysis?.skinType ?? ''
  );

  const displayName = user?.name || '';

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

  // scoreDelta
  let scoreDelta = 5;
  if (history && history.length > 1) {
    scoreDelta = skinScore - history[0].skinScore;
  }

  // Build routine list from real AI recommendation data — no mock steps
  const parseStep = (raw: string | { step?: string; product?: string }) =>
    typeof raw === 'string'
      ? { step: raw.split(':')[0].trim(), product: raw.split(': ').slice(1).join(': ').trim() || raw.trim() }
      : { step: (raw as any).step ?? '', product: (raw as any).product ?? String(raw) };

  const amSteps = (recommendation.routine?.morning ?? []).map((raw, i) => {
    const { step, product } = parseStep(raw as any);
    return {
      id: `am-${i}`,
      title: product || step,
      badge: `AM Step ${i + 1}`,
      badgeColor: 'bg-amber-100 text-amber-800',
      desc: step && product ? `${step} — apply as part of your morning routine.` : 'Apply as part of your morning routine.',
      time: `${8 + Math.floor(i * 0.083 * 60 / 60)}:${String((i * 5) % 60).padStart(2, '0')} AM`,
      category: 'face' as const,
    };
  });

  const pmSteps = (recommendation.routine?.night ?? []).map((raw, i) => {
    const { step, product } = parseStep(raw as any);
    return {
      id: `pm-${i}`,
      title: product || step,
      badge: `PM Step ${i + 1}`,
      badgeColor: 'bg-indigo-100 text-indigo-800',
      desc: step && product ? `${step} — apply as part of your evening routine.` : 'Apply as part of your evening routine.',
      time: `${9 + Math.floor(i * 0.25)}:${String((i * 15) % 60).padStart(2, '0')} PM`,
      category: 'face' as const,
    };
  });

  const defaultRoutineList = [...amSteps, ...pmSteps];

  // Dynamic filter — all items are 'face' category from AI data
  const filteredSteps = defaultRoutineList.filter(
    (item) => routineCategory === 'all' || item.category === routineCategory
  );

  const completedCount = defaultRoutineList.filter((item) => completedSteps[item.id]).length;
  const progressPercent = defaultRoutineList.length > 0
    ? Math.round((completedCount / defaultRoutineList.length) * 100)
    : 0;

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

        {/* Skin Metrics Detail Card */}
        <div className="lg:col-span-7 bg-white dark:bg-[#1D221E] rounded-3xl p-6 border border-black/5 dark:border-white/5 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-[#3B5249] dark:text-emerald-400" />
              <h3 className="font-serif text-xl text-[#1A1D1A] dark:text-[#EFEFEA]">
                Skin Condition Breakdown
              </h3>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-[#E8ECE9] dark:bg-[#252D28] text-[#3B5249] dark:text-emerald-400 font-medium capitalize">
              {skinType} Skin
            </span>
          </div>

          {/* 2×2 Subscore metric grid */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            {[
              {
                label: 'Acne Index',
                value: subscores?.acne ?? 70,
                display: subscores?.acne ?? 70,
                barColor: 'bg-rose-400',
                textColor: 'text-rose-500',
                bgColor: 'bg-rose-50 dark:bg-rose-950/30',
                status: (subscores?.acne ?? 70) > 70 ? 'Good' : (subscores?.acne ?? 70) > 40 ? 'Mild' : 'High',
              },
              {
                label: 'Skin Texture',
                value: subscores?.texture ?? 75,
                display: subscores?.texture ?? 75,
                barColor: 'bg-amber-400',
                textColor: 'text-amber-600',
                bgColor: 'bg-amber-50 dark:bg-amber-950/30',
                status: (subscores?.texture ?? 75) > 70 ? 'Smooth' : (subscores?.texture ?? 75) > 40 ? 'Moderate' : 'Rough',
              },
              {
                label: 'Moisture',
                value: subscores?.oilBalance ?? 80,
                display: subscores?.oilBalance ?? 80,
                barColor: 'bg-emerald-500',
                textColor: 'text-emerald-600',
                bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
                status: (subscores?.oilBalance ?? 80) > 70 ? 'Optimal' : (subscores?.oilBalance ?? 80) > 45 ? 'Fair' : 'Low',
              },
              {
                label: 'Pigmentation',
                value: subscores?.pigmentation ?? 78,
                display: subscores?.pigmentation ?? 78,
                barColor: 'bg-violet-500',
                textColor: 'text-violet-600',
                bgColor: 'bg-violet-50 dark:bg-violet-950/30',
                status: (subscores?.pigmentation ?? 78) > 70 ? 'Even' : (subscores?.pigmentation ?? 78) > 45 ? 'Uneven' : 'Dark Spots',
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className={`${metric.bgColor} rounded-2xl p-4 border border-black/5 dark:border-white/5 space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1A1D1A] dark:text-[#EFEFEA]">{metric.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 ${metric.textColor}`}>
                    {metric.status}
                  </span>
                </div>
                {/* Radial gauge */}
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path strokeWidth="4" stroke="currentColor" fill="none"
                        className="text-black/8 dark:text-white/10"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path
                        strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none"
                        className={metric.textColor}
                        strokeDasharray={`${metric.value}, 100`}
                        style={{ transition: 'stroke-dasharray 1s ease-out' }}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-[9px] font-bold ${metric.textColor}`}>{metric.display}%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="w-full h-1.5 bg-black/8 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${metric.barColor} rounded-full transition-all duration-1000`}
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#717771] dark:text-[#8E9991]">{metric.value}% scored</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* AI insight strip */}
          <div className="mt-4 p-3.5 rounded-2xl bg-[#E8ECE9]/70 dark:bg-[#252D28] border border-[#3B5249]/20 flex items-start gap-3">
            <div className="p-1.5 bg-[#3B5249] text-white rounded-xl mt-0.5 shrink-0">
              <Wand2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h5 className="text-xs font-semibold text-[#1A1D1A] dark:text-[#EFEFEA]">AI Skin Insight</h5>
              <p className="text-[11px] text-[#717771] dark:text-[#8E9991] leading-snug mt-0.5">
                {recommendation.insights?.[0] || recommendation.explanation || 'Maintain your barrier with consistent hydration and SPF daily.'}
              </p>
            </div>
          </div>

          {/* Concern zones pill */}
          {(poresDetected?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-xs text-[#717771] dark:text-[#8E9991]">
                {poresDetected!.length} concern {poresDetected!.length === 1 ? 'zone' : 'zones'} detected · scan-verified
              </span>
            </div>
          )}
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

        {/* Right Column (5 cols): Gemini AI Product Recommendations */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-8 border border-black/5 dark:border-white/5 shadow-soft h-full flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#3B5249] dark:text-emerald-400 font-bold block">
                  Matched For Your Profile
                </span>
                <h3 className="font-serif text-2xl text-[#1A1D1A] dark:text-[#EFEFEA] mt-0.5">
                  Recommended Products
                </h3>
                <p className="text-[11px] text-[#717771] dark:text-[#8E9991] mt-1">
                  Curated by Gemini AI for <span className="capitalize font-semibold text-[#3B5249] dark:text-emerald-400">{skinType}</span> skin in India
                </p>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-[#E8ECE9] dark:bg-[#252D28] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-[#3B5249] dark:text-emerald-400" />
              </div>
            </div>

            {/* Product list */}
            <div className="flex-1 space-y-3">
              {geminiLoading && (
                <div className="flex items-center gap-2 py-6 justify-center text-[#717771]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Getting recommendations from Gemini…</span>
                </div>
              )}

              {!geminiLoading && geminiProducts.map((product, idx) => {
                const cfg = productTypeConfig[product.type] ?? productTypeConfig.other;
                const { Icon } = cfg;
                return (
                  <div
                    key={idx}
                    className="group flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#F7F7F4] dark:bg-[#181D19] border border-black/5 dark:border-white/5 hover:border-[#3B5249]/30 dark:hover:border-emerald-900/50 transition-all duration-200"
                  >
                    {/* Type icon */}
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${cfg.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-[#1A1D1A] dark:text-[#EFEFEA] leading-snug">
                          {product.name}
                        </h4>
                        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#717771] dark:text-[#8E9991] mt-0.5 leading-snug">
                        {product.reason}
                      </p>
                    </div>

                    {/* Rank badge */}
                    <span className="text-[10px] font-bold text-[#717771]/50 dark:text-white/20 shrink-0 mt-1">
                      #{idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer note */}
            <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#3B5249] dark:text-emerald-400 shrink-0" />
              <p className="text-[10px] text-[#717771] dark:text-[#8E9991] italic leading-snug">
                Recommendations are stable per skin type and sourced for the Indian market.
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

            {/* Visual Portrait & Overall Health Status — SVG score ring instead of stock photo */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-[#F7F7F4] dark:bg-[#181D19] border border-black/5 dark:border-white/10">
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-black/10 dark:text-white/10" strokeWidth="3" stroke="currentColor" fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-emerald-500 transition-all duration-1000"
                    strokeDasharray={`${skinScore}, 100`} strokeWidth="3" strokeLinecap="round"
                    stroke="currentColor" fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-serif text-xl font-bold text-[#1A1D1A] dark:text-[#EFEFEA]">{skinScore}%</span>
                  <span className="text-[9px] text-[#717771] font-medium">Score</span>
                </div>
              </div>

              <div className="space-y-1.5 text-center sm:text-left">
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
