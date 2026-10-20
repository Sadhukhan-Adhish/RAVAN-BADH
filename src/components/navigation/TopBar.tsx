import React, { useState } from 'react';
import { Flame, Menu, X } from 'lucide-react';

interface TopBarProps {
  onIgniteClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onIgniteClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'পৌরাণিক কথা', href: '#hero' },
    { label: 'ঐতিহ্যবাহী দহন', href: '#interactive' },
    { label: 'দশ রিপু', href: '#vices' },
    { label: 'উৎসবের মহিমা', href: '#story' },
  ];

  const handleLinkClick = (href: string) => {
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#060609]/90 backdrop-blur-md border-b border-amber-950/30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <a 
          href="#hero" 
          className="text-lg md:text-xl font-cinzel font-bold tracking-wider text-[#fdfbf7] hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="text-amber-500 font-black">✦</span>
          <span>রাবণ দহন</span>
        </a>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-300">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleLinkClick(link.href)}
              className="hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0 hover:underline underline-offset-8 decoration-amber-500/60"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={onIgniteClick}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-xs font-semibold tracking-wider font-cinzel text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg hover:from-amber-300 hover:to-amber-400 active:scale-95 transition-all shadow-md shadow-amber-500/20 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-amber-900 fill-amber-900" />
            <span>অগ্নিবাণ ছোড়ো</span>
          </button>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-neutral-300 hover:text-amber-400 cursor-pointer"
            aria-label="Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-[#090910] px-6 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleLinkClick(link.href)}
              className="text-left py-2 text-sm text-neutral-300 hover:text-amber-300 transition-colors"
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onIgniteClick();
            }}
            className="mt-2 flex items-center justify-center gap-2 w-full py-3 text-xs font-semibold tracking-wider font-cinzel text-amber-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg shadow-md"
          >
            <Flame className="w-4 h-4 text-amber-900 fill-amber-900" />
            <span>অগ্নিবাণ ছোড়ো</span>
          </button>
        </div>
      )}
    </header>
  );
};
