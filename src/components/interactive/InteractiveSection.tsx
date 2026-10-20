import React from 'react';
import { RavanaCanvas } from '../canvas/RavanaCanvas';
import { Flame, Sparkles, Target, Volume2 } from 'lucide-react';

export const InteractiveSection: React.FC = () => {
  return (
    <section id="interactive" className="w-full py-20 px-4 sm:px-6 bg-[#07070d] relative overflow-hidden">
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

        {/* Educational Interaction Highlights / Legend Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div className="p-4 rounded-xl bg-[#0e0e17] border border-neutral-800/80 flex items-start gap-3">
            <Target className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white font-cinzel">অমৃত কুণ্ড লক্ষ্য</div>
              <div className="text-[12px] text-neutral-400 mt-1 leading-snug">
                নাভিস্থ সোনার অমৃত পাত্র—এখানে আঘাত করলেই অমরত্বের মায়া চূর্ণ হয়।
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e0e17] border border-neutral-800/80 flex items-start gap-3">
            <Flame className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white font-cinzel">দাবানলের বিস্তার</div>
              <div className="text-[12px] text-neutral-400 mt-1 leading-snug">
                বাঁশ ও রঙিন পোশাকে ক্ষিপ্র গতিতে ছড়িয়ে পড়ে লেলিহান অগ্নিশিখা।
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e0e17] border border-neutral-800/80 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white font-cinzel">দশ মাথার আতশবাজি</div>
              <div className="text-[12px] text-neutral-400 mt-1 leading-snug">
                প্রতিটি মস্তক একে একে বিস্ফোরিত হয়ে অন্তরের দশটি রিপুর বিনাশ ঘোষণা করে।
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e0e17] border border-neutral-800/80 flex items-start gap-3">
            <Volume2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white font-cinzel">শব্দ প্রতিক্রিয়া</div>
              <div className="text-[12px] text-neutral-400 mt-1 leading-snug">
                ধনুকের গুণ টানার শব্দ, তীরের শনশন গর্জন, অগ্নির গর্জন ও বিজয়ের উল্লাস।
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
