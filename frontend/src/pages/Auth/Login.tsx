import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-8 sm:p-10 border border-black/5 dark:border-white/10 shadow-soft relative overflow-hidden space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#E8ECE9] dark:bg-[#252D28] text-[#3B5249] dark:text-emerald-300 mx-auto flex items-center justify-center shadow-soft">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-serif text-[#1A1D1A] dark:text-white">
              Welcome Back
            </h2>
            <p className="text-xs text-[#717771] dark:text-[#A3B0A9]">
              Sign in to your clinical skincare companion
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="badge-action p-3 rounded-2xl flex items-start gap-2.5 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#1A1D1A] dark:text-[#EFEFEA]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717771]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-xs bg-[#F7F7F4] dark:bg-[#141714] border border-black/10 dark:border-white/10 text-[#1A1D1A] dark:text-white placeholder:text-[#717771] focus:outline-none focus:border-[#3B5249] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#1A1D1A] dark:text-[#EFEFEA]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717771]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-2xl text-xs bg-[#F7F7F4] dark:bg-[#141714] border border-black/10 dark:border-white/10 text-[#1A1D1A] dark:text-white placeholder:text-[#717771] focus:outline-none focus:border-[#3B5249] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#717771] hover:text-[#1A1D1A] dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl text-xs font-semibold bg-[#3B5249] hover:bg-[#2D4039] text-white shadow-soft flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer mt-2 active:scale-95"
            >
              <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer Note */}
          <div className="text-center pt-2 border-t border-black/5 dark:border-white/10">
            <p className="text-xs text-[#717771]">
              New to DermaSense?{' '}
              <Link
                to="/register"
                className="text-[#3B5249] dark:text-emerald-400 font-bold hover:underline"
              >
                Create your account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
