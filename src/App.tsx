/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { TopBar } from './components/navigation/TopBar';
import { HeroSection } from './components/hero/HeroSection';
import { InteractiveSection } from './components/interactive/InteractiveSection';
import { StorySection } from './components/story/StorySection';
import { Footer } from './components/footer/Footer';

export default function App() {
  const handleIgniteLegend = useCallback(() => {
    const el = document.getElementById('interactive');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    // Launch Rama's divine arrow once scrolled to the canvas
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('launch-divine-arrow'));
    }, 450);
  }, []);

  const scrollToStory = useCallback(() => {
    const el = document.getElementById('story');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#060609] text-[#f7f3ea] flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Bar Navigation Contract */}
      <TopBar onIgniteClick={handleIgniteLegend} />

      {/* Main Page Flow */}
      <main className="flex-1">
        {/* 1. Full-screen Cinematic Hero */}
        <HeroSection 
          onIgniteClick={handleIgniteLegend} 
          onStoryClick={scrollToStory} 
        />

        {/* 2. Interactive Ravana Dahan Canvas Experience */}
        <InteractiveSection />

        {/* 3. Editorial Story & Ten Heads Narrative */}
        <StorySection />
      </main>

      {/* 4. Minimal Dignified Footer */}
      <Footer />
    </div>
  );
}
