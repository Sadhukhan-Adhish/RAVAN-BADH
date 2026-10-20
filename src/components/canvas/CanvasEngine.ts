/**
 * Cinematic Ravana Dahan Canvas Engine
 * Decoupled HTML5 Canvas particle & effigy simulation with procedural rendering.
 */

import { AnimationStatus } from '../../types';
import { soundSynth } from '../../utils/audioSynthesizer';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  gravity?: number;
  type: 'flame' | 'smoke' | 'spark' | 'cracker' | 'firework';
}

interface FireworkExplosion {
  x: number;
  y: number;
  color: string;
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;

  // Canvas bounds & layout
  private width: number = 800;
  private height: number = 600;
  private dpr: number = 1;

  // State
  private status: AnimationStatus = 'idle';
  private onStatusChange?: (status: AnimationStatus) => void;
  private onHeadExplode?: (headId: number) => void;
  private isPaused: boolean = false;
  private playbackSpeed: number = 1.0;
  private particleDensityMultiplier: number = 1.0;

  // Arrow physics
  private bowX: number = 100;
  private bowY: number = 420;
  private arrowX: number = 100;
  private arrowY: number = 420;
  private arrowVx: number = 0;
  private arrowVy: number = 0;
  private targetX: number = 550;
  private targetY: number = 380;
  private arrowAngle: number = 0;
  private isArrowActive: boolean = false;
  private bowPull: number = 1.0; // 1 = drawn, 0 = released

  // Lord Rama positioning & stance attributes
  private ramaX: number = 140;
  private ramaY: number = 520;
  private ramaScale: number = 1.0;
  private stringVibration: number = 0;

  // Effigy geometry & burn progression
  private effigyX: number = 550;
  private effigyY: number = 520; // Ground base
  private effigyScale: number = 1.0;
  private burnProgress: number = 0; // 0 to 1
  private collapseProgress: number = 0; // 0 to 1
  private burnedHeads: boolean[] = new Array(10).fill(false);
  private headExplodeTimer: number = 0;
  private nextHeadToBurn: number = 0;

  // Particle systems
  private particles: Particle[] = [];
  private fireworks: FireworkExplosion[] = [];
  private ambientEmbers: { x: number; y: number; vy: number; vx: number; size: number; alpha: number }[] = [];

  // Shockwave ring
  private shockwaves: { x: number; y: number; radius: number; maxRadius: number; alpha: number; color: string }[] = [];

  constructor() {
    this.initAmbientEmbers();
  }

