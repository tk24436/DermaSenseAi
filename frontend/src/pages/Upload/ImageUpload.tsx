import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '../../context/NotificationContext';
import { analyzeSkinImageApi } from '../../api/client';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import skincareScanProfile from '../../assets/skincare_scan_profile.jpg';
import {
  UploadCloud,
  Camera,
  CheckCircle2,
  RefreshCw,
  Sun,
  AlertCircle,
  Video,
  ShieldCheck,
  Aperture,
  Sparkles,
} from 'lucide-react';

const CLINICAL_ANALYSIS_STEPS = [
  'Detecting facial landmarks & dermis orientation',
  'Evaluating lipid barrier & pore density',
  'Assessing epidermal hydration & sensitivity index',
  'Synthesizing clinical skin health index',
  'Formulating targeted product recommendations',
];

export const ImageUpload: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Mode: 'camera' | 'file'
  const [mode, setMode] = useState<'camera' | 'file'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const { addNotification, refreshNotifications } = useNotifications();

  const analyzeMutation = useMutation({
    mutationFn: (file: File) => analyzeSkinImageApi(file),
    onSuccess: async (data) => {
      queryClient.setQueryData(['latestAnalysis'], data);
      queryClient.invalidateQueries({ queryKey: ['progressHistory'] });
      addNotification({
        type: 'scan',
        title: `Scan Completed: ${data.analysis.skinScore}% Skin Score`,
        message: `Your clinical dermis scan scored ${data.analysis.skinScore}%. Routine and formulations have been updated for ${data.analysis.skinType} skin.`,
        link: '/dashboard',
        actionLabel: 'View Health Report',
      });
      await refreshNotifications();
      navigate('/');
    },
  });

  // Handle Camera Start / Stop
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (mode === 'camera' && !previewUrl) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
            setCameraError(null);
          }
        })
        .catch((err) => {
          console.warn('Webcam access error:', err);
          setCameraError('Camera access was denied or is unavailable. Please upload a photo instead.');
          setMode('file');
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mode, previewUrl]);

  // Capture frame from webcam
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `clinical_scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);
      setPreviewUrl(canvas.toDataURL('image/jpeg'));

      // Stop camera stream
      const stream = video.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }, 'image/jpeg', 0.95);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, or WEBP).');
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

  const resetSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleStartAnalysis = () => {
    if (!selectedFile) return;

    setCurrentStepIndex(0);
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < CLINICAL_ANALYSIS_STEPS.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 700);

    analyzeMutation.mutate(selectedFile);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-12 py-8 space-y-8 animate-fade-in">
      
      {/* Header matching Tab 2 */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="text-xs uppercase tracking-widest text-[#3B5249] dark:text-emerald-400 font-bold">
          Real-time Computer Vision
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1A1D1A] dark:text-white">
          AI Clinical Face Scan
        </h1>
        <p className="text-xs sm:text-sm text-[#717771] dark:text-[#A3B0A9] leading-relaxed">
          Position your face within the frame under natural, even lighting for optimal dermal texture and moisture scoring.
        </p>
      </div>

      {cameraError && (
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{cameraError}</span>
        </div>
      )}

      {analyzeMutation.isError && (
        <div className="max-w-2xl mx-auto">
          <ErrorAlert
            message={(analyzeMutation.error as Error).message}
            onRetry={handleStartAnalysis}
          />
        </div>
      )}

      {/* Main Scanner Container Card */}
      <div className="bg-white dark:bg-[#1D221E] rounded-3xl p-6 lg:p-10 border border-black/5 dark:border-white/10 shadow-soft space-y-6">
        
        {/* Mode Selector Pill */}
        {!analyzeMutation.isPending && !previewUrl && (
          <div className="flex justify-center">
            <div className="bg-[#F7F7F4] dark:bg-[#141714] p-1.5 rounded-full border border-black/5 dark:border-white/10 flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setMode('camera')}
                className={`px-5 py-2 rounded-full text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  mode === 'camera'
                    ? 'bg-[#1A1D1A] dark:bg-white text-white dark:text-[#1A1D1A] shadow-md'
                    : 'text-[#717771] hover:text-[#1A1D1A] dark:hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Live Camera</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('file')}
                className={`px-5 py-2 rounded-full text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  mode === 'file'
                    ? 'bg-[#1A1D1A] dark:bg-white text-white dark:text-[#1A1D1A] shadow-md'
                    : 'text-[#717771] hover:text-[#1A1D1A] dark:hover:text-white'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= Live Camera / Scanner Window (Tab 2 Aesthetic) ================= */}
        <div className="relative w-full max-w-md mx-auto aspect-[3/4] rounded-3xl overflow-hidden bg-[#1A1D1A] border-4 border-white dark:border-[#2D3530] shadow-soft-lg group">
          
          {/* Visual Source: Camera video, Preview photo, or Fallback editorial profile */}
          {mode === 'camera' && !previewUrl ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <img
              src={previewUrl || skincareScanProfile}
              alt="Scan portrait target"
              className="w-full h-full object-cover"
            />
          )}

          {/* AI Mesh Overlay Grid */}
          <div className="absolute inset-0 scannable-mesh opacity-70 pointer-events-none" />

          {/* Sweeping Laser Scan Effect */}
          <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent scan-line shadow-[0_0_20px_#10b981] pointer-events-none" />

          {/* Clinical Reticle Corner Brackets */}
          <div className="absolute inset-10 sm:inset-12 border-2 border-dashed border-white/30 rounded-2xl pointer-events-none flex items-center justify-center">
            <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400 absolute top-2 left-2" />
            <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400 absolute top-2 right-2" />
            <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400 absolute bottom-2 left-2" />
            <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400 absolute bottom-2 right-2" />
            
            {/* Center target circle if not running */}
            {!analyzeMutation.isPending && (
              <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-400/80 animate-ping" />
              </div>
            )}
          </div>

          {/* Status Overlay Bottom Bar */}
          <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-white flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${analyzeMutation.isPending ? 'bg-emerald-400 animate-ping' : 'bg-emerald-400'}`} />
              <span className="text-xs font-medium transition-all duration-300">
                {analyzeMutation.isPending
                  ? CLINICAL_ANALYSIS_STEPS[currentStepIndex]
                  : previewUrl
                  ? 'Photo Captured • Ready for AI Evaluation'
                  : mode === 'camera'
                  ? 'Positioning Face in Frame...'
                  : 'Ready for Photo Upload'}
              </span>
            </div>
          </div>
        </div>

        {/* Step Progression Card if Analyzing */}
        {analyzeMutation.isPending && (
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-[#F7F7F4] dark:bg-[#141714] border border-black/5 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#717771]">
              <span className="font-semibold text-[#1A1D1A] dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#3B5249]" />
                Processing Clinical Dermis Layers
              </span>
              <span>{Math.round(((currentStepIndex + 1) / CLINICAL_ANALYSIS_STEPS.length) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3B5249] transition-all duration-500 rounded-full"
                style={{ width: `${((currentStepIndex + 1) / CLINICAL_ANALYSIS_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* File Drag and Drop Zone (Visible when in file mode and no photo chosen yet) */}
        {mode === 'file' && !previewUrl && !analyzeMutation.isPending && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="max-w-md mx-auto border-2 border-dashed border-black/10 dark:border-white/10 hover:border-[#3B5249] rounded-2xl p-8 text-center bg-[#F7F7F4]/60 dark:bg-[#141714] transition-all cursor-pointer group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept="image/*"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-[#E8ECE9] dark:bg-[#252D28] text-[#3B5249] dark:text-emerald-300 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#1A1D1A] dark:text-white">
              Drag & drop facial photo or browse
            </h4>
            <p className="text-xs text-[#717771] mt-1">
              Supports JPG, PNG, WEBP high-resolution dermal captures
            </p>
          </div>
        )}

        {/* Trigger Controls & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {mode === 'camera' && !previewUrl && !analyzeMutation.isPending && (
            <button
              type="button"
              onClick={handleCapturePhoto}
              className="px-8 py-3.5 rounded-2xl bg-[#3B5249] hover:bg-[#2D4039] text-white text-sm font-semibold shadow-soft transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Face Scan</span>
            </button>
          )}

          {previewUrl && !analyzeMutation.isPending && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetSelection}
                className="px-5 py-3 rounded-2xl bg-white dark:bg-[#1D221E] hover:bg-[#F7F7F4] border border-black/10 dark:border-white/10 text-xs font-semibold text-[#1A1D1A] dark:text-white shadow-soft transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#717771]" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleStartAnalysis}
                className="px-8 py-3.5 rounded-2xl bg-[#3B5249] hover:bg-[#2D4039] text-white text-sm font-semibold shadow-soft transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Aperture className="w-4 h-4" />
                <span>Start Interactive Scan</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Guidelines Quality Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1D221E] border border-black/5 dark:border-white/10 shadow-soft text-center space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
            <Sun className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-xs text-[#1A1D1A] dark:text-white">Natural Front Daylight</h4>
          <p className="text-[11px] text-[#717771]">Avoid harsh backlight or overhead spotlights for true color fidelity.</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#1D221E] border border-black/5 dark:border-white/10 shadow-soft text-center space-y-2">
          <div className="w-8 h-8 rounded-xl bg-[#E8ECE9] dark:bg-[#252D28] text-[#3B5249] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-xs text-[#1A1D1A] dark:text-white">Neutral Expression</h4>
          <p className="text-[11px] text-[#717771]">Keep facial muscles relaxed to enable accurate micro-texture scoring.</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#1D221E] border border-black/5 dark:border-white/10 shadow-soft text-center space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-xs text-[#1A1D1A] dark:text-white">Clinical Privacy First</h4>
          <p className="text-[11px] text-[#717771]">Analysis runs strictly for your companion profile without ad tracking.</p>
        </div>
      </div>
    </div>
  );
};
