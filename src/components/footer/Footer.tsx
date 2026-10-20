import React from 'react';
import { ArrowUp, Flame } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#040407] border-t border-amber-950/30 py-16 px-6">
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center gap-8">
        {/* Sacred Flame Emblem */}
        <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Flame className="w-5 h-5 fill-amber-400/20" />
        </div>

        {/* Minimal Required Statement */}
        <div className="space-y-2 max-w-xl">
          <h3 className="font-cinzel text-lg sm:text-xl font-bold tracking-wider text-white">
            রাবণ দহন
          </h3>
          <p className="text-amber-200/90 text-sm sm:text-base font-cinzel italic tracking-wide">
            &ldquo;আলোর জয় হোক, অন্ধকারের বিনাশ হোক।&rdquo;
          </p>
          <p className="text-xs text-neutral-400 font-sans pt-1">
            পবিত্র অগ্নিশিখা আমাদের অন্তরের সমস্ত অন্ধকার ও সংশয় দূর করে সবার হৃদয়ে সত্য, ন্যায় ও শান্তির আলো জ্বালিয়ে তুলুক।
          </p>
        </div>

        {/* Footer Navigation Mirror & Return to Top */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400 pt-4 border-t border-neutral-900 w-full max-w-lg">
          <a href="#hero" className="hover:text-amber-400 transition-colors">
            পৌরাণিক কথা
          </a>
          <span>·</span>
          <a href="#interactive" className="hover:text-amber-400 transition-colors">
            ঐতিহ্যবাহী দহন
          </a>
          <span>·</span>
          <a href="#vices" className="hover:text-amber-400 transition-colors">
            দশ রিপু
          </a>
          <span>·</span>
          <button
            onClick={scrollToTop}
            className="hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
            aria-label="পৃষ্ঠার শীর্ষে ফিরে যান"
          >
            <span>উপরে উঠুন</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[11px] text-neutral-400/80 font-sans tracking-wide">
          শুভ বিজয়াদশমী · আলোর মহোৎসব
        </div>
      </div>
    </footer>
  );
};
