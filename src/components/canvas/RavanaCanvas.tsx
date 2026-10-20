import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Flame, 
  Sparkles, 
  Crosshair
} from 'lucide-react';
import { CanvasEngine } from './CanvasEngine';
import { AnimationStatus } from '../../types';
import { soundSynth } from '../../utils/audioSynthesizer';
import { TEN_VICES } from '../../data/dussehraData';

interface RavanaCanvasProps {
  onInteraction?: () => void;
}

export const RavanaCanvas: React.FC<RavanaCanvasProps> = ({ onInteraction }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const autoResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [status, setStatus] = useState<AnimationStatus>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [particleDensity, setParticleDensity] = useState<'standard' | 'cinematic'>('cinematic');
  const [explodedHeads, setExplodedHeads] = useState<number[]>([]);
  const [activeHeadInfo, setActiveHeadInfo] = useState<string | null>(null);

  // Initialize CanvasEngine
  useEffect(() => {
    const engine = new CanvasEngine();
    engineRef.current = engine;

    engine.setStatusCallback((newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'idle') {
        setExplodedHeads([]);
        setActiveHeadInfo(null);
      }
    });

    engine.setHeadExplodeCallback((headIndex) => {
      setExplodedHeads((prev) => [...prev, headIndex]);
      const vice = TEN_VICES[headIndex];
      if (vice) {
        setActiveHeadInfo(`বিনাশ হচ্ছে: ${vice.sanskritName} — ${vice.englishName}`);
      }
    });

    if (canvasRef.current) {
      engine.mount(canvasRef.current);
    }

    // ResizeObserver for rock-solid responsive container scaling
    const resizeObserver = new ResizeObserver(() => {
      engine.handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Accessibility check: reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      engine.setParticleDensity('standard');
      setParticleDensity('standard');
    }

    return () => {
      resizeObserver.disconnect();
      engine.unmount();
    };
  }, []);

  // Update sound state
  const toggleSound = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    soundSynth.setMuted(next);
  }, [isMuted]);

  // Handle Play/Pause
  const togglePlayPause = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.togglePlayPause();
    setIsPaused((prev) => !prev);
  }, []);

  // Launch Divine Arrow
  const handleLaunchArrow = useCallback(() => {
    if (autoResetTimerRef.current) {
      clearTimeout(autoResetTimerRef.current);
      autoResetTimerRef.current = null;
    }
    if (!engineRef.current) return;
    onInteraction?.();
    engineRef.current.launchArrow();
  }, [onInteraction]);

  // Aim Bow
  const handleAim = useCallback(() => {
    if (autoResetTimerRef.current) {
      clearTimeout(autoResetTimerRef.current);
      autoResetTimerRef.current = null;
    }
    if (!engineRef.current) return;
    onInteraction?.();
    engineRef.current.startAiming();
  }, [onInteraction]);

  // Reset
  const handleReset = useCallback(() => {
    if (autoResetTimerRef.current) {
      clearTimeout(autoResetTimerRef.current);
      autoResetTimerRef.current = null;
    }
    if (!engineRef.current) return;
    engineRef.current.reset();
    setExplodedHeads([]);
    setActiveHeadInfo(null);
    setIsPaused(false);
  }, []);

  // Automatic reset after 3 seconds when animation concludes
  useEffect(() => {
    if (status === 'concluded') {
      if (autoResetTimerRef.current) {
        clearTimeout(autoResetTimerRef.current);
      }
      autoResetTimerRef.current = setTimeout(() => {
        handleReset();
      }, 3000);
    } else {
      if (autoResetTimerRef.current) {
        clearTimeout(autoResetTimerRef.current);
        autoResetTimerRef.current = null;
      }
    }

    return () => {
      if (autoResetTimerRef.current) {
        clearTimeout(autoResetTimerRef.current);
      }
    };
  }, [status, handleReset]);

  // Change speed
  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    engineRef.current?.setSpeed(newSpeed);
  }, []);

  // Change particle quality
  const handleDensityChange = useCallback((density: 'standard' | 'cinematic') => {
    setParticleDensity(density);
    engineRef.current?.setParticleDensity(density);
  }, []);

  // Canvas click interaction
  const handleCanvasClick = useCallback(() => {
    if (status === 'idle' || status === 'aiming') {
      handleLaunchArrow();
    } else if (status === 'concluded') {
      handleReset();
    }
  }, [status, handleLaunchArrow, handleReset]);

  // Handle remote event trigger (e.g. from "IGNITE THE LEGEND" button)
  useEffect(() => {
    const handleRemoteLaunch = () => {
      handleLaunchArrow();
    };
    window.addEventListener('launch-divine-arrow', handleRemoteLaunch);
    return () => {
      window.removeEventListener('launch-divine-arrow', handleRemoteLaunch);
    };
  }, [handleLaunchArrow]);

  // Status badge text
  const getStatusDisplay = () => {
    switch (status) {
      case 'idle':
        return { label: 'শ্রীরামচন্দ্র প্রস্তুত', desc: 'ধনুকের ছিলা টানা রয়েছে; অগ্নিবাণ ছুড়তে ক্লিক করুন' };
      case 'aiming':
        return { label: 'লক্ষ্য স্থির হচ্ছে', desc: 'রাবণের নাভিস্থ অমৃত কুণ্ডে দৃষ্টি নিবদ্ধ' };
      case 'flying':
        return { label: 'অগ্নিবাণ ছুটে চলেছে', desc: 'অন্ধকার চিরে সোনার স্ফুলিঙ্গ ছড়িয়ে এগিয়ে চলেছে দিব্য তীর' };
      case 'impact':
        return { label: 'অমৃত কুণ্ড বিদ্ধ', desc: 'তীব্র আঘাতে অহংকারের মায়াপাত্র চূর্ণবিচূর্ণ' };
      case 'burning':
        return { label: 'প্রজ্বলিত মহাদহন', desc: 'বাঁশ ও পোশাকে দ্রুত ছড়িয়ে পড়ছে লেলিহান অগ্নি' };
      case 'exploding':
        return { label: 'মস্তকে মহাবিস্ফোরন', desc: 'দশটি মস্তক থেকে একে একে ফেটে পড়ছে রঙিন আতশবাজি' };
      case 'concluded':
        return { label: 'সত্যের জয়', desc: 'রাবণের পুতুল ভস্মীভূত; প্রতিষ্ঠিত হলো শাশ্বত ধর্ম' };
      default:
        return { label: 'শ্রীরামচন্দ্র প্রস্তুত', desc: '' };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      {/* Top stage status bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-[#111119] border border-amber-950/40 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_12px_#f59e0b]" />
          <div>
            <div className="text-sm font-semibold tracking-wide text-amber-200">
              {statusInfo.label}
            </div>
            <div className="text-xs text-amber-400/70">
              {statusInfo.desc}
            </div>
          </div>
        </div>

        {/* Dynamic active purge notification */}
        {activeHeadInfo && (
          <div className="text-xs font-medium text-amber-300/90 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-800/30">
            {activeHeadInfo}
          </div>
        )}

        {/* Quick controls: Audio & Speed */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            aria-label={isMuted ? 'শব্দ চালু করুন' : 'শব্দ বন্ধ করুন'}
            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-amber-400 hover:border-amber-700/50 transition-colors cursor-pointer"
            title={isMuted ? 'শব্দ চালু করুন' : 'শব্দ বন্ধ করুন'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Speed selector */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs text-neutral-400">
            <button
              onClick={() => handleSpeedChange(0.5)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${speed === 0.5 ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'hover:text-neutral-200'}`}
            >
              ০.৫x
            </button>
            <button
              onClick={() => handleSpeedChange(1.0)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${speed === 1.0 ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'hover:text-neutral-200'}`}
            >
              ১.০x
            </button>
            <button
              onClick={() => handleSpeedChange(1.5)}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${speed === 1.5 ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'hover:text-neutral-200'}`}
            >
              ১.৫x
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage Canvas Container */}
      <div 
        ref={containerRef}
        onClick={handleCanvasClick}
        className="relative w-full aspect-[16/10] sm:aspect-[16/9] md:aspect-[21/10] min-h-[380px] max-h-[640px] bg-[#07070c] rounded-2xl border border-amber-900/30 overflow-hidden shadow-2xl shadow-black/80 cursor-crosshair group select-none"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
        />

        {/* Interactive Click to Launch Hint Overlay */}
        {status === 'idle' && (
          <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-auto sm:max-w-[90%] px-3 sm:px-4 py-2 rounded-xl sm:rounded-full bg-black/70 backdrop-blur-md border border-amber-500/30 text-amber-200 text-[11px] sm:text-xs font-medium tracking-normal sm:tracking-wide flex items-start sm:items-center justify-center gap-2 pointer-events-none opacity-90 transition-opacity text-center">
            <Crosshair className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0 mt-0.5 sm:mt-0" />
            <span className="min-w-0 whitespace-normal break-words leading-relaxed">
              অগ্নিবাণ ছুড়তে ক্যানভাসে বা &ldquo;অগ্নিবাণ ছোড়ো&rdquo; বোতামে ক্লিক করুন
            </span>
          </div>
        )}

        {/* Victory Banner Overlay */}
        {status === 'concluded' && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none">
            <div className="text-amber-400 text-xs font-semibold tracking-[0.25em] uppercase mb-2">
              শাশ্বত ধর্ম প্রতিষ্ঠিত
            </div>
            <div className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-wider glow-fire mb-3">
              ধর্মের জয়
            </div>
            <p className="text-neutral-300 text-sm max-w-md font-sans leading-relaxed">
              পবিত্র অগ্নিতে ভস্মীভূত হলো দশটি রিপু। সত্য, ন্যায় ও মানবতার জয় চিরন্তন।
            </p>
          </div>
        )}
      </div>

      {/* Primary Interaction Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0d0d14] border border-neutral-800/80 rounded-2xl">
        {/* Left: Main Action Triggers */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleLaunchArrow}
            disabled={status === 'flying' || status === 'burning' || status === 'exploding'}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 text-white font-cinzel font-semibold text-sm tracking-wider shadow-lg shadow-orange-900/40 hover:from-amber-500 hover:to-orange-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2.5 cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-200" />
            <span>অগ্নিবাণ ছোড়ো</span>
          </button>

          <button
            onClick={handleAim}
            disabled={status !== 'idle' && status !== 'concluded'}
            className="px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white hover:border-amber-600/60 font-medium text-xs tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-amber-400" />
            <span>ধনুক তোলো</span>
          </button>

          <button
            onClick={togglePlayPause}
            disabled={status === 'idle' || status === 'concluded'}
            className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
            aria-label={isPaused ? 'পুনরায় চালু করুন' : 'বিরতি দিন'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>

        {/* Right: Particle Density Mode */}
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span className="hidden sm:inline">স্ফুলিঙ্গের ঘনত্ব:</span>
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => handleDensityChange('standard')}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${particleDensity === 'standard' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              সাধারণ
            </button>
            <button
              onClick={() => handleDensityChange('cinematic')}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${particleDensity === 'cinematic' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              সর্বোচ্চ (সিনেমাটিক)
            </button>
          </div>
        </div>
      </div>

      {/* Ten Heads Purge Tracker Matrix */}
      <div className="p-4 bg-[#0a0a10] border border-neutral-900 rounded-xl">
        <div className="flex items-center justify-between mb-3 text-xs text-neutral-400">
          <span className="font-semibold text-neutral-300 tracking-wider font-cinzel">
            দশ রিপু বিনাশের অগ্রগতি ({explodedHeads.length}/১০)
          </span>
          <span className="text-[11px] text-amber-400/70">
            শ্রীরামের তীর অহংকারের প্রতিটি রূপকে বিনাশ করছে
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {TEN_VICES.map((vice, idx) => {
            const isPurged = explodedHeads.includes(idx);
            return (
              <div
                key={vice.id}
                className={`p-2.5 rounded-lg border text-xs transition-all ${
                  isPurged
                    ? 'bg-amber-950/20 border-amber-600/40 text-amber-200'
                    : 'bg-[#12121c] border-neutral-800/80 text-neutral-500'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`font-semibold truncate ${isPurged ? 'text-amber-300' : 'text-neutral-400'}`}>
                    {vice.sanskritName.split(' ')[0]}
                  </span>
                  {isPurged && (
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                  )}
                </div>
                <div className="text-[11px] truncate opacity-80">
                  {vice.englishName}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
