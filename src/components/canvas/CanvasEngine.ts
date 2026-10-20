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
  private bowPull: number = 0; // 0 to 1

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
    this.effigyScale = Math.min(this.width / 800, this.height / 600) * (isMobile ? 1.05 : 1.15);
    this.effigyScale = Math.max(0.65, Math.min(1.4, this.effigyScale));

    this.effigyX = isMobile ? this.width * 0.5 : this.width * 0.62;
    this.effigyY = this.height * 0.88;

    // Navel target coordinates
    this.targetX = this.effigyX;
    this.targetY = this.effigyY - 145 * this.effigyScale;

    // Bow origin coordinates
    this.bowX = isMobile ? this.width * 0.15 : this.width * 0.16;
    this.bowY = this.height * (isMobile ? 0.82 : 0.72);

    if (this.status === 'idle') {
      this.arrowX = this.bowX;
      this.arrowY = this.bowY;
      const dx = this.targetX - this.bowX;
      const dy = this.targetY - this.bowY;
      this.arrowAngle = Math.atan2(dy, dx);
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
    this.bowPull = 0.85;
    soundSynth.playBowDraw();
  }

  public launchArrow() {
    if (this.status === 'flying' || this.status === 'burning' || this.status === 'exploding') return;
    if (this.status === 'concluded') {
      this.reset();
    }
    this.status = 'flying';
    this.onStatusChange?.('flying');
    this.bowPull = 1.0;

    this.arrowX = this.bowX;
    this.arrowY = this.bowY;
    this.isArrowActive = true;

    // Calculate arc towards target
    const dx = this.targetX - this.bowX;
    const dy = this.targetY - this.bowY;
    const distance = Math.hypot(dx, dy);
    const speed = (distance / 42) * this.playbackSpeed; // Takes ~45 frames

    this.arrowVx = (dx / distance) * speed;
    this.arrowVy = (dy / distance) * speed - 1.5; // slight initial loft
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
    this.bowPull = 0;
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

    // 2. Arrow physics in flight
    if (this.status === 'flying' && this.isArrowActive) {
      this.arrowX += this.arrowVx * 60 * dt;
      this.arrowY += this.arrowVy * 60 * dt;
      // Gravity curve
      this.arrowVy += 0.06 * 60 * dt;
      this.arrowAngle = Math.atan2(this.arrowVy, this.arrowVx);

      // Trailing sparks & divine sacred wake
      const count = Math.floor(4 * this.particleDensityMultiplier);
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: this.arrowX - Math.cos(this.arrowAngle) * (i * 4),
          y: this.arrowY - Math.sin(this.arrowAngle) * (i * 4),
          vx: -this.arrowVx * 0.15 + (Math.random() - 0.5) * 1.5,
          vy: -this.arrowVy * 0.15 + (Math.random() - 0.5) * 1.5,
          size: 1.5 + Math.random() * 3,
          color: Math.random() > 0.4 ? '#fbbf24' : '#ff5722',
          alpha: 0.9,
          decay: 0.035 + Math.random() * 0.02,
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

    // Draw Archer & Divine Bow
    this.drawBowAndArrow(ctx);

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
   * Draw the Archer and the Divine Flaming Bow / Arrow
   */
  private drawBowAndArrow(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const bx = this.bowX;
    const by = this.bowY;
    const s = this.effigyScale;

    // Archer silhouette in the corner (Shri Rama drawing the bow)
    ctx.fillStyle = '#0a0a14';
    ctx.beginPath();
    ctx.ellipse(bx - 35, by + 40, 22, 55, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Archer head with crown/quiver silhouette
    ctx.beginPath();
    ctx.arc(bx - 38, by - 22, 14, 0, Math.PI * 2);
    ctx.fill();

    // Divine Bow (Kodanda)
    ctx.save();
    ctx.translate(bx, by);

    // Dynamic rotation towards target
    const angleToTarget = Math.atan2(this.targetY - by, this.targetX - bx);
    ctx.rotate(angleToTarget);

    // Bow stave (Ornate golden arc)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5 * s;
    ctx.shadowColor = 'rgba(251, 191, 36, 0.7)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.arc(0, 0, 52 * s, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();

    // Bowstring drawn taut with pull factor
    const pullX = -this.bowPull * (28 * s);
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(35 * s, -38 * s);
    ctx.lineTo(pullX, 0);
    ctx.lineTo(35 * s, 38 * s);
    ctx.stroke();

    // Divine arrow sitting in bow (when idle or aiming)
    if (this.status === 'idle' || this.status === 'aiming') {
      const arrowStartX = pullX;
      const arrowLength = 70 * s;

      // Shaft
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.moveTo(arrowStartX, 0);
      ctx.lineTo(arrowStartX + arrowLength, 0);
      ctx.stroke();

      // Flaming arrowhead
      ctx.fillStyle = '#ff5722';
      ctx.beginPath();
      ctx.moveTo(arrowStartX + arrowLength, -5 * s);
      ctx.lineTo(arrowStartX + arrowLength + 14 * s, 0);
      ctx.lineTo(arrowStartX + arrowLength, 5 * s);
      ctx.closePath();
      ctx.fill();

      // Flame glow
      if (this.status === 'aiming') {
        const flamePulse = 1 + Math.sin(Date.now() * 0.015) * 0.3;
        ctx.fillStyle = 'rgba(255, 87, 34, 0.5)';
        ctx.beginPath();
        ctx.arc(arrowStartX + arrowLength + 8 * s, 0, 16 * s * flamePulse, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Flaming Arrow in flight
    if (this.status === 'flying' && this.isArrowActive) {
      ctx.save();
      ctx.translate(this.arrowX, this.arrowY);
      ctx.rotate(this.arrowAngle);

      const aLen = 65 * s;

      // Golden shaft
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3 * s;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(-aLen, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();

      // Arrowhead
      ctx.fillStyle = '#ff3d00';
      ctx.beginPath();
      ctx.moveTo(0, -6 * s);
      ctx.lineTo(16 * s, 0);
      ctx.lineTo(0, 6 * s);
      ctx.closePath();
      ctx.fill();

      // Blazing halo around head
      const glow = ctx.createRadialGradient(8 * s, 0, 2 * s, 8 * s, 0, 24 * s);
      glow.addColorStop(0, 'rgba(255, 235, 59, 1)');
      glow.addColorStop(0.5, 'rgba(255, 87, 34, 0.8)');
      glow.addColorStop(1, 'rgba(255, 87, 34, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(8 * s, 0, 24 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
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
