import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserProfileApi, updateUserProfileApi } from '../../api/client';
import type { UserProfile, SkinType, SensitivityLevel } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { User, ShieldAlert, Target, Save, CheckCircle, Sparkles, Plus, X } from 'lucide-react';

const SKIN_TYPES: { id: SkinType; label: string; desc: string }[] = [
  { id: 'oily', label: 'Oily', desc: 'Excess sebum, shine in T-zone & cheeks' },
  { id: 'dry', label: 'Dry', desc: 'Flaky, tight feeling, needs rich moisture' },
  { id: 'neutral', label: 'Neutral', desc: 'Well balanced moisture & oil levels' },
  { id: 'combination', label: 'Combination', desc: 'Oily T-zone with neutral/dry cheeks' },
];

const SENSITIVITY_LEVELS: { id: SensitivityLevel; label: string; desc: string }[] = [
  { id: 'low', label: 'Low', desc: 'Rarely reacts to active skincare' },
  { id: 'medium', label: 'Medium', desc: 'Occasional redness or mild tingling' },
  { id: 'high', label: 'High', desc: 'Easily irritated, reactive to fragrance/acids' },
];

const AVAILABLE_GOALS = [
  'Reduce Acne',
  'Improve Texture',
  'Minimize Pores',
  'Fading Dark Spots',
  'Anti-Aging / Fine Lines',
  'Hydration & Barrier Repair',
  'Oil Balance Control',
];

export const ProfileForm: React.FC = () => {
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
    goals: ['Reduce Acne', 'Improve Texture'],
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
      setSuccessMessage('Skin profile updated successfully!');
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

  if (isLoading) return <LoadingSpinner label="Fetching skin profile..." size="lg" />;
  if (isError) return <ErrorAlert message={(error as Error).message} onRetry={() => refetch()} />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <User className="w-4 h-4" />
            <span>Personal Preferences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Skin Profile Setup</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Customize your skin characteristics for highly accurate AI routine recommendations.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-teal-400 to-emerald-400 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/10 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {updateMutation.isError && (
        <ErrorAlert message={(updateMutation.error as Error).message} />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Skin Type Selection */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-teal-400" />
            Primary Skin Type
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SKIN_TYPES.map((type) => {
              const isSelected = formState.skinType === type.id;
              return (
                <div
                  key={type.id}
                  onClick={() => setFormState({ ...formState, skinType: type.id })}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-teal-500/15 border-teal-500/50 shadow-md shadow-teal-500/10'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white capitalize">{type.label}</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-teal-400 bg-teal-400' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{type.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Sensitivity Level */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Skin Sensitivity Level
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SENSITIVITY_LEVELS.map((level) => {
              const isSelected = formState.sensitivity === level.id;
              return (
                <div
                  key={level.id}
                  onClick={() => setFormState({ ...formState, sensitivity: level.id })}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white capitalize">{level.label}</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-amber-400 bg-amber-400' : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{level.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Allergies & Sensitivities */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Known Ingredient Allergies & Sensitivities
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Ingredients listed here will be strictly excluded from your AI recommendations.
          </p>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={newAllergyInput}
              onChange={(e) => setNewAllergyInput(e.target.value)}
              placeholder="e.g. Salicylic Acid, Fragrance, Benzoyl Peroxide"
              className="flex-1 glass-input rounded-xl px-4 py-2 text-xs transition-all"
            />
            <button
              type="button"
              onClick={handleAddAllergy}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formState.allergies.length === 0 ? (
              <span className="text-xs text-slate-500 italic">No allergies added yet.</span>
            ) : (
              formState.allergies.map((allergy) => (
                <span
                  key={allergy}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300"
                >
                  {allergy}
                  <button
                    type="button"
                    onClick={() => handleRemoveAllergy(allergy)}
                    className="hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* 4. Skincare Goals */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-emerald-400" />
            Primary Skincare Goals
          </h3>

          <div className="flex flex-wrap gap-2.5">
            {AVAILABLE_GOALS.map((goal) => {
              const isSelected = formState.goals.includes(goal);
              return (
                <button
                  type="button"
                  key={goal}
                  onClick={() => handleToggleGoal(goal)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm shadow-teal-500/10'
                      : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isSelected ? `✓ ${goal}` : `+ ${goal}`}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </div>
  );
};
