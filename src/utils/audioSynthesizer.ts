/**
 * Cinematic Web Audio API Sound Synthesizer for Ravana Dahan
 * Integrates real recorded audio assets:
 * 1. Corsair Firecracker (/assets/aistudio/freesound_community-firecracker-corsair-4-95046_ffc26d7d.mp3)
 *    -> Synchronized with each of Ravana's 10 heads exploding with spatial stereo panning.
 * 2. Loud Cinematic Explosion (/assets/aistudio/alex_jauk-loud-explosion-in-water-321247_8945b4a2.mp3)
 *    -> Deep navel impact shockwave & dramatic final effigy collapse destruction.
 * 3. Distant Firework Barrage (/assets/aistudio/freesound_community-distant-firework-barrage-aerial-cake-35808_e44d7587.mp3)
 *    -> Festive continuous firecracker & fireworks barrage playing as the effigy burns.
 *
 * For Bow & Arrow: Uses realistic physical synthesis (seasoned wood creaking, bowstring tension, snap & aerodynamic whoosh)
 * as explicitly instructed when attached audio files are explosion/fireworks rather than bow sounds.
 */

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL)
  ? (import.meta.env.BASE_URL.replace(/\/$/, '') + '/')
  : '/';

export const AUDIO_ASSET_PATHS = {
  firecracker: `${BASE_URL}assets/aistudio/freesound_community-firecracker-corsair-4-95046_ffc26d7d.mp3`,
  loudExplosion: `${BASE_URL}assets/aistudio/alex_jauk-loud-explosion-in-water-321247_8945b4a2.mp3`,
  fireworkBarrage: `${BASE_URL}assets/aistudio/freesound_community-distant-firework-barrage-aerial-cake-35808_e44d7587.mp3`,
};

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Real audio buffers
  private buffers: {
    firecracker: AudioBuffer | null;
    loudExplosion: AudioBuffer | null;
    fireworkBarrage: AudioBuffer | null;
  } = {
    firecracker: null,
    loudExplosion: null,
    fireworkBarrage: null,
  };
  private loadPromise: Promise<void> | null = null;

  // Firework barrage loop node
  private fireworkBarrageSource: AudioBufferSourceNode | null = null;
  private fireworkBarrageGain: GainNode | null = null;

  // Procedural flame ambience nodes
  private fireRumbleSource: AudioBufferSourceNode | null = null;
  private fireCrackleSource: AudioBufferSourceNode | null = null;
  private fireRumbleFilter: BiquadFilterNode | null = null;
  private fireCrackleFilter: BiquadFilterNode | null = null;
  private fireGain: GainNode | null = null;
  private fireIntensity: number = 0.25;
  private isFireActive: boolean = false;
  private woodPopIntervalId: number | null = null;

  constructor() {
    // Automatically start preloading audio files if window exists
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', () => this.initCtx(), { once: true });
      window.addEventListener('keydown', () => this.initCtx(), { once: true });
      // Proactively initiate download in background
      this.preloadAudio();
    }
  }

  public initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Master Limiter / Dynamics Compressor to prevent digital clipping & enhance punch
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(4.5, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.22, this.ctx.currentTime);

        // Master Gain balanced at 65% (0.65)
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime);

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.ctx && !this.loadPromise) {
      this.preloadAudio();
    }
  }

  public async preloadAudio(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        if (!this.ctx && typeof window !== 'undefined') {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            this.ctx = new AudioCtx();
          }
        }
        if (!this.ctx) return;

        const loadFile = async (url: string): Promise<AudioBuffer | null> => {
          try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const arrayBuffer = await resp.arrayBuffer();
            if (!this.ctx) return null;
            return await this.ctx.decodeAudioData(arrayBuffer);
          } catch (e) {
            console.warn(`[SoundSynthesizer] Note: Failed to decode audio at ${url}`, e);
            return null;
          }
        };

        const [firecrackerBuf, explosionBuf, barrageBuf] = await Promise.all([
          loadFile(AUDIO_ASSET_PATHS.firecracker),
          loadFile(AUDIO_ASSET_PATHS.loudExplosion),
          loadFile(AUDIO_ASSET_PATHS.fireworkBarrage),
        ]);

        this.buffers.firecracker = firecrackerBuf;
        this.buffers.loudExplosion = explosionBuf;
        this.buffers.fireworkBarrage = barrageBuf;
      } catch (err) {
        console.warn('[SoundSynthesizer] Preload warning:', err);
      }
    })();

    return this.loadPromise;
  }

  private getDestination(): AudioNode | null {
    this.initCtx();
    return this.compressor || (this.ctx ? this.ctx.destination : null);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.65, this.ctx.currentTime);
    }
    if (muted) {
      if (this.fireGain && this.ctx) {
        this.fireGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      if (this.fireworkBarrageGain && this.ctx) {
        this.fireworkBarrageGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    } else {
      if (this.isFireActive && this.ctx) {
        this.updateFireIntensity(this.fireIntensity);
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * 1. BOW DRAWING (Realistic physical wood creaking & string tension)
   */
  public playBowDraw() {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const drawDuration = 0.85;

    // A. Wood stave tension
    const woodOsc = ctx.createOscillator();
    const woodFilter = ctx.createBiquadFilter();
    const woodGain = ctx.createGain();

    woodOsc.type = 'triangle';
    woodOsc.frequency.setValueAtTime(82, now);
    woodOsc.frequency.exponentialRampToValueAtTime(118, now + drawDuration);

    woodFilter.type = 'bandpass';
    woodFilter.frequency.setValueAtTime(280, now);
    woodFilter.frequency.linearRampToValueAtTime(360, now + drawDuration);
    woodFilter.Q.setValueAtTime(3.5, now);

    woodGain.gain.setValueAtTime(0.001, now);
    woodGain.gain.linearRampToValueAtTime(0.08, now + 0.35);
    woodGain.gain.linearRampToValueAtTime(0.06, now + 0.7);
    woodGain.gain.exponentialRampToValueAtTime(0.0001, now + drawDuration);

    woodOsc.connect(woodFilter);
    woodFilter.connect(woodGain);
    woodGain.connect(dest);

    woodOsc.start(now);
    woodOsc.stop(now + drawDuration);

    // B. Wood micro-creaks: stick-slip friction
    const creakCount = 8;
    for (let i = 0; i < creakCount; i++) {
      const creakTime = now + 0.08 + (i * 0.08) + (Math.random() * 0.02);
      const creakDuration = 0.02 + Math.random() * 0.025;

      const bufferSize = Math.floor(ctx.sampleRate * creakDuration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.3));
      }

      const creakSource = ctx.createBufferSource();
      creakSource.buffer = buffer;

      const creakFilter = ctx.createBiquadFilter();
      creakFilter.type = 'bandpass';
      creakFilter.frequency.setValueAtTime(450 + Math.random() * 320, creakTime);
      creakFilter.Q.setValueAtTime(5.5, creakTime);

      const cGain = ctx.createGain();
      cGain.gain.setValueAtTime(0.035, creakTime);
      cGain.gain.exponentialRampToValueAtTime(0.001, creakTime + creakDuration);

      creakSource.connect(creakFilter);
      creakFilter.connect(cGain);
      cGain.connect(dest);

      creakSource.start(creakTime);
      creakSource.stop(creakTime + creakDuration);
    }
  }

  /**
   * 2. ARROW RELEASE (Sharp realistic string snap + aerodynamic flight whoosh)
   */
  public playArrowRelease() {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // A. Bowstring snap
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    const snapFilter = ctx.createBiquadFilter();

    snapOsc.type = 'sawtooth';
    snapOsc.frequency.setValueAtTime(196, now);
    snapOsc.frequency.exponentialRampToValueAtTime(175, now + 0.25);

    snapFilter.type = 'lowpass';
    snapFilter.frequency.setValueAtTime(950, now);
    snapFilter.frequency.exponentialRampToValueAtTime(260, now + 0.25);

    snapGain.gain.setValueAtTime(0.25, now);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

    snapOsc.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(dest);

    snapOsc.start(now);
    snapOsc.stop(now + 0.28);

    // B. Stave recoil thump
    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(130, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
    thumpGain.gain.setValueAtTime(0.22, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(dest);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.1);

    // C. Aerodynamic whoosh
    const whooshDuration = 0.55;
    const whooshBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * whooshDuration), ctx.sampleRate);
    const wData = whooshBuffer.getChannelData(0);
    for (let i = 0; i < wData.length; i++) {
      wData[i] = (Math.random() * 2 - 1) * 0.7;
    }

    const whooshSource = ctx.createBufferSource();
    whooshSource.buffer = whooshBuffer;

    const whooshFilter = ctx.createBiquadFilter();
    whooshFilter.type = 'bandpass';
    whooshFilter.frequency.setValueAtTime(1600, now + 0.02);
    whooshFilter.frequency.exponentialRampToValueAtTime(520, now + whooshDuration);
    whooshFilter.Q.setValueAtTime(2.8, now);

    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0.01, now);
    whooshGain.gain.linearRampToValueAtTime(0.24, now + 0.08);
    whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + whooshDuration);

    whooshSource.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(dest);

    whooshSource.start(now);
    whooshSource.stop(now + whooshDuration);
  }

  /**
   * 3. ARROW IMPACT AT NAVEL
   * Plays the sacred structural impact and triggers the real loud explosion shockwave
   * from attached file: alex_jauk-loud-explosion-in-water-321247_8945b4a2.mp3
   */
  public playArrowImpact() {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Use attached Loud Cinematic Explosion for the divine navel impact shockwave
    if (this.buffers.loudExplosion) {
      const expSource = ctx.createBufferSource();
      expSource.buffer = this.buffers.loudExplosion;

      const expGain = ctx.createGain();
      expGain.gain.setValueAtTime(0.65, now);

      expSource.connect(expGain);
      expGain.connect(dest);
      expSource.start(now);
    } else {
      // Sub-bass fallback
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(95, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.75);
      subGain.gain.setValueAtTime(0.45, now);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      subOsc.connect(subGain);
      subGain.connect(dest);
      subOsc.start(now);
      subOsc.stop(now + 0.85);
    }

    // Wood penetration & initial camphor flare
    const flareDuration = 0.5;
    const flareBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * flareDuration), ctx.sampleRate);
    const fData = flareBuffer.getChannelData(0);
    for (let i = 0; i < fData.length; i++) {
      fData[i] = Math.random() * 2 - 1;
    }

    const flareSource = ctx.createBufferSource();
    flareSource.buffer = flareBuffer;

    const flareFilter = ctx.createBiquadFilter();
    flareFilter.type = 'bandpass';
    flareFilter.frequency.setValueAtTime(420, now);
    flareFilter.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
    flareFilter.Q.setValueAtTime(2.2, now);

    const flareGain = ctx.createGain();
    flareGain.gain.setValueAtTime(0.02, now);
    flareGain.gain.linearRampToValueAtTime(0.26, now + 0.1);
    flareGain.gain.exponentialRampToValueAtTime(0.0001, now + flareDuration);

    flareSource.connect(flareFilter);
    flareFilter.connect(flareGain);
    flareGain.connect(dest);
    flareSource.start(now);
    flareSource.stop(now + flareDuration);

    // Start continuous realistic fire & festive firework barrage
    this.startFireAmbience();
  }

  /**
   * 4. HEAD EXPLOSIONS (Synchronized with each of Ravana's 10 heads)
   * Uses attached real firecracker: freesound_community-firecracker-corsair-4-95046_ffc26d7d.mp3
   * Fully polyphonic (does not cut off prior explosions) with spatial panning across the 10 heads!
   */
  public playHeadExplosion(headIndex: number, pan: number = 0) {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Stereo Panner for spatial placement of each head across the screen
    let panner: StereoPannerNode | null = null;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, pan)), now);
      panner.connect(dest);
    }
    const nodeDest: AudioNode = panner || dest;

    // Is this the giant central Ahankara head? (index 4 or 5)
    const isCentralHead = headIndex === 4 || headIndex === 5;

    // Play attached real Corsair Firecracker
    if (this.buffers.firecracker) {
      const crackerSource = ctx.createBufferSource();
      crackerSource.buffer = this.buffers.firecracker;

      // Natural pitch & speed variation per head so every head has authentic organic character
      const pitchVariance = 0.94 + (headIndex % 6) * 0.035;
      crackerSource.playbackRate.setValueAtTime(pitchVariance, now);

      const crackerGain = ctx.createGain();
      // Balanced volume around 65% (0.65)
      crackerGain.gain.setValueAtTime(isCentralHead ? 0.72 : 0.65, now);

      crackerSource.connect(crackerGain);
      crackerGain.connect(nodeDest);
      crackerSource.start(now);
    } else {
      // Procedural fallback if buffer still loading
      this.playSynthesizedCrackerFallback(nodeDest, isCentralHead);
    }

    // For the grand central head, layer extra low-end combustion body
    if (isCentralHead) {
      const subBoom = ctx.createOscillator();
      const subBoomGain = ctx.createGain();
      subBoom.type = 'triangle';
      subBoom.frequency.setValueAtTime(90, now);
      subBoom.frequency.exponentialRampToValueAtTime(32, now + 0.35);

      subBoomGain.gain.setValueAtTime(0.35, now);
      subBoomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      subBoom.connect(subBoomGain);
      subBoomGain.connect(nodeDest);
      subBoom.start(now);
      subBoom.stop(now + 0.4);
    }
  }

  private playSynthesizedCrackerFallback(nodeDest: AudioNode, isCentralHead: boolean) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const clapDuration = 0.08;
    const clapBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * clapDuration), ctx.sampleRate);
    const clData = clapBuffer.getChannelData(0);
    for (let i = 0; i < clData.length; i++) {
      clData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
    }
    const clapSource = ctx.createBufferSource();
    clapSource.buffer = clapBuffer;
    const clapGain = ctx.createGain();
    clapGain.gain.setValueAtTime(isCentralHead ? 0.45 : 0.35, now);
    clapGain.gain.exponentialRampToValueAtTime(0.0001, now + clapDuration);
    clapSource.connect(clapGain);
    clapGain.connect(nodeDest);
    clapSource.start(now);
    clapSource.stop(now + clapDuration);
  }

  public playFirecrackerBurst(pitchOffset: number = 0, pan: number = 0) {
    const virtualHeadIndex = Math.floor(Math.abs(pitchOffset / 40)) % 10;
    this.playHeadExplosion(virtualHeadIndex, pan);
  }

  /**
   * 5. FINAL EFFIGY DESTRUCTION & COLLAPSE
   * Triggered when all 10 heads have exploded and the effigy collapses into the flames.
   * Uses attached loud explosion: alex_jauk-loud-explosion-in-water-321247_8945b4a2.mp3
   */
  public playFinalExplosion() {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (this.buffers.loudExplosion) {
      const expSource = ctx.createBufferSource();
      expSource.buffer = this.buffers.loudExplosion;

      const expGain = ctx.createGain();
      expGain.gain.setValueAtTime(0.70, now);

      expSource.connect(expGain);
      expGain.connect(dest);
      expSource.start(now);
    }
  }

  /**
   * 6. FIRE AMBIENCE & CONTINUOUS FESTIVE FIREWORK BARRAGE
   * Uses attached file: freesound_community-distant-firework-barrage-aerial-cake-35808_e44d7587.mp3
   * Seamlessly layered with realistic wood crackle and low combustion rumble.
   */
  public startFireAmbience() {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    if (this.isFireActive) return;
    this.isFireActive = true;
    this.fireIntensity = 0.25;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // A. Attached Distant Firework Barrage / Aerial Cake Audio
    if (this.buffers.fireworkBarrage) {
      this.fireworkBarrageSource = ctx.createBufferSource();
      this.fireworkBarrageSource.buffer = this.buffers.fireworkBarrage;
      this.fireworkBarrageSource.loop = true;

      this.fireworkBarrageGain = ctx.createGain();
      this.fireworkBarrageGain.gain.setValueAtTime(0.01, now);
      this.fireworkBarrageGain.gain.linearRampToValueAtTime(0.35, now + 1.2);

      this.fireworkBarrageSource.connect(this.fireworkBarrageGain);
      this.fireworkBarrageGain.connect(dest);
      this.fireworkBarrageSource.start(now);
    }

    // B. Low combustion rumble & crackle bed
    const loopDuration = 6.0;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * loopDuration);

    this.fireGain = ctx.createGain();
    this.fireGain.gain.setValueAtTime(0.01, now);
    this.fireGain.gain.linearRampToValueAtTime(0.18, now + 1.0);
    this.fireGain.connect(dest);

    const rumbleBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const rData = rumbleBuffer.getChannelData(0);
    let lastRumble = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastRumble = (lastRumble + (0.025 * white)) / 1.025;
      rData[i] = lastRumble * 2.5;
    }

    this.fireRumbleSource = ctx.createBufferSource();
    this.fireRumbleSource.buffer = rumbleBuffer;
    this.fireRumbleSource.loop = true;

    this.fireRumbleFilter = ctx.createBiquadFilter();
    this.fireRumbleFilter.type = 'lowpass';
    this.fireRumbleFilter.frequency.setValueAtTime(260, now);

    this.fireRumbleSource.connect(this.fireRumbleFilter);
    this.fireRumbleFilter.connect(this.fireGain);
    this.fireRumbleSource.start();

    // Wood crackle bed
    const crackleBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const cData = crackleBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      let val = (Math.random() * 2 - 1) * 0.1;
      if (Math.random() < 0.015) {
        val += (Math.random() - 0.5) * 0.8;
      }
      cData[i] = val;
    }

    this.fireCrackleSource = ctx.createBufferSource();
    this.fireCrackleSource.buffer = crackleBuffer;
    this.fireCrackleSource.loop = true;

    this.fireCrackleFilter = ctx.createBiquadFilter();
    this.fireCrackleFilter.type = 'bandpass';
    this.fireCrackleFilter.frequency.setValueAtTime(1400, now);
    this.fireCrackleFilter.Q.setValueAtTime(1.5, now);

    this.fireCrackleSource.connect(this.fireCrackleFilter);
    this.fireCrackleFilter.connect(this.fireGain);
    this.fireCrackleSource.start();

    // Intermittent natural wood pops
    this.scheduleWoodPops();
  }

  private scheduleWoodPops() {
    if (this.woodPopIntervalId) {
      clearInterval(this.woodPopIntervalId);
    }

    const triggerNextPop = () => {
      if (!this.isFireActive || this.isMuted || !this.ctx || !this.fireGain) return;

      this.playSingleWoodPop();

      const nextDelay = 180 + Math.random() * (450 * (1.1 - this.fireIntensity));
      this.woodPopIntervalId = window.setTimeout(triggerNextPop, nextDelay);
    };

    this.woodPopIntervalId = window.setTimeout(triggerNextPop, 200);
  }

  private playSingleWoodPop() {
    if (!this.ctx || !this.fireGain || this.isMuted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const popDuration = 0.025;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * popDuration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.2));
    }

    const popSource = ctx.createBufferSource();
    popSource.buffer = buffer;

    const popFilter = ctx.createBiquadFilter();
    popFilter.type = 'bandpass';
    popFilter.frequency.setValueAtTime(1000 + Math.random() * 1500, now);
    popFilter.Q.setValueAtTime(5.0, now);

    const popGain = ctx.createGain();
    const gainVal = (0.04 + Math.random() * 0.06) * (0.6 + this.fireIntensity * 0.6);
    popGain.gain.setValueAtTime(gainVal, now);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + popDuration);

    popSource.connect(popFilter);
    popFilter.connect(popGain);
    popGain.connect(this.fireGain);

    popSource.start(now);
    popSource.stop(now + popDuration);
  }

  public updateFireIntensity(burnProgress: number) {
    if (!this.isFireActive || !this.ctx) return;
    this.fireIntensity = Math.min(1.0, Math.max(0.1, burnProgress));

    const now = this.ctx.currentTime;

    // Swell firework barrage gain up to 0.65 as flames consume the effigy
    if (this.fireworkBarrageGain) {
      const targetBarrage = 0.35 + this.fireIntensity * 0.30;
      this.fireworkBarrageGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : targetBarrage, now + 0.3);
    }

    // Swell base fire gain
    if (this.fireGain) {
      const targetFire = 0.12 + this.fireIntensity * 0.18;
      this.fireGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : targetFire, now + 0.3);
    }

    if (this.fireRumbleFilter) {
      const rumbleFreq = 220 + this.fireIntensity * 280;
      this.fireRumbleFilter.frequency.linearRampToValueAtTime(rumbleFreq, now + 0.3);
    }
  }

  public stopFireAmbience() {
    this.isFireActive = false;
    if (this.woodPopIntervalId) {
      clearTimeout(this.woodPopIntervalId);
      this.woodPopIntervalId = null;
    }

    if (this.ctx) {
      const now = this.ctx.currentTime;

      if (this.fireworkBarrageGain) {
        this.fireworkBarrageGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
      }
      if (this.fireGain) {
        this.fireGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
      }

      setTimeout(() => {
        if (this.fireworkBarrageSource) {
          try {
            this.fireworkBarrageSource.stop();
            this.fireworkBarrageSource.disconnect();
          } catch { /* already stopped */ }
          this.fireworkBarrageSource = null;
        }
        if (this.fireworkBarrageGain) {
          try {
            this.fireworkBarrageGain.disconnect();
          } catch { /* ignored */ }
          this.fireworkBarrageGain = null;
        }
        if (this.fireRumbleSource) {
          try {
            this.fireRumbleSource.stop();
            this.fireRumbleSource.disconnect();
          } catch { /* ignored */ }
          this.fireRumbleSource = null;
        }
        if (this.fireCrackleSource) {
          try {
            this.fireCrackleSource.stop();
            this.fireCrackleSource.disconnect();
          } catch { /* ignored */ }
          this.fireCrackleSource = null;
        }
        if (this.fireGain) {
          try {
            this.fireGain.disconnect();
          } catch { /* ignored */ }
          this.fireGain = null;
        }
      }, 650);
    }
  }

  /**
   * Sky Firework Burst
   */
  public playSkyFirework(pan: number = 0) {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    let panner: StereoPannerNode | null = null;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-0.8, Math.min(0.8, pan)), now);
      panner.connect(dest);
    }
    const nodeDest = panner || dest;

    // Aerial sky pop
    const boomOsc = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boomOsc.type = 'triangle';
    boomOsc.frequency.setValueAtTime(140, now);
    boomOsc.frequency.exponentialRampToValueAtTime(42, now + 0.4);
    boomGain.gain.setValueAtTime(0.28, now);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    boomOsc.connect(boomGain);
    boomGain.connect(nodeDest);
    boomOsc.start(now);
    boomOsc.stop(now + 0.46);

    // Willow sparkle shimmer
    const shimmerDuration = 0.75;
    const shimmerBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * shimmerDuration), ctx.sampleRate);
    const sData = shimmerBuffer.getChannelData(0);
    for (let i = 0; i < sData.length; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * 0.28));
      const sparkle = Math.random() < 0.08 ? 1.5 : 0.3;
      sData[i] = (Math.random() * 2 - 1) * decay * sparkle;
    }

    const shimmerSource = ctx.createBufferSource();
    shimmerSource.buffer = shimmerBuffer;

    const shimmerFilter = ctx.createBiquadFilter();
    shimmerFilter.type = 'bandpass';
    shimmerFilter.frequency.setValueAtTime(2600, now);
    shimmerFilter.Q.setValueAtTime(3.2, now);

    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.01, now);
    shimmerGain.gain.linearRampToValueAtTime(0.18, now + 0.06);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + shimmerDuration);

    shimmerSource.connect(shimmerFilter);
    shimmerFilter.connect(shimmerGain);
    shimmerGain.connect(nodeDest);
    shimmerSource.start(now);
    shimmerSource.stop(now + shimmerDuration);
  }

  /**
   * Sacred bronze temple bell (Ghanta) victory chimes
   */
  public playVictoryChimes() {
    if (this.isMuted) return;
    const dest = this.getDestination();
    if (!this.ctx || !dest) return;

    const ctx = this.ctx;
    const bellPitches = [293.66, 440, 587.33, 739.99, 880];

    bellPitches.forEach((freq, idx) => {
      const chimeTime = (ctx.currentTime || 0) + idx * 0.16;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, chimeTime);

      gain.gain.setValueAtTime(0.001, chimeTime);
      gain.gain.linearRampToValueAtTime(0.14, chimeTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, chimeTime + 2.8);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(chimeTime);
      osc.stop(chimeTime + 2.9);

      const overtoneOsc = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtoneOsc.type = 'sine';
      overtoneOsc.frequency.setValueAtTime(freq * 2.76, chimeTime);

      overtoneGain.gain.setValueAtTime(0.001, chimeTime);
      overtoneGain.gain.linearRampToValueAtTime(0.04, chimeTime + 0.015);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, chimeTime + 1.2);

      overtoneOsc.connect(overtoneGain);
      overtoneGain.connect(dest);
      overtoneOsc.start(chimeTime);
      overtoneOsc.stop(chimeTime + 1.3);
    });
  }
}

export const soundSynth = new SoundSynthesizer();
