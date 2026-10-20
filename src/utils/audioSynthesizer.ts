/**
 * Pure Web Audio API Sound Synthesizer
 * Generates cinematic festival sound effects dynamically without external audio assets.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private fireNode: AudioBufferSourceNode | null = null;
  private fireGain: GainNode | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.fireGain) {
      this.fireGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Sound of drawing the divine Kodanda / Sharanga bowstring
   */
  public playBowDraw() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.6);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.7);
  }

  /**
   * Sound of releasing the divine flaming arrow with a whistling rush
   */
  public playArrowRelease() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // String snap
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(440, now);
    snapOsc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
    snapGain.gain.setValueAtTime(0.2, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    snapOsc.connect(snapGain);
    snapGain.connect(this.ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.15);

    // Whistling wind / whoosh
    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(3200, now + 0.35);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.75);
    filter.Q.value = 4.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.linearRampToValueAtTime(0.22, now + 0.2);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.8);
  }

  /**
   * Sound of the flaming arrow striking the navel: resonant explosion & shockwave
   */
  public playArrowImpact() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Deep sub-bass boom
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.9);

    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.9);

    // Divine metallic resonant strike
    const bellOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bellOsc.type = 'triangle';
    bellOsc.frequency.setValueAtTime(587.33, now); // D5
    bellGain.gain.setValueAtTime(0.18, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    bellOsc.connect(bellGain);
    bellGain.connect(this.ctx.destination);
    bellOsc.start(now);
    bellOsc.stop(now + 0.6);

    this.startFireAmbience();
  }

  /**
   * Realistic crackling and roaring fire loop
   */
  public startFireAmbience() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (this.fireNode) {
      return;
    }

    const duration = 5;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink / crackle noise approximation
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      let crackle = 0;
      // occasional random sparks
      if (Math.random() < 0.002) {
        crackle = (Math.random() - 0.5) * 1.8;
      }
      data[i] = (b0 + b1 + b2 + crackle) * 0.15;
    }

    this.fireNode = this.ctx.createBufferSource();
    this.fireNode.buffer = buffer;
    this.fireNode.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;

    this.fireGain = this.ctx.createGain();
    this.fireGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.fireGain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 1.2);

    this.fireNode.connect(filter);
    filter.connect(this.fireGain);
    this.fireGain.connect(this.ctx.destination);

    this.fireNode.start();
  }

  public stopFireAmbience() {
    if (this.fireGain && this.ctx) {
      this.fireGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
      setTimeout(() => {
        if (this.fireNode) {
          try {
            this.fireNode.stop();
            this.fireNode.disconnect();
          } catch {
            // Already stopped
          }
          this.fireNode = null;
        }
      }, 850);
    }
  }

  /**
   * Sound of crackers exploding in the effigy heads
   */
  public playFirecrackerBurst(pitchOffset = 0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(280 + pitchOffset, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  /**
   * Celestial triumph bell chords when Dharma is restored
   */
  public playVictoryChimes() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880]; // A major triumphant chord
    notes.forEach((freq, idx) => {
      const now = (this.ctx?.currentTime || 0) + idx * 0.12;
      const osc = this.ctx?.createOscillator();
      const gain = this.ctx?.createGain();
      if (!osc || !gain || !this.ctx) return;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.9);
    });
  }
}

export const soundSynth = new SoundSynthesizer();
