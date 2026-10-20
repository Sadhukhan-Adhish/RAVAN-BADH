import React, { useState } from 'react';
import { TEN_VICES, FESTIVAL_PILLARS } from '../../data/dussehraData';
import { ViceHead } from '../../types';
import { Flame, Sparkles, Shield, ChevronRight } from 'lucide-react';

export const StorySection: React.FC = () => {
  const [selectedVice, setSelectedVice] = useState<ViceHead>(TEN_VICES[4]); // Ahankara default

  return (
    <section id="story" className="w-full py-24 px-6 bg-[#06060a] relative">
      <div className="max-w-6xl mx-auto flex flex-col gap-24">
        
        {/* Main Editorial Story Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <div className="text-xs font-semibold tracking-[0.25em] text-amber-500 uppercase mb-3">
            THE SACRED EPIC OF VIJAYADASHAMI
          </div>
          <h2 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold tracking-wide text-white glow-gold mb-6 text-balance">
            THE VICTORY OF GOOD OVER EVIL
          </h2>
          <p className="text-neutral-300 text-base sm:text-lg leading-relaxed font-sans">
            Dussehra, also revered as Vijayadashami, marks the tenth day of the bright half of the month of Ashwin. It commemorates the timeless triumph of Shri Rama over the demon king Ravana, symbolizing that no matter how mighty or learned arrogance becomes, it must ultimately bow before righteousness and truth.
          </p>
        </div>

        {/* Feature Split: The Divine Agneyastra & The Secret of Amrit Kund */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Artwork Card */}
          <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-amber-900/40 shadow-2xl bg-black">
            <img
              src="/src/assets/images/divine_flaming_arrow_1792513652782.jpg"
              alt="Divine archer drawing tight a golden bow with blazing fire arrow"
              className="w-full h-[360px] sm:h-[460px] object-cover object-center"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080810] via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="text-xs text-amber-400 font-cinzel tracking-wider uppercase mb-1">
                The Kodanda Bow & Agneyastra
              </div>
              <div className="text-white text-sm sm:text-base font-medium">
                &ldquo;Aim not for the heads that multiply, but for the pride rooted within the navel.&rdquo;
              </div>
            </div>
          </div>

          {/* Narrative Text */}
          <div className="lg:col-span-6 flex flex-col gap-6 text-neutral-300">
            <div className="space-y-4 text-base sm:text-lg leading-relaxed font-sans">
              <p>
                Ravana was not a crude brute; he was a master of the four Vedas, an ardent devotee of Lord Shiva, and an architect of golden Lanka. Yet, unbridled hubris (<span className="text-amber-300 font-medium">Ahankara</span>) turned his profound wisdom into tyranny.
              </p>
              <p>
                When Lord Rama severed Ravana’s heads in combat, another sprang immediately in its place—a metaphor for how cutting down individual worldly desires only breeds new cravings.
              </p>
              <p>
                It was only when the divine arrow, consecrated with the solar hymns of <span className="text-amber-300 font-medium">Aditya Hridayam</span>, struck the <span className="text-amber-300 font-medium">Amrit Kund</span> (the nectar reservoir of life in Ravana’s navel) that the illusion crumbled, freeing Lanka and restoring Dharma across creation.
              </p>
            </div>

            {/* Editorial Quote Box */}
            <div className="p-5 rounded-xl bg-[#0f0e16] border border-amber-950/60 flex items-start gap-4">
              <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
              <div>
                <div className="text-xs tracking-wider font-cinzel text-amber-400 uppercase mb-1">
                  Eternal Sanskrit Proverb
                </div>
                <div className="text-base text-white font-serif italic mb-1">
                  &ldquo;Yato Dharmastato Jayah&rdquo;
                </div>
                <div className="text-xs text-neutral-400">
                  Where there is Dharma (Righteousness), there alone is Victory.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Three Pillars of Dussehra */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FESTIVAL_PILLARS.map((pillar) => (
            <div 
              key={pillar.step}
              className="p-8 rounded-2xl bg-[#0d0d15] border border-neutral-800/80 hover:border-amber-800/40 transition-colors flex flex-col"
            >
              <span className="font-cinzel text-3xl font-bold text-amber-500/80 mb-4">
                {pillar.step}
              </span>
              <h3 className="font-cinzel text-xl font-bold text-white mb-2">
                {pillar.title}
              </h3>
              <div className="text-xs font-medium text-amber-400/80 mb-3 tracking-wide">
                {pillar.tagline}
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed font-sans">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>

        {/* Dedicated Section: The Ten Vices of Dashanana (Interactive Explorer) */}
        <div id="vices" className="flex flex-col gap-10 pt-12 border-t border-neutral-900">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="text-xs font-semibold tracking-[0.22em] text-amber-500 uppercase mb-2">
              INNER CONQUEST
            </div>
            <h3 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-white glow-gold mb-3">
              THE TEN HEADS OF RAVANA
            </h3>
            <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
              In Indian spiritual philosophy, Ravana’s ten heads embody ten psychological and spiritual pitfalls that keep consciousness bound. Select any head to explore its esoteric lesson.
            </p>
          </div>

          {/* Interactive Vice Explorer Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* List of 10 Vices */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEN_VICES.map((vice) => {
                const isSelected = selectedVice.id === vice.id;
                return (
                  <button
                    key={vice.id}
                    onClick={() => setSelectedVice(vice)}
                    className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-500 text-white shadow-lg shadow-amber-900/20'
                        : 'bg-[#0f0e16] border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-amber-300 font-cinzel">
                        {vice.sanskritName}
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {vice.englishName}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-amber-400 translate-x-1' : 'text-neutral-600'}`} />
                  </button>
                );
              })}
            </div>

            {/* Selected Vice Insight Panel */}
            <div className="lg:col-span-5 p-6 sm:p-8 rounded-2xl bg-[#11111b] border border-amber-900/30 flex flex-col justify-between min-h-[340px]">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-amber-400 uppercase mb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>HEAD {selectedVice.id} OF 10</span>
                </div>
                <h4 className="font-cinzel text-2xl font-bold text-white mb-1">
                  {selectedVice.sanskritName}
                </h4>
                <div className="text-sm font-medium text-amber-300 mb-6">
                  {selectedVice.englishName}
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                      The Manifestation:
                    </div>
                    <p className="text-sm text-neutral-200 leading-relaxed font-sans">
                      {selectedVice.meaning}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-1">
                      The Dharmic Antidote:
                    </div>
                    <p className="text-sm text-amber-200/90 leading-relaxed font-sans">
                      {selectedVice.spiritualRemedy}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                <span>Burned during Ravana Dahan</span>
                <span className="text-amber-400 font-cinzel font-semibold">Vijayadashami</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
