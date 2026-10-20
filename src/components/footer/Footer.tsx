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
            RAVANA DAHAN
          </h3>
          <p className="text-amber-200/90 text-sm sm:text-base font-cinzel italic tracking-wide">
            &ldquo;Celebrating the eternal victory of light over darkness.&rdquo;
          </p>
          <p className="text-xs text-neutral-400 font-sans pt-1">
            May the sacred flames consume our inner doubts and awaken righteousness, truth, and peace in every heart.
          </p>
        </div>

        {/* Footer Navigation Mirror & Return to Top */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400 pt-4 border-t border-neutral-900 w-full max-w-lg">
          <a href="#hero" className="hover:text-amber-400 transition-colors">
            The Legend
          </a>
          <span>·</span>
          <a href="#interactive" className="hover:text-amber-400 transition-colors">
            Interactive Dahan
          </a>
          <span>·</span>
          <a href="#vices" className="hover:text-amber-400 transition-colors">
            The Ten Vices
          </a>
          <span>·</span>
          <button
            onClick={scrollToTop}
            className="hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
            aria-label="Scroll back to top"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[11px] text-neutral-400/80 font-sans tracking-wide">
          Shubh Vijayadashami · Dussehra Festival Edition
        </div>
      </div>
    </footer>
  );
};
