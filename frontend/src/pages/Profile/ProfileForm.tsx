import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserProfileApi, updateUserProfileApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile, SkinType, SensitivityLevel } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import {
  Save,
  CheckCircle2,
  Plus,
  X,
  Check,
  Sparkles,
} from 'lucide-react';

const SKIN_TYPES: { id: SkinType; label: string; desc: string }[] = [
  { id: 'combination', label: 'Combination', desc: 'Oily T-zone with balanced or dry cheeks' },
  { id: 'dry', label: 'Dry', desc: 'Feels tight, prone to flakiness, craves rich moisture' },
  { id: 'oily', label: 'Oily', desc: 'Excess sebum, shine across forehead & nose' },
  { id: 'neutral', label: 'Normal', desc: 'Balanced hydration with minimal sensitivity' },
];

const SENSITIVITY_LEVELS: { id: SensitivityLevel; label: string; desc: string }[] = [
  { id: 'low', label: 'Low', desc: 'Rarely reacts to active ingredients or fragrance' },
  { id: 'medium', label: 'Moderate', desc: 'Occasional redness or mild tingling from strong acids' },
  { id: 'high', label: 'High', desc: 'Easily irritated; prefers soothing, barrier-first formulas' },
];

const AVAILABLE_GOALS = [
  'Reduce acne',
  'Improve texture',
  'Minimize pores',
  'Fade dark spots',
  'Hydration & barrier repair',
  'Oil balance',
  'Anti-aging / fine lines',
];

