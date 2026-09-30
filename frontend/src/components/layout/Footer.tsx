import React from 'react';
import { Leaf } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-black/5 dark:border-white/5 bg-[#F7F7F4]/80 dark:bg-[#141714] py-6 px-4 lg:px-12 text-center text-xs text-[#717771]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#3B5249] flex items-center justify-center text-white shadow-xs">
            <Leaf className="w-3.5 h-3.5 text-emerald-300" />
          </div>
          <span className="font-serif text-sm font-normal text-[#1A1D1A] dark:text-white">
            DermaSense AI
          </span>
          <span className="text-[11px] text-[#717771]">© 2026 Clinical Intelligence Systems</span>
        </div>

        <div className="flex items-center gap-5 text-[11px]">
          <a href="#privacy" className="hover:text-[#1A1D1A] dark:hover:text-white transition-colors">
            Privacy Policy
          </a>
          <a href="#dermatology-terms" className="hover:text-[#1A1D1A] dark:hover:text-white transition-colors">
            Dermatological Terms
          </a>
          <a href="#clinical-accuracy" className="hover:text-[#1A1D1A] dark:hover:text-white transition-colors">
            AI Accuracy Disclaimer
          </a>
        </div>
      </div>
    </footer>
  );
};
