import React, { useEffect, useRef } from 'react';
import { Flame, BookOpen, ChevronDown } from 'lucide-react';

interface HeroSectionProps {
  onIgniteClick: () => void;
  onStoryClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onIgniteClick, onStoryClick }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Background floating embers particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const embers: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; decay: number }[] = [];
    for (let i = 0; i < 60; i++) {
      embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -0.4 - Math.random() * 1.2,
        size: 1 + Math.random() * 2.5,
        alpha: 0.15 + Math.random() * 0.7,
        decay: 0.002 + Math.random() * 0.005,
      });
    }

    const loop = () => {
      ctx.clearRect(0, 0, width, height);

      for (const e of embers) {
        e.y += e.vy;
        e.x += e.vx + Math.sin(e.y * 0.01) * 0.3;
        e.alpha -= e.decay;

        if (e.y < -20 || e.alpha <= 0.05) {
          e.y = height + 10;
          e.x = Math.random() * width;
          e.alpha = 0.2 + Math.random() * 0.8;
        }

        ctx.fillStyle = `rgba(251, 191, 36, ${e.alpha})`;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <section 
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden bg-[#060609]"
    >
      {/* Background Cinematic Effigy Image with Deep Vignette Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src="/src/assets/images/ravana_effigy_cinematic_1792513653084.jpg"
          alt="Majestic towering multi-headed Ravana effigy at night during Dussehra festival"
          className="w-full h-full object-cover object-center opacity-40 mix-blend-screen scale-105 transform motion-safe:animate-pulse [animation-duration:12s]"
        />
        {/* Layered radial gradient scrim for deep theatrical contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060609] via-[#060609]/75 to-[#060609]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#060609_80%)]" />
      </div>

      {/* Floating Amber Embers Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-1 pointer-events-none"
      />

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        {/* Small Label */}
        <div className="inline-flex items-center gap-2 mb-6 text-xs md:text-sm font-semibold tracking-[0.28em] text-amber-400/90 uppercase">
          <span className="text-amber-500 font-bold">✦</span>
          <span>A CELEBRATION OF VIJAYADASHAMI</span>
          <span className="text-amber-500 font-bold">✦</span>
        </div>

        {/* Main Heading: RAVANA DAHAN */}
        <h1 className="font-cinzel text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-wider text-white drop-shadow-[0_10px_35px_rgba(255,87,34,0.35)] glow-fire mb-4 leading-none">
          RAVANA DAHAN
        </h1>

        {/* Subtitle */}
        <p className="font-cinzel text-xl sm:text-2xl md:text-3xl font-semibold text-amber-200/95 tracking-wide mb-6">
          The Triumph of Light Over Darkness.
        </p>

        {/* Cinematic Narrative Lead */}
        <p className="max-w-2xl text-neutral-300 text-base sm:text-lg leading-relaxed mb-10 font-sans">
          On this sacred night of Vijayadashami, witness the burning of the ten-headed King of Lanka. As the divine Agneyastra pierces the vessel of ego, cosmic righteousness is restored across the three worlds.
        </p>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {/* Primary CTA */}
          <button
            onClick={onIgniteClick}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 text-amber-950 font-cinzel font-bold text-sm sm:text-base tracking-widest hover:from-amber-400 hover:to-orange-500 active:scale-95 transition-all shadow-[0_0_30px_rgba(245,158,11,0.45)] flex items-center justify-center gap-3 cursor-pointer"
          >
            <Flame className="w-5 h-5 text-amber-950 fill-amber-950" />
            <span>IGNITE THE LEGEND</span>
          </button>

          {/* Secondary CTA */}
          <button
            onClick={onStoryClick}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-neutral-900/80 hover:bg-neutral-800/90 border border-amber-600/30 text-amber-100 font-cinzel font-medium text-sm sm:text-base tracking-widest transition-all flex items-center justify-center gap-3 cursor-pointer backdrop-blur-sm"
          >
            <BookOpen className="w-5 h-5 text-amber-400" />
            <span>DISCOVER THE STORY</span>
          </button>
        </div>

        {/* Editorial Trust / Cultural Anchor Strip */}
        <div className="mt-16 pt-8 border-t border-amber-950/40 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs text-neutral-400 tracking-wider">
          <div className="flex items-center gap-2">
            <span className="text-amber-500">10 Heads</span>
            <span className="opacity-40">·</span>
            <span>Ten Human Vices Burned</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500">Agneyastra</span>
            <span className="opacity-40">·</span>
            <span>The Divine Arrow of Truth</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500">Dharma</span>
            <span className="opacity-40">·</span>
            <span>Eternal Cosmic Balance</span>
          </div>
        </div>
      </div>

      {/* Down arrow scroll cue */}
      <button 
        onClick={onIgniteClick}
        aria-label="Scroll to interactive animation"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-amber-400/60 hover:text-amber-300 transition-colors animate-bounce p-2 cursor-pointer"
      >
        <ChevronDown className="w-6 h-6" />
      </button>
    </section>
  );
};