export const ProfileForm: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['userProfile'],
    queryFn: getUserProfileApi,
  });

  const [formState, setFormState] = useState<UserProfile>({
    skinType: 'combination',
    sensitivity: 'medium',
    allergies: [],
    goals: ['Reduce acne', 'Hydration & barrier repair'],
  });

  const [newAllergyInput, setNewAllergyInput] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormState(profile);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: updateUserProfileApi,
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(['userProfile'], updatedProfile);
      setSuccessMessage('Your clinical skin profile has been saved.');
      setTimeout(() => setSuccessMessage(null), 3500);
    },
  });

  const handleAddAllergy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllergyInput.trim()) return;
    if (!formState.allergies.includes(newAllergyInput.trim())) {
      setFormState({
        ...formState,
        allergies: [...formState.allergies, newAllergyInput.trim()],
      });
    }
    setNewAllergyInput('');
  };

  const handleRemoveAllergy = (allergy: string) => {
    setFormState({
      ...formState,
      allergies: formState.allergies.filter((a) => a !== allergy),
    });
  };

  const handleToggleGoal = (goal: string) => {
    const isSelected = formState.goals.includes(goal);
    const updatedGoals = isSelected
      ? formState.goals.filter((g) => g !== goal)
      : [...formState.goals, goal];

    setFormState({ ...formState, goals: updatedGoals });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formState);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner label="Loading your clinical profile..." size="lg" />
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

  const displayName = user?.name || 'Anne Miller';
  const displayEmail = user?.email || 'anne.miller@example.com';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      
      {/* 1. Header with Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-black/5 dark:border-white/10">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#3B5249] dark:text-emerald-400 font-bold">
            Personal Dermatology File
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1D1A] dark:text-white mt-0.5">
            Skin Profile & Characteristics
          </h1>
          <p className="text-xs sm:text-sm text-[#717771] dark:text-[#A3B0A9]">
            Parameters powering your real-time formulation and ingredient compatibility filters.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="px-7 py-3 rounded-2xl bg-[#3B5249] hover:bg-[#2D4039] text-white text-xs font-semibold shadow-soft flex items-center gap-2 self-start sm:self-auto disabled:opacity-50 transition-all cursor-pointer active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>{updateMutation.isPending ? 'Saving...' : 'Save Profile'}</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2.5 shadow-soft">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {updateMutation.isError && (
        <ErrorAlert message={(updateMutation.error as Error).message} />
      )}

      {/* 2. Avatar Card Banner (Directly matches Tab 4 from mockup) */}
      <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-8 border border-black/5 dark:border-white/10 shadow-soft space-y-6">
        <div className="flex items-center gap-5 pb-6 border-b border-black/5 dark:border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-[#3B5249] text-white flex items-center justify-center font-serif text-2xl font-bold shadow-soft ring-4 ring-[#F7F7F4] dark:ring-[#141714] shrink-0">
            {initial}
          </div>
          <div>
            <h2 className="font-serif text-2xl lg:text-3xl text-[#1A1D1A] dark:text-white">
              {displayName}
            </h2>
            <p className="text-xs text-[#717771] mt-0.5">
              {displayEmail} • {formState.skinType.toUpperCase()} Dermis Profile
            </p>
          </div>
        </div>

        {/* Primary Characteristics Quick Grid (Tab 4 layout) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1D1A] dark:text-white">
            Primary Characteristics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-[#F7F7F4] dark:bg-[#141714] rounded-2xl border border-black/5 dark:border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#717771]">Skin Type</span>
              <div className="text-xs font-bold text-[#1A1D1A] dark:text-white mt-0.5 capitalize">
                {formState.skinType}
              </div>
            </div>
            <div className="p-4 bg-[#F7F7F4] dark:bg-[#141714] rounded-2xl border border-black/5 dark:border-white/10 text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#717771]">Fitzpatrick Scale</span>
              <div className="text-xs font-bold text-[#1A1D1A] dark:text-white mt-0.5">
                Type II (Fair / Balanced)
              </div>
            </div>
            <div className="p-4 bg-[#F7F7F4] dark:bg-[#141714] rounded-2xl border border-black/5 dark:border-white/10 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#717771]">Sensitivity</span>
              <div className="text-xs font-bold text-[#1A1D1A] dark:text-white mt-0.5 capitalize">
                {formState.sensitivity}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Form Configuration Sections */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Skin Type Selection */}
        <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-8 border border-black/5 dark:border-white/10 shadow-soft space-y-4">
          <div>
            <h3 className="font-serif text-xl text-[#1A1D1A] dark:text-white">
              Skin Classification
            </h3>
            <p className="text-xs text-[#717771]">
              Select your prevailing sebum balance and baseline epidermal state
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {SKIN_TYPES.map((type) => {
              const isSelected = formState.skinType === type.id;
              return (
                <div
                  key={type.id}
                  onClick={() => setFormState({ ...formState, skinType: type.id })}
                  className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? 'bg-[#E8ECE9] dark:bg-[#252D28] border-[#3B5249] shadow-soft'
                      : 'bg-[#F7F7F4] dark:bg-[#141714] border-black/5 dark:border-white/5 hover:border-black/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1A1D1A] dark:text-white">
                      {type.label}
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-[#3B5249] bg-[#3B5249] text-white' : 'border-black/20'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#717771] leading-relaxed">
                    {type.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Sensitivity Selection */}
        <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-8 border border-black/5 dark:border-white/10 shadow-soft space-y-4">
          <div>
            <h3 className="font-serif text-xl text-[#1A1D1A] dark:text-white">
              Barrier Sensitivity Level
            </h3>
            <p className="text-xs text-[#717771]">
              Frequency of erythema, burning, or tingling upon contact with actives
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {SENSITIVITY_LEVELS.map((level) => {
              const isSelected = formState.sensitivity === level.id;
              return (
                <div
                  key={level.id}
                  onClick={() => setFormState({ ...formState, sensitivity: level.id })}
                  className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? 'bg-[#E8ECE9] dark:bg-[#252D28] border-[#3B5249] shadow-soft'
                      : 'bg-[#F7F7F4] dark:bg-[#141714] border-black/5 dark:border-white/5 hover:border-black/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#1A1D1A] dark:text-white">
                      {level.label}
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-[#3B5249] bg-[#3B5249] text-white' : 'border-black/20'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#717771] leading-relaxed">
                    {level.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Targeted Skincare Goals */}
        <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-8 border border-black/5 dark:border-white/10 shadow-soft space-y-4">
          <div>
            <h3 className="font-serif text-xl text-[#1A1D1A] dark:text-white">
              Targeted Skincare Objectives
            </h3>
            <p className="text-xs text-[#717771]">
              Select focus zones to customize your routine steps and product formulas
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {AVAILABLE_GOALS.map((goal) => {
              const isSelected = formState.goals.includes(goal);
              return (
                <div
                  key={goal}
                  onClick={() => handleToggleGoal(goal)}
                  className={`p-3.5 rounded-2xl border text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#1A1D1A] text-white border-[#1A1D1A] shadow-soft'
                      : 'bg-[#F7F7F4] dark:bg-[#141714] text-[#1A1D1A] dark:text-white border-black/5 hover:border-black/20'
                  }`}
                >
                  <span>{goal}</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-white bg-white text-[#1A1D1A]' : 'border-black/20'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Allergies & Avoided Ingredients */}
        <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-8 border border-black/5 dark:border-white/10 shadow-soft space-y-4">
          <div>
            <h3 className="font-serif text-xl text-[#1A1D1A] dark:text-white">
              Allergens & Excluded Actives
            </h3>
            <p className="text-xs text-[#717771]">
              DermaSense will filter out routines containing these compounds
            </p>
          </div>

          {/* Current tags */}
          <div className="flex flex-wrap gap-2">
            {formState.allergies.length > 0 ? (
              formState.allergies.map((allergy) => (
                <span
                  key={allergy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200"
                >
                  <span>{allergy}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAllergy(allergy)}
                    className="hover:text-black cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-xs text-[#717771] italic">No active allergen exclusions listed.</span>
            )}
          </div>

          {/* Add input */}
          <div className="flex gap-2 pt-1 max-w-md">
            <input
              type="text"
              value={newAllergyInput}
              onChange={(e) => setNewAllergyInput(e.target.value)}
              placeholder="e.g. Fragrance, Sulfates, Essential Oils..."
              className="flex-1 px-4 py-2.5 rounded-2xl text-xs bg-[#F7F7F4] dark:bg-[#141714] border border-black/10 dark:border-white/10 text-[#1A1D1A] dark:text-white placeholder:text-[#717771] focus:outline-none focus:border-[#3B5249]"
            />
            <button
              type="button"
              onClick={handleAddAllergy}
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-white dark:bg-[#1D221E] hover:bg-[#F7F7F4] border border-black/10 text-[#1A1D1A] dark:text-white flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-8 py-3.5 rounded-2xl bg-[#3B5249] hover:bg-[#2D4039] text-white text-xs font-semibold shadow-soft flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>{updateMutation.isPending ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
