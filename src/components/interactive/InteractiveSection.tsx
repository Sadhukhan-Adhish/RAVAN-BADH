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
            <span>THE RITUAL OF COMBUSTION</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <h2 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold tracking-wide text-white glow-fire mb-4 text-balance">
            THE SACRED DAHAN SIMULATION
          </h2>
          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed font-sans max-w-2xl">
            Take command of Lord Rama’s Kodanda bow. Release the blazing Agneyastra towards the Amrit Kund in the effigy’s navel to ignite the bamboo structure, detonate the fireworks in all ten heads, and illuminate the festive night sky.
          </p>
        </div>

        {/* The Central Canvas Interactive Experience */}
        <RavanaCanvas />

        {/* Educational Interaction Highlights / Legend Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          <div className="p-4 rounded-xl bg-[#0e0e17] border border-neutral-800/80 flex items-start gap-3">
            <Target className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white font-cinzel">Amrit Kund Target</div>
              <div className="text-[12px] text-neutral-400 mt-1 leading-snug">
                The golden nectar vessel in the navel—strike here to breach invulnerability.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e0e17] border border-neutral-800/80 flex items-start gap-3">
            <Flame className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white font-cinzel">Raging Flame Spread</div>
              <div className="text-[12px] text-neutral-400 mt-1 leading-snug">
                Agni spreads dynamically through bamboo armatures and royal paper vestments.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e0e17] border border-neutral-800/80 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white font-cinzel">Ten Head Firecrackers</div>
              <div className="text-[12px] text-neutral-400 mt-1 leading-snug">
                Each head detonates sequential firework bursts representing the destruction of ego.
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0e0e17] border border-neutral-800/80 flex items-start gap-3">
            <Volume2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-white font-cinzel">Synthesized Audio</div>
              <div className="text-[12px] text-neutral-400 mt-1 leading-snug">
                Real-time Web Audio string twang, arrow whistle, roaring fire, and victory bells.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
