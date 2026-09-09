import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { analyzeSkinImageApi } from '../../api/client';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import {
  UploadCloud,
  Camera,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Scan,
  ShieldCheck,
  FileImage,
} from 'lucide-react';

const ANALYSIS_STEPS = [
  'Initializing DermaSense Vision Model...',
  'Scanning facial topology & texture...',
  'Detecting acne, pores, & localized spots...',
  'Calculating subscores & skin health index...',
  'Generating personalized skincare recommendations...',
];

export const ImageUpload: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const analyzeMutation = useMutation({
    mutationFn: (file: File) => analyzeSkinImageApi(file),
    onSuccess: (data) => {
      queryClient.setQueryData(['latestAnalysis'], data);
      queryClient.invalidateQueries({ queryKey: ['progressHistory'] });
      navigate('/');
    },
  });

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, WEBP).');
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUseSampleImage = () => {
    // Generate a lightweight canvas image for instant testing
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = '#14b8a6';
      ctx.beginPath();
      ctx.arc(200, 200, 100, 0, Math.PI * 2);
      ctx.fill();
    }
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'sample_face_scan.png', { type: 'image/png' });
        handleFileSelect(file);
      }
    });
  };

  const handleStartAnalysis = () => {
    if (!selectedFile) return;

    // Cycle through loading steps visually
    setCurrentStepIndex(0);
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < ANALYSIS_STEPS.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 380);

    analyzeMutation.mutate(selectedFile);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Computer Vision Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Face Photo Skin Analysis</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto mt-1">
          Upload a clear front-facing photo in good lighting to detect acne, pores, texture, and get your AI Skin Score.
        </p>
      </div>

      {analyzeMutation.isError && (
        <ErrorAlert
          message={(analyzeMutation.error as Error).message}
          onRetry={handleStartAnalysis}
        />
      )}

      {/* Main Upload Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
        {analyzeMutation.isPending ? (
          /* Processing Loading View */
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-teal-500/40 shadow-2xl shadow-teal-500/20">
              {previewUrl ? (
                <img src={previewUrl} alt="Scanning target" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-teal-400" />
                </div>
              )}
              {/* Animated laser scanner line */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_15px_#14b8a6] animate-scan" />
            </div>

            <div className="max-w-md w-full space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-2">
                  <Scan className="w-4 h-4 text-teal-400 animate-spin" />
                  {ANALYSIS_STEPS[currentStepIndex]}
                </span>
                <span className="text-teal-400 font-mono">
                  {Math.round(((currentStepIndex + 1) / ANALYSIS_STEPS.length) * 100)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-indigo-400 transition-all duration-500 ease-out"
                  style={{
                    width: `${((currentStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%`,
                  }}
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Privacy guaranteed: Photos are processed locally for instant feature extraction.
              </p>
            </div>
          </div>
        ) : (
          /* Selection & Drag Drop View */
          <div className="space-y-6">
            {!previewUrl ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700/80 hover:border-teal-500/60 rounded-2xl p-8 sm:p-12 text-center bg-slate-900/30 hover:bg-slate-900/50 transition-all cursor-pointer group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  accept="image/*"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <h3 className="text-base font-bold text-white mb-1">
                  Drag & drop your face photo here
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  Supports JPG, PNG, WEBP up to 10MB. Make sure your face is clearly visible.
                </p>

                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 hover:bg-slate-750 transition-all"
                >
                  Browse Files
                </button>
              </div>
            ) : (
              /* Selected Image Preview */
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                  <img src={previewUrl} alt="Face scan preview" className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Photo ready for analysis</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {selectedFile?.name || 'Face Scan Photo'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    File size: {((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Change Photo
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Demo Sample Option */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleUseSampleImage}
                className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
              >
                <FileImage className="w-4 h-4" />
                Use demo sample face scan
              </button>

              <button
                onClick={handleStartAnalysis}
                disabled={!selectedFile || analyzeMutation.isPending}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-400 hover:brightness-110 transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <span>Analyze Skin Health</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guidelines footer */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="glass-card p-4 rounded-xl text-xs space-y-1">
          <ShieldCheck className="w-4 h-4 text-teal-400 mx-auto" />
          <h5 className="font-semibold text-slate-200">100% Private</h5>
          <p className="text-slate-400">Encrypted image ingestion</p>
        </div>
        <div className="glass-card p-4 rounded-xl text-xs space-y-1">
          <Sparkles className="w-4 h-4 text-emerald-400 mx-auto" />
          <h5 className="font-semibold text-slate-200">Instant AI Score</h5>
          <p className="text-slate-400">Pores, acne & subscores</p>
        </div>
        <div className="glass-card p-4 rounded-xl text-xs space-y-1">
          <Camera className="w-4 h-4 text-indigo-400 mx-auto" />
          <h5 className="font-semibold text-slate-200">Natural Lighting</h5>
          <p className="text-slate-400">Best accuracy in daylight</p>
        </div>
      </div>
    </div>
  );
};