  public mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.handleResize();
    this.reset();
    this.startLoop();
  }

  public unmount() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    soundSynth.stopFireAmbience();
  }

  public setStatusCallback(cb: (status: AnimationStatus) => void) {
    this.onStatusChange = cb;
  }

  public setHeadExplodeCallback(cb: (headId: number) => void) {
    this.onHeadExplode = cb;
  }

  public setSpeed(speed: number) {
    this.playbackSpeed = speed;
  }

  public setParticleDensity(density: 'standard' | 'cinematic') {
    this.particleDensityMultiplier = density === 'cinematic' ? 1.5 : 0.8;
  }

  public getStatus(): AnimationStatus {
    return this.status;
  }

  public handleResize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this.dpr, this.dpr);
    }

    // Dynamic placement based on viewport aspect
    const isMobile = this.width < 768;
    this.effigyScale = Math.min(this.width / 880, this.height / 580) * (isMobile ? 0.90 : 1.10);
    this.effigyScale = Math.max(0.60, Math.min(1.35, this.effigyScale));

    this.effigyX = isMobile ? this.width * 0.74 : this.width * 0.68;
    this.effigyY = this.height * 0.88;

    // Navel target coordinates
    this.targetX = this.effigyX;
    this.targetY = this.effigyY - 145 * this.effigyScale;

    // Lord Rama positioning (Left side, standing firmly on the ground)
    this.ramaScale = this.effigyScale * 0.92;
    this.ramaX = isMobile ? this.width * 0.16 : this.width * 0.18;
    this.ramaY = this.effigyY;

    // Bow grip position relative to Rama's extended left hand
    this.bowX = this.ramaX + 44 * this.ramaScale;
    this.bowY = this.ramaY - 108 * this.ramaScale;

    const dx = this.targetX - this.bowX;
    const dy = this.targetY - this.bowY;
    this.arrowAngle = Math.atan2(dy, dx);

    if (this.status === 'idle') {
      this.arrowX = this.bowX;
      this.arrowY = this.bowY;
      this.bowPull = 1.0;
    }
  }

  private initAmbientEmbers() {
    this.ambientEmbers = [];
    for (let i = 0; i < 45; i++) {
      this.ambientEmbers.push({
        x: Math.random() * 1000,
        y: Math.random() * 800,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.4 - Math.random() * 0.8,
        size: 1 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.7,
      });
    }
  }

  public startAiming() {
    if (this.status !== 'idle' && this.status !== 'concluded') return;
    this.reset();
    this.status = 'aiming';
    this.onStatusChange?.('aiming');
    this.bowPull = 1.0;
    soundSynth.playBowDraw();
  }

  public launchArrow() {
    if (this.status === 'flying' || this.status === 'burning' || this.status === 'exploding') return;
    if (this.status === 'concluded') {
      this.reset();
    }
    this.status = 'flying';
    this.onStatusChange?.('flying');
    this.bowPull = 0.0; // string snaps forward
    this.stringVibration = 1.0;

    this.arrowX = this.bowX;
    this.arrowY = this.bowY;
    this.isArrowActive = true;

    // Calculate arc towards target
    const dx = this.targetX - this.bowX;
    const dy = this.targetY - this.bowY;
    const distance = Math.hypot(dx, dy);
    const speed = (distance / 38) * this.playbackSpeed; // Swift flight

    this.arrowVx = (dx / distance) * speed;
    this.arrowVy = (dy / distance) * speed - 1.2; // slight loft
    this.arrowAngle = Math.atan2(this.arrowVy, this.arrowVx);

    soundSynth.playArrowRelease();
  }

  public reset() {
    this.status = 'idle';
    this.onStatusChange?.('idle');
    this.burnProgress = 0;
    this.collapseProgress = 0;
    this.burnedHeads.fill(false);
    this.nextHeadToBurn = 0;
    this.headExplodeTimer = 0;
    this.particles = [];
    this.shockwaves = [];
    this.fireworks = [];
    this.isArrowActive = false;
    this.bowPull = 1.0; // Rama stands poised with bow drawn
    this.stringVibration = 0;
    this.arrowX = this.bowX;
    this.arrowY = this.bowY;
    const dx = this.targetX - this.bowX;
    const dy = this.targetY - this.bowY;
    this.arrowAngle = Math.atan2(dy, dx);
    soundSynth.stopFireAmbience();
  }

  public togglePlayPause() {
    this.isPaused = !this.isPaused;
  }

  private startLoop() {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (!this.isPaused) {
        this.update(dt * this.playbackSpeed);
      }
      this.draw();

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private update(dt: number) {
    // 1. Update ambient background embers
    for (const ember of this.ambientEmbers) {
      ember.y += ember.vy * 60 * dt;
      ember.x += ember.vx * 60 * dt + Math.sin(ember.y * 0.02) * 0.4;
      if (ember.y < -20) {
        ember.y = this.height + 20;
        ember.x = Math.random() * this.width;
      }
    }

    // Decay string vibration
    if (this.stringVibration > 0) {
      this.stringVibration = Math.max(0, this.stringVibration - 4.0 * dt);
    }

    // Subtle golden sparks at arrow tip when poised on Rama's drawn bow
    if ((this.status === 'idle' || this.status === 'aiming') && Math.random() < 0.28) {
      const tipDist = 58 * this.ramaScale;
      const tipX = this.bowX + Math.cos(this.arrowAngle) * tipDist;
      const tipY = this.bowY + Math.sin(this.arrowAngle) * tipDist;
      this.particles.push({
        x: tipX + (Math.random() - 0.5) * 6,
        y: tipY + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -0.8 - Math.random() * 1.5,
        size: 1.5 + Math.random() * 2.5,
        color: Math.random() > 0.4 ? '#fbbf24' : '#ff5722',
        alpha: 0.85,
        decay: 0.038,
        type: 'spark',
      });
    }

    // 2. Arrow physics in flight
    if (this.status === 'flying' && this.isArrowActive) {
      this.arrowX += this.arrowVx * 60 * dt;
      this.arrowY += this.arrowVy * 60 * dt;
      // Gravity curve
      this.arrowVy += 0.05 * 60 * dt;
      this.arrowAngle = Math.atan2(this.arrowVy, this.arrowVx);

      // Trailing sparks & divine sacred wake
      const count = Math.floor(5 * this.particleDensityMultiplier);
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: this.arrowX - Math.cos(this.arrowAngle) * (i * 6),
          y: this.arrowY - Math.sin(this.arrowAngle) * (i * 6),
          vx: -this.arrowVx * 0.12 + (Math.random() - 0.5) * 2.0,
          vy: -this.arrowVy * 0.12 + (Math.random() - 0.5) * 2.0,
          size: 1.8 + Math.random() * 3.2,
          color: Math.random() > 0.35 ? '#ffd700' : '#ff5722',
          alpha: 0.95,
          decay: 0.03 + Math.random() * 0.02,
          type: 'spark',
        });
      }

      // Check impact at target
      const distToTarget = Math.hypot(this.arrowX - this.targetX, this.arrowY - this.targetY);
      if (distToTarget < 22 || this.arrowX >= this.targetX) {
        this.triggerImpact();
      }
    }

    // 3. Burn progression
    if (this.status === 'burning' || this.status === 'exploding') {
      this.burnProgress = Math.min(1.0, this.burnProgress + 0.12 * dt);

      // Spawn rising flames from navel and body
      const flameSpawnRate = Math.floor(6 * this.particleDensityMultiplier);
      for (let i = 0; i < flameSpawnRate; i++) {
        const spreadY = (1 - this.burnProgress) * 40;
        const flameOriginY = this.targetY + spreadY - Math.random() * (this.burnProgress * 180 * this.effigyScale);
        const flameOriginX = this.effigyX + (Math.random() - 0.5) * (60 * this.effigyScale * (1 + this.burnProgress));

        this.particles.push({
          x: flameOriginX,
          y: flameOriginY,
          vx: (Math.random() - 0.5) * 1.6,
          vy: -2.5 - Math.random() * 4.5,
          size: 10 + Math.random() * 18 * this.effigyScale,
          color: Math.random() > 0.3 ? '#ff5722' : '#f59e0b',
          alpha: 0.85,
          decay: 0.028 + Math.random() * 0.02,
          type: 'flame',
        });

        // Occasional rising smoke
        if (Math.random() < 0.25) {
          this.particles.push({
            x: flameOriginX + (Math.random() - 0.5) * 20,
            y: flameOriginY - 20,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -1.2 - Math.random() * 1.8,
            size: 18 + Math.random() * 25 * this.effigyScale,
            color: '#1f1f2e',
            alpha: 0.45,
            decay: 0.012,
            type: 'smoke',
          });
        }
      }

      // Transition to exploding crackers phase
      if (this.burnProgress > 0.35 && this.status === 'burning') {
        this.status = 'exploding';
        this.onStatusChange?.('exploding');
      }

      // Sequential head explosions
      if (this.status === 'exploding') {
        this.headExplodeTimer += dt;
        if (this.headExplodeTimer > 0.38 && this.nextHeadToBurn < 10) {
          this.headExplodeTimer = 0;
          this.explodeHead(this.nextHeadToBurn);
          this.nextHeadToBurn++;
        }

        // Post-all-heads collapse and sky fireworks
        if (this.nextHeadToBurn >= 10 && this.burnProgress >= 0.95) {
          this.collapseProgress = Math.min(1.0, this.collapseProgress + 0.2 * dt);
          if (this.collapseProgress >= 1.0) {
            this.status = 'concluded';
            this.onStatusChange?.('concluded');
            soundSynth.playVictoryChimes();
          }

          // Random celebratory sky fireworks
          if (Math.random() < 0.12) {
            this.launchRandomSkyFirework();
          }
        }
      }
    }

    // 4. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;
      if (p.gravity) {
        p.vy += p.gravity * 60 * dt;
      }
      p.alpha -= p.decay * 60 * dt;

      if (p.type === 'flame') {
        p.size *= 0.985;
      } else if (p.type === 'smoke') {
        p.size *= 1.015;
      }

      if (p.alpha <= 0.01) {
        this.particles.splice(i, 1);
      }
    }

    // 5. Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += 180 * dt;
      sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
      if (sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private triggerImpact() {
    this.status = 'impact';
    this.onStatusChange?.('impact');
    this.isArrowActive = false;
    this.arrowX = this.targetX;
    this.arrowY = this.targetY;

    // Divine shockwaves
    this.shockwaves.push({
      x: this.targetX,
      y: this.targetY,
      radius: 5,
      maxRadius: 180 * this.effigyScale,
      alpha: 1.0,
      color: '#ffd700',
    });
    this.shockwaves.push({
      x: this.targetX,
      y: this.targetY,
      radius: 5,
      maxRadius: 260 * this.effigyScale,
      alpha: 0.8,
      color: '#ff5722',
    });

    // Intense impact spark burst
    const count = Math.floor(70 * this.particleDensityMultiplier);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      this.particles.push({
        x: this.targetX,
        y: this.targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.4 ? '#ffd700' : '#ff7a00',
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.02,
        gravity: 0.12,
        type: 'cracker',
      });
    }

    soundSynth.playArrowImpact();

    // Transition immediately to burning
    setTimeout(() => {
      if (this.status === 'impact') {
        this.status = 'burning';
        this.onStatusChange?.('burning');
      }
    }, 250);
  }

  private explodeHead(index: number) {
    this.burnedHeads[index] = true;
    this.onHeadExplode?.(index);

    // Calculate approximate head coordinate on canvas
    const headOffsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
    const offset = headOffsets[index];
    const headX = this.effigyX + offset * (26 * this.effigyScale);
    const headY = this.effigyY - (offset === 0 ? 305 : 285) * this.effigyScale;

    // Head cracker burst sound with pitch variation
    soundSynth.playFirecrackerBurst((index % 5) * 40);

    // Crackers exploding from head
    const colors = ['#f59e0b', '#ef4444', '#10b981', '#38bdf8', '#fbbf24', '#e11d48'];
    const burstColor = colors[index % colors.length];

    const sparkCount = Math.floor(45 * this.particleDensityMultiplier);
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 7;
      this.particles.push({
        x: headX,
        y: headY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 2 + Math.random() * 3,
        color: burstColor,
        alpha: 1.0,
        decay: 0.025 + Math.random() * 0.02,
        gravity: 0.14,
        type: 'cracker',
      });
    }

    // Expanding head shockwave
    this.shockwaves.push({
      x: headX,
      y: headY,
      radius: 4,
      maxRadius: 75 * this.effigyScale,
      alpha: 0.9,
      color: burstColor,
    });
  }

  private launchRandomSkyFirework() {
    const fwX = this.width * 0.2 + Math.random() * (this.width * 0.6);
    const fwY = this.height * 0.12 + Math.random() * (this.height * 0.3);
    const colors = ['#fbbf24', '#ef4444', '#22c55e', '#a855f7', '#38bdf8', '#f97316'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    soundSynth.playFirecrackerBurst(120);

    const count = Math.floor(60 * this.particleDensityMultiplier);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5.5;
      this.particles.push({
        x: fwX,
        y: fwY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2.5,
        color: color,
        alpha: 1.0,
        decay: 0.018 + Math.random() * 0.015,
        gravity: 0.08,
        type: 'firework',
      });
    }
  }

  // --- RENDERING ROUTINES ---

  private draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Clear background with rich atmospheric twilight gradient
    ctx.clearRect(0, 0, this.width, this.height);

    // Deep midnight sky backdrop
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#06060c');
    skyGrad.addColorStop(0.6, '#0b0a14');
    skyGrad.addColorStop(1, '#180f12');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Festive ground plane (fairground / Ramlila maidan)
    this.drawGround(ctx);

    // Ambient floating night embers
    this.drawAmbientEmbers(ctx);

    // Shockwaves
    this.drawShockwaves(ctx);

    // Draw Ravana Effigy (Dashanana)
    this.drawRavanaEffigy(ctx);

    // Draw Lord Rama and the Divine Kodanda Bow / Arrow
    this.drawLordRamaAndBow(ctx);

    // Draw Particles (Flames, Cracker bursts, Smoke)
    this.drawParticles(ctx);

    // Vignette lighting scrim for cinematic focus
    this.drawVignette(ctx);
  }

  private drawGround(ctx: CanvasRenderingContext2D) {
    const groundY = this.height * 0.88;
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, this.height);
    groundGrad.addColorStop(0, '#1a1412');
    groundGrad.addColorStop(0.3, '#100c0b');
    groundGrad.addColorStop(1, '#080605');

    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, this.width, this.height - groundY);

    // Ground edge hairline illumination
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(this.width, groundY);
    ctx.stroke();

    // Small festive spectator silhouettes along bottom edge for scale
    ctx.fillStyle = '#060506';
    for (let x = 10; x < this.width; x += 38) {
      const h = 8 + (Math.sin(x * 12) + 1) * 6;
      ctx.beginPath();
      ctx.ellipse(x, groundY + 8, 4, h, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawAmbientEmbers(ctx: CanvasRenderingContext2D) {
    for (const ember of this.ambientEmbers) {
      ctx.fillStyle = `rgba(251, 191, 36, ${ember.alpha})`;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawShockwaves(ctx: CanvasRenderingContext2D) {
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = sw.alpha;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Procedural rendering of the colossal Ten-Headed Ravana effigy
   */
  private drawRavanaEffigy(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const s = this.effigyScale;
    const x = this.effigyX;
    const groundY = this.effigyY;

    // Apply collapse displacement if in concluded state
    const collapseY = this.collapseProgress * (60 * s);
    ctx.translate(x, groundY + collapseY);

    // Opacity fades as it turns to sacred ash
    const effigyAlpha = Math.max(0.08, 1 - this.collapseProgress * 0.9);
    ctx.globalAlpha = effigyAlpha;

    // 1. Wooden bamboo scaffold base & pedestals
    ctx.fillStyle = '#2d1d17';
    ctx.fillRect(-70 * s, -20 * s, 140 * s, 20 * s);
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(-70 * s, -20 * s, 140 * s, 20 * s);

    // Diagonal bamboo support braces
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
    ctx.beginPath();
    ctx.moveTo(-60 * s, -20 * s);
    ctx.lineTo(0, -90 * s);
    ctx.lineTo(60 * s, -20 * s);
    ctx.stroke();

    // 2. Ceremonial Royal Dhoti / Skirt (Traditional Dussehra red & gold paper craft)
    const skirtBurn = Math.min(1.0, this.burnProgress * 1.5);
    ctx.fillStyle = skirtBurn > 0.7 ? '#1f1311' : '#881337'; // Rose / crimson
    ctx.beginPath();
    ctx.moveTo(-50 * s, -140 * s);
    ctx.lineTo(50 * s, -140 * s);
    ctx.lineTo(65 * s, -20 * s);
    ctx.lineTo(-65 * s, -20 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d97706'; // Gold fringe
    ctx.lineWidth = 3 * s;
    ctx.stroke();

    // Gold borders on skirt
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(-60 * s, -30 * s);
    ctx.lineTo(60 * s, -30 * s);
    ctx.stroke();

    // 3. Royal Armor Torso
    const torsoBurn = Math.min(1.0, Math.max(0, (this.burnProgress - 0.1) * 1.5));
    ctx.fillStyle = torsoBurn > 0.6 ? '#1c1917' : '#1e1b4b'; // Deep royal indigo
    ctx.beginPath();
    ctx.moveTo(-55 * s, -240 * s); // Shoulders
    ctx.lineTo(55 * s, -240 * s);
    ctx.lineTo(45 * s, -140 * s);  // Waist
    ctx.lineTo(-45 * s, -140 * s);
    ctx.closePath();
    ctx.fill();

    // Golden Armor Breastplate (Kavach)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3 * s;
    ctx.stroke();

    // Ornate Golden Necklaces (Harams)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(0, -225 * s, 28 * s, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -220 * s, 36 * s, 0.25, Math.PI - 0.25);
    ctx.stroke();

    // 4. Arms with Weapons (Sword in right hand, Bow in left)
    // Left Arm (holding bow)
    ctx.strokeStyle = '#312e81';
    ctx.lineWidth = 14 * s;
    ctx.beginPath();
    ctx.moveTo(-50 * s, -230 * s);
    ctx.lineTo(-90 * s, -195 * s);
    ctx.lineTo(-105 * s, -140 * s);
    ctx.stroke();

    // Effigy Golden Bow
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.arc(-112 * s, -140 * s, 42 * s, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    // Right Arm (holding sword)
    ctx.strokeStyle = '#312e81';
    ctx.lineWidth = 14 * s;
    ctx.beginPath();
    ctx.moveTo(50 * s, -230 * s);
    ctx.lineTo(90 * s, -195 * s);
    ctx.lineTo(105 * s, -140 * s);
    ctx.stroke();

    // Effigy Chandrahas Sword (Gift from Lord Shiva)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(105 * s, -140 * s);
    ctx.lineTo(135 * s, -210 * s);
    ctx.stroke();
    // Sword hilt
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(100 * s, -143 * s, 12 * s, 6 * s);

    // 5. The Amrit Kund in Navel (The target of Rama's arrow!)
    const navelY = -145 * s;
    const isPierced = this.status !== 'idle' && this.status !== 'aiming' && this.status !== 'flying';

    ctx.save();
    // Pulsing divine nectar aura
    const pulse = 1 + Math.sin(Date.now() * 0.006) * 0.2;
    const auraGrad = ctx.createRadialGradient(0, navelY, 2 * s, 0, navelY, 28 * s * pulse);
    if (!isPierced) {
      auraGrad.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
      auraGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
      auraGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    } else {
      // Pierced with Agneyastra flames
      auraGrad.addColorStop(0, 'rgba(255, 87, 34, 1.0)');
      auraGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.7)');
      auraGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    }
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, navelY, 28 * s * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Sacred Amrit Kumbha vessel icon
    ctx.fillStyle = isPierced ? '#ef4444' : '#ffd700';
    ctx.beginPath();
    ctx.arc(0, navelY, 9 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    if (!isPierced) {
      // Target bullseye indicator rings
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(0, navelY, 16 * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // 6. The 10 Heads of Dashanana (5 left, 1 Center Main, 4 right)
    this.drawTenHeads(ctx, s);

    ctx.restore();
  }

  /**
   * Render the 10 distinct heads with crowns, fierce eyes, and festive mustaches
   */
  private drawTenHeads(ctx: CanvasRenderingContext2D, s: number) {
    const headOffsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

    headOffsets.forEach((offset, idx) => {
      const isBurned = this.burnedHeads[idx];
      const isCentral = offset === 0;

      const hx = offset * (26 * s);
      const hy = isCentral ? -305 * s : -285 * s;
      const headRadius = (isCentral ? 17 : 13) * s;

      ctx.save();
      ctx.translate(hx, hy);

      if (isBurned) {
        // Ash charred head remains
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(0, 0, headRadius * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#44403c';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Face skin (Traditional royal effigy emerald green or blue-tinted)
        ctx.fillStyle = isCentral ? '#064e3b' : '#047857';
        ctx.beginPath();
        ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#022c22';
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        // Shaivite Tripundra / Tilak on forehead
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = isCentral ? 2.5 * s : 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(-headRadius * 0.55, -headRadius * 0.35);
        ctx.lineTo(headRadius * 0.55, -headRadius * 0.35);
        ctx.stroke();

        // Red Bindu at center
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(0, -headRadius * 0.35, 2 * s, 0, Math.PI * 2);
        ctx.fill();

        // Glowing fiery eyes
        const eyeOffsetX = headRadius * 0.4;
        const eyeOffsetY = -headRadius * 0.05;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.ellipse(-eyeOffsetX, eyeOffsetY, 3 * s, 2 * s, 0, 0, Math.PI * 2);
        ctx.ellipse(eyeOffsetX, eyeOffsetY, 3 * s, 2 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye pupils
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.arc(-eyeOffsetX, eyeOffsetY, 1.2 * s, 0, Math.PI * 2);
        ctx.arc(eyeOffsetX, eyeOffsetY, 1.2 * s, 0, Math.PI * 2);
        ctx.fill();

        // Iconic Dussehra Mustache (curled upwards)
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5 * s;
        ctx.beginPath();
        ctx.moveTo(-headRadius * 0.6, headRadius * 0.35);
        ctx.quadraticCurveTo(0, headRadius * 0.55, headRadius * 0.6, headRadius * 0.35);
        ctx.stroke();

        // Golden Crown (Mukut)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(-headRadius * 0.8, -headRadius * 0.7);
        ctx.lineTo(0, -headRadius * 1.8);
        ctx.lineTo(headRadius * 0.8, -headRadius * 0.7);
        ctx.closePath();
        ctx.fill();

        // Crown jewels & engraving
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2 * s;
        ctx.stroke();

        ctx.fillStyle = '#dc2626'; // Ruby jewel
        ctx.beginPath();
        ctx.arc(0, -headRadius * 1.15, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  /**
   * Draw Lord Rama in dynamic archer stance on the left side,
   * holding the Kodanda bow with drawn bowstring and glowing Agneyastra arrow.
   */
  private drawLordRamaAndBow(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const rx = this.ramaX;
    const ry = this.ramaY;
    const rs = this.ramaScale;

    // Anchor at Rama's feet on the ground
    ctx.translate(rx, ry);

    // 1. Subtle Celestial Prabhamandala (Divine Golden Aura behind Rama's head)
    const haloX = 0;
    const haloY = -142 * rs;
    const haloGrad = ctx.createRadialGradient(haloX, haloY, 8 * rs, haloX, haloY, 44 * rs);
    haloGrad.addColorStop(0, 'rgba(251, 191, 36, 0.40)');
    haloGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.15)');
    haloGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(haloX, haloY, 44 * rs, 0, Math.PI * 2);
    ctx.fill();

    // 2. Flowing Saffron Cloth (Uttariya / Angavastram billowing back in the wind)
    ctx.save();
    const clothGrad = ctx.createLinearGradient(-15 * rs, -120 * rs, -80 * rs, -50 * rs);
    clothGrad.addColorStop(0, '#ea580c');
    clothGrad.addColorStop(0.6, '#f97316');
    clothGrad.addColorStop(1, '#c2410c');

    ctx.fillStyle = clothGrad;
    ctx.beginPath();
    ctx.moveTo(-8 * rs, -122 * rs); // Left shoulder drape
    ctx.bezierCurveTo(-35 * rs, -115 * rs, -60 * rs, -95 * rs, -75 * rs, -65 * rs);
    ctx.bezierCurveTo(-65 * rs, -45 * rs, -45 * rs, -60 * rs, -30 * rs, -75 * rs);
    ctx.bezierCurveTo(-45 * rs, -85 * rs, -60 * rs, -70 * rs, -68 * rs, -50 * rs);
    ctx.bezierCurveTo(-50 * rs, -70 * rs, -25 * rs, -85 * rs, -14 * rs, -85 * rs);
    ctx.closePath();
    ctx.fill();

    // Golden embroidered border on the saffron cloth
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8 * rs;
    ctx.stroke();
    ctx.restore();

    // 3. Quiver (Tarkash) slung on back with divine arrows
    ctx.save();
    ctx.translate(-16 * rs, -100 * rs);
    ctx.rotate(-0.35); // Angled over right shoulder

    // Quiver body
    const quiverGrad = ctx.createLinearGradient(0, 0, 14 * rs, 55 * rs);
    quiverGrad.addColorStop(0, '#854d0e');
    quiverGrad.addColorStop(0.5, '#b45309');
    quiverGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = quiverGrad;
    ctx.fillRect(-6 * rs, -20 * rs, 13 * rs, 55 * rs);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5 * rs;
    ctx.strokeRect(-6 * rs, -20 * rs, 13 * rs, 55 * rs);

    // Peacock-fletched golden arrows protruding
    for (let i = -1; i <= 2; i++) {
      const arrX = i * 3 * rs;
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5 * rs;
      ctx.beginPath();
      ctx.moveTo(arrX, -20 * rs);
      ctx.lineTo(arrX - 3 * rs, -36 * rs);
      ctx.stroke();

      // Peacock green & gold fletching feathers
      ctx.fillStyle = i % 2 === 0 ? '#0d9488' : '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(arrX - 3 * rs, -36 * rs);
      ctx.lineTo(arrX - 6 * rs, -32 * rs);
      ctx.lineTo(arrX, -28 * rs);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 4. Archer Stance Legs (Pratyalidha asana - front bent, rear braced)
    // Blue-toned skin with muscle shading
    const skinColor = '#356494';
    const skinShadow = '#1e3d61';
    const skinHighlight = '#6ba3d6';
    const rimGold = '#fde047';

    // Rear Leg (Left leg stepping firmly backwards)
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 12 * rs;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10 * rs, -65 * rs); // Hip
    ctx.lineTo(-26 * rs, -32 * rs); // Knee
    ctx.lineTo(-36 * rs, -2 * rs);  // Ankle
    ctx.stroke();

    ctx.strokeStyle = skinColor;
    ctx.lineWidth = 9 * rs;
    ctx.beginPath();
    ctx.moveTo(-10 * rs, -65 * rs);
    ctx.lineTo(-26 * rs, -32 * rs);
    ctx.lineTo(-36 * rs, -2 * rs);
    ctx.stroke();

    // Rear foot planted firmly on ground
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(-38 * rs, 0, 7 * rs, 3.5 * rs, 0, 0, Math.PI * 2);
    ctx.fill();
    // Golden anklet (Nupura)
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-41 * rs, -4 * rs, 8 * rs, 2.5 * rs);

    // Front Leg (Right leg stepped forward, knee dynamically flexed)
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 13 * rs;
    ctx.beginPath();
    ctx.moveTo(8 * rs, -65 * rs);  // Hip
    ctx.lineTo(26 * rs, -36 * rs); // Knee bent forward
    ctx.lineTo(24 * rs, -2 * rs);  // Shin
    ctx.stroke();

    ctx.strokeStyle = skinColor;
    ctx.lineWidth = 10 * rs;
    ctx.beginPath();
    ctx.moveTo(8 * rs, -65 * rs);
    ctx.lineTo(26 * rs, -36 * rs);
    ctx.lineTo(24 * rs, -2 * rs);
    ctx.stroke();

    // Golden rim light on front knee/shin
    ctx.strokeStyle = rimGold;
    ctx.lineWidth = 2 * rs;
    ctx.beginPath();
    ctx.moveTo(28 * rs, -42 * rs);
    ctx.lineTo(30 * rs, -34 * rs);
    ctx.lineTo(28 * rs, -4 * rs);
    ctx.stroke();

    // Front foot planted
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(26 * rs, 0, 9 * rs, 4 * rs, 0, 0, Math.PI * 2);
    ctx.fill();
    // Golden anklet
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(21 * rs, -4 * rs, 9 * rs, 2.5 * rs);

    // Royal Traditional Dhoti (Pitambara - Golden silk with ornate pleats)
    const dhotiGrad = ctx.createLinearGradient(-30 * rs, -70 * rs, 30 * rs, -25 * rs);
    dhotiGrad.addColorStop(0, '#b45309');
    dhotiGrad.addColorStop(0.4, '#d97706');
    dhotiGrad.addColorStop(0.8, '#f59e0b');
    dhotiGrad.addColorStop(1, '#fbbf24');

    ctx.fillStyle = dhotiGrad;
    ctx.beginPath();
    ctx.moveTo(-16 * rs, -72 * rs);
    ctx.lineTo(16 * rs, -72 * rs);
    ctx.lineTo(32 * rs, -38 * rs); // Over front thigh
    ctx.lineTo(16 * rs, -28 * rs); // Center pleats
    ctx.lineTo(-8 * rs, -30 * rs);
    ctx.lineTo(-28 * rs, -42 * rs); // Over rear thigh
    ctx.closePath();
    ctx.fill();

    // Decorative pleat folds (kachha style)
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5 * rs;
    ctx.beginPath();
    ctx.moveTo(0, -70 * rs);
    ctx.lineTo(2 * rs, -30 * rs);
    ctx.moveTo(8 * rs, -68 * rs);
    ctx.lineTo(12 * rs, -32 * rs);
    ctx.moveTo(-6 * rs, -68 * rs);
    ctx.lineTo(-8 * rs, -34 * rs);
    ctx.stroke();

    // Crimson and gold embroidered border along dhoti hem
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5 * rs;
    ctx.beginPath();
    ctx.moveTo(-28 * rs, -42 * rs);
    ctx.lineTo(-8 * rs, -30 * rs);
    ctx.lineTo(16 * rs, -28 * rs);
    ctx.lineTo(32 * rs, -38 * rs);
    ctx.stroke();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.2 * rs;
    ctx.stroke();

    // Golden Waistband / Belt (Kamarbandh)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-16 * rs, -74 * rs, 32 * rs, 6 * rs);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1.5 * rs;
    ctx.strokeRect(-16 * rs, -74 * rs, 32 * rs, 6 * rs);
    // Ruby medallion at center of belt
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, -71 * rs, 3.5 * rs, 0, Math.PI * 2);
    ctx.fill();

    // 5. Muscular Torso & Chest (Shyama Varna blue-toned skin)
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.moveTo(-16 * rs, -126 * rs); // Rear shoulder
    ctx.lineTo(18 * rs, -126 * rs);  // Front shoulder
    ctx.lineTo(12 * rs, -74 * rs);   // Front waist
    ctx.lineTo(-12 * rs, -74 * rs);  // Rear waist
    ctx.closePath();
    ctx.fill();

    // Muscular chest contour (Pectorals & Latissimus)
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 2 * rs;
    ctx.beginPath();
    ctx.moveTo(0, -120 * rs);
    ctx.lineTo(0, -85 * rs); // Sternum / abdominal line
    ctx.moveTo(-10 * rs, -108 * rs);
    ctx.quadraticCurveTo(0, -102 * rs, 10 * rs, -108 * rs); // Pectoral curve
    ctx.stroke();

    // Subtle golden rim light along front chest contour
    ctx.strokeStyle = rimGold;
    ctx.lineWidth = 2.2 * rs;
    ctx.beginPath();
    ctx.moveTo(17 * rs, -124 * rs);
    ctx.lineTo(14 * rs, -95 * rs);
    ctx.lineTo(12 * rs, -74 * rs);
    ctx.stroke();

    // Sacred Thread (Yajnopavita) running diagonally from left shoulder to right waist
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5 * rs;
    ctx.beginPath();
    ctx.moveTo(-10 * rs, -125 * rs);
    ctx.quadraticCurveTo(2 * rs, -100 * rs, 10 * rs, -74 * rs);
    ctx.stroke();

    // Golden Royal Necklace (Kanthahara)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.5 * rs;
    ctx.beginPath();
    ctx.arc(0, -122 * rs, 12 * rs, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // Ruby gemstones on necklace
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, -110 * rs, 2.5 * rs, 0, Math.PI * 2);
    ctx.arc(-7 * rs, -114 * rs, 2 * rs, 0, Math.PI * 2);
    ctx.arc(7 * rs, -114 * rs, 2 * rs, 0, Math.PI * 2);
    ctx.fill();

    // 6. Right Arm (Drawing Hand - Pulled Backward to Cheek)
    const drawElbowX = -36 * rs;
    const drawElbowY = -116 * rs;
    const isDrawn = this.bowPull > 0.1;
    const stringHandX = isDrawn ? -3 * rs : -18 * rs;
    const stringHandY = isDrawn ? -136 * rs : -130 * rs;

    // Upper arm pulled back
    ctx.strokeStyle = skinColor;
    ctx.lineWidth = 8.5 * rs;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-14 * rs, -124 * rs);
    ctx.lineTo(drawElbowX, drawElbowY);
    ctx.lineTo(stringHandX, stringHandY);
    ctx.stroke();

    // Golden armlet (Keyura) on right bicep
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-27 * rs, -124 * rs, 6 * rs, 4 * rs);

    // Golden archery bracer on right forearm
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-22 * rs, -132 * rs, 8 * rs, 4 * rs);

    // Drawing hand fingers at cheek
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(stringHandX, stringHandY, 4 * rs, 0, Math.PI * 2);
    ctx.fill();

    // 7. Head, Hair, Tilak & Traditional Golden Crown (Kiritamukuta)
    const headX = 0;
    const headY = -142 * rs;
    const headRadius = 13 * rs;

    // Neck
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.moveTo(-6 * rs, -128 * rs);
    ctx.lineTo(6 * rs, -128 * rs);
    ctx.lineTo(5 * rs, -136 * rs);
    ctx.lineTo(-5 * rs, -136 * rs);
    ctx.closePath();
    ctx.fill();

    // Face / Head profile (facing right toward Ravana)
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Noble jawline & nose in profile facing right (+x)
    ctx.beginPath();
    ctx.moveTo(headX + 4 * rs, headY - 8 * rs); // Forehead
    ctx.lineTo(headX + 13 * rs, headY - 1 * rs); // Aquiline nose tip
    ctx.lineTo(headX + 7 * rs, headY + 3 * rs);  // Upper lip
    ctx.lineTo(headX + 8 * rs, headY + 6 * rs);  // Lower lip
    ctx.lineTo(headX + 6 * rs, headY + 11 * rs); // Chin
    ctx.lineTo(headX - 4 * rs, headY + 12 * rs); // Jaw
    ctx.closePath();
    ctx.fill();

    // Golden rim light along profile
    ctx.strokeStyle = rimGold;
    ctx.lineWidth = 1.6 * rs;
    ctx.beginPath();
    ctx.moveTo(headX + 6 * rs, headY - 7 * rs);
    ctx.lineTo(headX + 13 * rs, headY - 1 * rs);
    ctx.lineTo(headX + 8 * rs, headY + 6 * rs);
    ctx.lineTo(headX + 6 * rs, headY + 11 * rs);
    ctx.stroke();

    // Determined, serene lotus-petal eye looking right
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(headX + 4 * rs, headY - 2 * rs, 3.2 * rs, 1.8 * rs, 0, 0, Math.PI * 2);
    ctx.fill();
    // Iris with golden gleam
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(headX + 5 * rs, headY - 2 * rs, 1.5 * rs, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(headX + 5.5 * rs, headY - 2.5 * rs, 0.6 * rs, 0, Math.PI * 2);
    ctx.fill();

    // Sacred Vaishnavite Urdhva Pundra Tilak on forehead
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 * rs;
    ctx.beginPath();
    ctx.moveTo(headX + 4 * rs, headY - 9 * rs);
    ctx.lineTo(headX + 6 * rs, headY - 5 * rs);
    ctx.stroke();
    // Red vermilion bindu in center of Tilak
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(headX + 5 * rs, headY - 7 * rs, 1.3 * rs, 0, Math.PI * 2);
    ctx.fill();

    // Hair topknot & tresses behind crown
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(headX - 6 * rs, headY - 7 * rs, 8 * rs, 0, Math.PI * 2);
    ctx.fill();
    // Flowing hair strands at neck
    ctx.beginPath();
    ctx.moveTo(headX - 8 * rs, headY + 4 * rs);
    ctx.quadraticCurveTo(-14 * rs, headY + 12 * rs, -12 * rs, headY + 22 * rs);
    ctx.lineTo(-7 * rs, headY + 14 * rs);
    ctx.closePath();
    ctx.fill();

    // Golden Kundala (earring)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(headX - 2 * rs, headY + 4 * rs, 2.5 * rs, 0, Math.PI * 2);
    ctx.fill();

    // Traditional Golden Crown (Kiritamukuta)
    const crownGrad = ctx.createLinearGradient(headX - 10 * rs, headY - 14 * rs, headX + 10 * rs, headY - 40 * rs);
    crownGrad.addColorStop(0, '#d97706');
    crownGrad.addColorStop(0.5, '#f59e0b');
    crownGrad.addColorStop(1, '#ffd700');

    ctx.fillStyle = crownGrad;
    ctx.beginPath();
    ctx.moveTo(headX - 10 * rs, headY - 9 * rs);
    ctx.lineTo(headX - 8 * rs, headY - 28 * rs);
    ctx.lineTo(headX + 2 * rs, headY - 42 * rs); // Conical finial pinnacle
    ctx.lineTo(headX + 8 * rs, headY - 26 * rs);
    ctx.lineTo(headX + 8 * rs, headY - 9 * rs);
    ctx.closePath();
    ctx.fill();

    // Crown engravings & solar emblem
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.5 * rs;
    ctx.stroke();

    // Ruby crest at center of crown
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(headX, headY - 22 * rs, 3.2 * rs, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1 * rs;
    ctx.stroke();

    // Crown pinnacle golden aura pearl
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(headX + 2 * rs, headY - 43 * rs, 2 * rs, 0, Math.PI * 2);
    ctx.fill();

    // 8. Left Arm (Extended Forward to Bow Grip)
    const bowGripX = 44 * rs;
    const bowGripY = -108 * rs;
    ctx.strokeStyle = skinColor;
    ctx.lineWidth = 9 * rs;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(14 * rs, -124 * rs); // Shoulder
    ctx.lineTo(30 * rs, -118 * rs); // Elbow
    ctx.lineTo(bowGripX, bowGripY);  // Hand on bow
    ctx.stroke();

    // Golden rim light on left arm
    ctx.strokeStyle = rimGold;
    ctx.lineWidth = 1.8 * rs;
    ctx.beginPath();
    ctx.moveTo(16 * rs, -127 * rs);
    ctx.lineTo(32 * rs, -121 * rs);
    ctx.lineTo(bowGripX, bowGripY - 2 * rs);
    ctx.stroke();

    // Golden Armlet (Keyura) on left bicep
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(21 * rs, -123 * rs, 6 * rs, 4 * rs);

    // Golden Archery Bracer on left forearm
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(34 * rs, -118 * rs, 8 * rs, 4 * rs);

    // Left hand gripping the center of the Kodanda bow
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(bowGripX, bowGripY, 4.5 * rs, 0, Math.PI * 2);
    ctx.fill();

    // 9. Divine Kodanda Bow & Taut Bowstring
    ctx.save();
    ctx.translate(bowGripX, bowGripY);
    ctx.rotate(this.arrowAngle);

    // Ornate Golden Bow Stave (Kodanda)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5 * rs;
    ctx.shadowColor = 'rgba(251, 191, 36, 0.7)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.arc(0, 0, 56 * rs, -Math.PI * 0.44, Math.PI * 0.44);
    ctx.stroke();

    // Golden recurve makara tips on bow
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(38 * rs, -41 * rs, 4 * rs, 0, Math.PI * 2);
    ctx.arc(38 * rs, 41 * rs, 4 * rs, 0, Math.PI * 2);
    ctx.fill();

    // Bow grip wrap
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-3 * rs, -8 * rs, 6 * rs, 16 * rs);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.2 * rs;
    ctx.strokeRect(-3 * rs, -8 * rs, 6 * rs, 16 * rs);

    // Taut Bowstring
    const topTipX = 38 * rs;
    const topTipY = -41 * rs;
    const bottomTipX = 38 * rs;
    const bottomTipY = 41 * rs;

    // Draw string apex
    let apexX = 0;
    let apexY = 0;
    if (isDrawn) {
      // Pulled taut backward along arrow axis to cheek
      const pullDist = 32 * rs * this.bowPull;
      apexX = -pullDist;
      apexY = 0;
    } else {
      // Released string with decaying vibration
      const vib = Math.sin(Date.now() * 0.08) * this.stringVibration * 3 * rs;
      apexX = 18 * rs + vib;
      apexY = 0;
    }

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.8;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(topTipX, topTipY);
    ctx.lineTo(apexX, apexY);
    ctx.lineTo(bottomTipX, bottomTipY);
    ctx.stroke();

    // 10. Divine Arrow (Agneyastra / Brahmashira) poised on bow
    if (this.status === 'idle' || this.status === 'aiming') {
      const arrowStartX = apexX;
      const arrowLength = 72 * rs;

      // Golden Shaft
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.8 * rs;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(arrowStartX, 0);
      ctx.lineTo(arrowStartX + arrowLength, 0);
      ctx.stroke();

      // Golden arrow fletching at nock
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(arrowStartX, 0);
      ctx.lineTo(arrowStartX - 6 * rs, -4 * rs);
      ctx.lineTo(arrowStartX - 4 * rs, 0);
      ctx.lineTo(arrowStartX - 6 * rs, 4 * rs);
      ctx.closePath();
      ctx.fill();

      // Trident / Agneyastra flaming arrowhead
      const tipX = arrowStartX + arrowLength;
      ctx.fillStyle = '#ff5722';
      ctx.beginPath();
      ctx.moveTo(tipX, -6 * rs);
      ctx.lineTo(tipX + 16 * rs, 0);
      ctx.lineTo(tipX, 6 * rs);
      ctx.closePath();
      ctx.fill();

      // Pulsing flame halo at arrowhead
      const pulse = 1 + Math.sin(Date.now() * 0.012) * 0.25;
      const flameGlow = ctx.createRadialGradient(tipX + 8 * rs, 0, 2 * rs, tipX + 8 * rs, 0, 22 * rs * pulse);
      flameGlow.addColorStop(0, 'rgba(255, 235, 59, 1)');
      flameGlow.addColorStop(0.5, 'rgba(255, 87, 34, 0.7)');
      flameGlow.addColorStop(1, 'rgba(255, 87, 34, 0)');
      ctx.fillStyle = flameGlow;
      ctx.beginPath();
      ctx.arc(tipX + 8 * rs, 0, 22 * rs * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // Bow local space
    ctx.restore(); // Rama local space

    // 11. Flaming Arrow in Flight across the sky toward Ravana
    if (this.status === 'flying' && this.isArrowActive) {
      ctx.save();
      ctx.translate(this.arrowX, this.arrowY);
      ctx.rotate(this.arrowAngle);

      const aLen = 68 * rs;

      // Golden shaft
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3.2 * rs;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(-aLen, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();

      // Arrow fletching
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-aLen, 0);
      ctx.lineTo(-aLen - 8 * rs, -5 * rs);
      ctx.lineTo(-aLen - 5 * rs, 0);
      ctx.lineTo(-aLen - 8 * rs, 5 * rs);
      ctx.closePath();
      ctx.fill();

      // Agneyastra Arrowhead
      ctx.fillStyle = '#ff3d00';
      ctx.beginPath();
      ctx.moveTo(0, -7 * rs);
      ctx.lineTo(18 * rs, 0);
      ctx.lineTo(0, 7 * rs);
      ctx.closePath();
      ctx.fill();

      // Blazing halo around head
      const glow = ctx.createRadialGradient(8 * rs, 0, 2 * rs, 8 * rs, 0, 26 * rs);
      glow.addColorStop(0, 'rgba(255, 235, 59, 1)');
      glow.addColorStop(0.4, 'rgba(255, 87, 34, 0.85)');
      glow.addColorStop(1, 'rgba(255, 87, 34, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(8 * rs, 0, 26 * rs, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  /**
   * Render dynamic particle effects
   */
  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === 'flame') {
        const flameGrad = ctx.createRadialGradient(p.x, p.y, p.size * 0.1, p.x, p.y, p.size);
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.3, p.color);
        flameGrad.addColorStop(0.8, '#d97706');
        flameGrad.addColorStop(1, 'rgba(180, 83, 9, 0)');

        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'cracker' || p.type === 'spark' || p.type === 'firework') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  /**
   * Cinematic vignette lighting
   */
  private drawVignette(ctx: CanvasRenderingContext2D) {
    const vig = ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.5,
      Math.min(this.width, this.height) * 0.35,
      this.width * 0.5,
      this.height * 0.5,
      Math.max(this.width, this.height) * 0.72
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(1, 'rgba(4, 4, 7, 0.75)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
