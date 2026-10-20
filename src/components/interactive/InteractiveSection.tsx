import React from 'react';
import { RavanaCanvas } from '../canvas/RavanaCanvas';
import { Flame } from 'lucide-react';

export const InteractiveSection: React.FC = () => {
  return (
    <section
      id="interactive"
      className="w-full py-20 px-4 sm:px-6 bg-[#07070d] relative overflow-hidden"
    >
      {/* Background radial warmth glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto flex flex-col gap-10 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.24em] text-amber-500 uppercase mb-3">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>পবিত্র দহন পর্ব</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>

          <h2 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold tracking-wide text-white glow-fire mb-4 text-balance">
            রাবণ দহন অভিজ্ঞতা
          </h2>

          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed font-sans max-w-2xl">
            শ্রীরামচন্দ্রের কোদণ্ড ধনুকের দায়িত্ব নিন। রাবণের নাভিস্থ অমৃত কুণ্ড লক্ষ্য করে দিব্য আগ্নেয়াস্ত্র নিক্ষেপ করুন, বাঁশের কাঠামোয় প্রজ্বলিত করুন পবিত্র অগ্নি এবং দশ মাথার আতশবাজিতে আলোকিত করুন রাতের আকাশ।
          </p>
        </div>

        {/* The Central Canvas Interactive Experience */}
        <RavanaCanvas />
      </div>
    </section>
  );
};