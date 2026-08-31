/**
 * AudioManager — Звуковой движок Bashmak (Web Audio API Hybrid Engine)
 * 
 * Особенности:
 * 1. Hybrid Sample & Organic Synthesis: Воспроизведение аудиоспрайтов/семплов фоли + сочный процедурный фоллбек.
 * 2. Voice Stealing / Channel Limiter: Ограничение одновременных голосов (3-4 на категорию) против клиппинга в плотных толпах.
 * 3. Micro-Pitch Randomization: Рандомизация высоты тона (±10-15%) для защиты от пулеметного эффекта.
 * 4. Mobile EQ Mastering: High-pass (45 Гц) против саб-забивания + сглаживание телефонного дребезга (3.2 кГц) + Master Limiter.
 * 5. Organic XP Escalator: Логарифмический подъем тона для сочных пузырьковых звуков XP.
 */

export interface PlaySoundOptions {
  volume?: number;
  rate?: number;
  pitchSpread?: number;
  category?: string;
  maxVoices?: number;
}

interface ActiveVoice {
  stop: () => void;
  startTime: number;
}

export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private isMuted = false;
  private sfxVolume = 0.8;
  private bgmVolume = 0.5;

  // Registered AudioBuffers (from AudioSprites or preloaded foley samples)
  private sampleBuffers: Map<string, AudioBuffer> = new Map();

  // Voice Stealing Channels
  private activeVoices: Map<string, ActiveVoice[]> = new Map();

  // XP Streak Escalator & Throttling
  private xpStreakCount = 0;
  private xpStreakResetTimer: number | null = null;
  private lastXpTime = 0;
  private lastGooTime = 0;
  private lastImpactTime = 0;
  private lastSpitTime = 0;
  private lastWhipTime = 0;
  private lastExplosionTime = 0;

  // BGM Lookahead Scheduler & Streaming Track
  private bgmSchedulerId: number | null = null;
  private bgmStep = 0;
  private bgmNextNoteTime = 0;
  private isBgmPlaying = false;
  private bgmAudioElement: HTMLAudioElement | null = null;
  private static readonly BGM_TEMPO_S = 0.125; // ~120 BPM Funk Groove
  private static readonly BGM_LOOKAHEAD_S = 0.15;

  // Shared noise buffer for organic wet foley synthesis
  private noiseBuffer: AudioBuffer | null = null;

  private constructor() {
    // Lazy AudioContext initialization
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public init(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();

        // 1. Master Dynamics Compressor / Limiter (Prevents clipping with 50+ explosions)
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-3, this.ctx.currentTime);
        this.limiter.knee.setValueAtTime(6, this.ctx.currentTime);
        this.limiter.ratio.setValueAtTime(16, this.ctx.currentTime);
        this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.limiter.release.setValueAtTime(0.08, this.ctx.currentTime);

        // 2. Mobile EQ Filter Chain
        // High-pass filter: cut sub-rumble below 45 Hz that distorts mobile phone speakers
        const highPass = this.ctx.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.setValueAtTime(45, this.ctx.currentTime);
        highPass.Q.setValueAtTime(0.7, this.ctx.currentTime);

        // Anti-Harshness Notch/Peaking filter: soften 3.2 kHz phone speaker resonance
        const antiHarsh = this.ctx.createBiquadFilter();
        antiHarsh.type = 'peaking';
        antiHarsh.frequency.setValueAtTime(3200, this.ctx.currentTime);
        antiHarsh.gain.setValueAtTime(-2.5, this.ctx.currentTime);
        antiHarsh.Q.setValueAtTime(1.2, this.ctx.currentTime);

        // 3. Master Gain Node
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0;

        // Routing: [sfxGain / bgmGain] -> highPass -> antiHarsh -> limiter -> masterGain -> destination
        highPass.connect(antiHarsh);
        antiHarsh.connect(this.limiter);
        this.limiter.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Sub-mix gains
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxVolume;
        this.sfxGain.connect(highPass);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.bgmVolume;
        this.bgmGain.connect(highPass);

        // Generate shared white/pink noise buffer for organic wet squelch synthesis
        this.initNoiseBuffer();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private initNoiseBuffer(): void {
    if (!this.ctx || this.noiseBuffer) return;
    const bufferSize = this.ctx.sampleRate * 1.5; // 1.5s noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink-ish noise filter for organic texture
      lastOut = (lastOut * 0.92) + (white * 0.08);
      output[i] = lastOut * 3.5;
    }
  }

  private ensureContext(): boolean {
    this.init();
    return this.ctx !== null && this.ctx.state === 'running';
  }

  private getSfxDestination(): AudioNode {
    return this.sfxGain ?? this.ctx!.destination;
  }

  private getBgmDestination(): AudioNode {
    return this.bgmGain ?? this.ctx!.destination;
  }

  // =========================================================================
  // --- VOICE STEALING & CHANNEL LIMITER ---
  // =========================================================================
  private allocateVoice(category: string, maxConcurrent: number, stopFn: () => void): void {
    let voices = this.activeVoices.get(category);
    if (!voices) {
      voices = [];
      this.activeVoices.set(category, voices);
    }

    // Clean up expired voices
    const now = Date.now();
    voices = voices.filter(v => now - v.startTime < 1500);

    // If limit exceeded, steal/stop oldest voice
    while (voices.length >= maxConcurrent && voices.length > 0) {
      const oldest = voices.shift();
      if (oldest) {
        try {
          oldest.stop();
        } catch {
          // Ignore if already stopped
        }
      }
    }

    voices.push({ stop: stopFn, startTime: now });
    this.activeVoices.set(category, voices);
  }

  // =========================================================================
  // --- SAMPLE REGISTRATION & PLAYBACK ---
  // =========================================================================
  public registerSample(key: string, buffer: AudioBuffer): void {
    this.sampleBuffers.set(key, buffer);
  }

  public async loadSampleFromUrl(key: string, url: string): Promise<boolean> {
    if (!this.ensureContext() || !this.ctx) return false;
    try {
      const resp = await fetch(url);
      const arrayBuf = await resp.arrayBuffer();
      const audioBuf = await this.ctx.decodeAudioData(arrayBuf);
      this.registerSample(key, audioBuf);
      return true;
    } catch {
      return false;
    }
  }

  public playSample(key: string, options: PlaySoundOptions = {}): boolean {
    if (this.isMuted || !this.ensureContext()) return false;
    const buffer = this.sampleBuffers.get(key);
    if (!buffer || !this.ctx) return false;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const category = options.category || key;
    const maxVoices = options.maxVoices || 3;
    const basePitch = options.rate || 1.0;
    const spread = options.pitchSpread || 0.12;
    const randomizedRate = Math.max(0.2, basePitch + (Math.random() * 2 - 1) * spread);
    const volume = options.volume ?? 0.6;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(randomizedRate, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);

    source.connect(gain);
    gain.connect(this.getSfxDestination());

    const stopFn = () => {
      try {
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.02);
        source.stop(ctx.currentTime + 0.025);
      } catch {
        // Ignored
      }
    };

    this.allocateVoice(category, maxVoices, stopFn);
    source.start(now);
    return true;
  }

  // =========================================================================
  // --- VOLUME CONTROLS ---
  // =========================================================================
  public setMasterVolume(vol: number): void {
    if (!this.ctx || !this.masterGain) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  public setBgmVolume(vol: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.bgmGain) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    }
    if (this.bgmAudioElement) {
      this.bgmAudioElement.volume = this.bgmVolume;
    }
  }

  // =========================================================================
  // --- 1. XP PICKUP: Organic Escalating Bubble Pop ---
  // =========================================================================
  public playXpPickup(streak?: number): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (now - this.lastXpTime < 0.028) return; // 28ms throttle
    this.lastXpTime = now;

    if (this.xpStreakResetTimer) {
      window.clearTimeout(this.xpStreakResetTimer);
    }
    this.xpStreakResetTimer = window.setTimeout(() => {
      this.xpStreakCount = 0;
    }, 750);

    const currentStreak = streak ?? this.xpStreakCount++;
    const pitchMultiplier = Math.min(1.0 + Math.log10(1 + currentStreak * 0.18), 2.2);

    if (this.playSample('sfx_xp_bubble', { rate: pitchMultiplier, pitchSpread: 0.04, volume: 0.45, category: 'xp', maxVoices: 4 })) {
      return;
    }

    // Hybrid Organic Bubble Pop Foley Synth
    const baseFreq = 420 * pitchMultiplier;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 0.7, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.045);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + 0.09);

    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());

    this.allocateVoice('xp', 4, () => {
      try { osc.stop(); } catch { /* Ignore */ }
    });

    osc.start(now);
    osc.stop(now + 0.11);
  }

  // =========================================================================
  // --- 2. GOO COIN PICKUP: Wet Slurp Pop ---
  // =========================================================================
  public playGooPickup(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (now - this.lastGooTime < 0.035) return;
    this.lastGooTime = now;

    if (this.playSample('sfx_goo_slurp', { rate: 1.0, pitchSpread: 0.15, volume: 0.5, category: 'goo', maxVoices: 3 })) {
      return;
    }

    // Rich Slurp & Bubble Synth
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const detune = (Math.random() * 2 - 1) * 60;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260 + detune, now);
    osc.frequency.exponentialRampToValueAtTime(840 + detune, now + 0.07);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());

    this.allocateVoice('goo', 3, () => {
      try { osc.stop(); } catch { /* Ignore */ }
    });

    osc.start(now);
    osc.stop(now + 0.13);
  }

  // =========================================================================
  // --- 3. SLIME SPIT: Wet Squelch Squirt ---
  // =========================================================================
  public playSlimeSpit(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (now - this.lastSpitTime < 0.045) return;
    this.lastSpitTime = now;

    if (this.playSample('sfx_slime_spit', { rate: 1.0, pitchSpread: 0.18, volume: 0.45, category: 'spit', maxVoices: 3 })) {
      return;
    }

    // Multi-Layer Squelch: Pitch-swept oscillator + Bandpass noise burst
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const spread = (Math.random() * 2 - 1) * 80;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(460 + spread, now);
    osc.frequency.exponentialRampToValueAtTime(110 + spread * 0.2, now + 0.10);

    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(oscGain);
    oscGain.connect(this.getSfxDestination());

    // Wet noise transient
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650 + spread, now);
      filter.Q.setValueAtTime(2.5, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.25, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.getSfxDestination());

      noise.start(now);
      noise.stop(now + 0.09);
    }

    this.allocateVoice('spit', 3, () => {
      try { osc.stop(); } catch { /* Ignore */ }
    });

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // =========================================================================
  // --- 4. IMPACT SPLAT: Meaty Squish Hit ---
  // =========================================================================
  public playImpactSplat(isCrit = false): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (now - this.lastImpactTime < 0.03) return;
    this.lastImpactTime = now;

    if (this.playSample(isCrit ? 'sfx_splat_crit' : 'sfx_splat', { rate: isCrit ? 1.15 : 1.0, pitchSpread: 0.16, volume: isCrit ? 0.6 : 0.4, category: 'splat', maxVoices: 3 })) {
      return;
    }

    // Heavy Foley Squish Impact: Low meat thud + wet transient
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const rate = 1.0 + (Math.random() * 2 - 1) * 0.15;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime((isCrit ? 260 : 190) * rate, now);
    osc.frequency.exponentialRampToValueAtTime(45 * rate, now + 0.07);

    gain.gain.setValueAtTime(isCrit ? 0.55 : 0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());

    this.allocateVoice('splat', 3, () => {
      try { osc.stop(); } catch { /* Ignore */ }
    });

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // =========================================================================
  // --- 5. BASH STOMP / HEAVY IMPACT: Mega-Boot Sub Drop ---
  // =========================================================================
  public playBashStomp(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    if (this.playSample('sfx_mega_stomp', { rate: 1.0, pitchSpread: 0.08, volume: 0.85, category: 'heavy_impact', maxVoices: 2 })) {
      return;
    }

    // Dual Sub-Drop + Wooden Slam
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.24);

    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());

    this.allocateVoice('heavy_impact', 2, () => {
      try { osc.stop(); } catch { /* Ignore */ }
    });

    osc.start(now);
    osc.stop(now + 0.29);
  }

  // =========================================================================
  // --- 5.5. WHIP SLASH: Snappy Leather Whoosh ---
  // =========================================================================
  public playWhipSlash(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (now - this.lastWhipTime < 0.08) return;
    this.lastWhipTime = now;

    if (this.playSample('sfx_whip_slash', { rate: 1.0, pitchSpread: 0.14, volume: 0.5, category: 'whip', maxVoices: 2 })) {
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const detune = (Math.random() * 2 - 1) * 80;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(680 + detune, now);
    osc.frequency.exponentialRampToValueAtTime(140 + detune * 0.2, now + 0.08);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());

    this.allocateVoice('whip', 2, () => {
      try { osc.stop(); } catch { /* Ignore */ }
    });

    osc.start(now);
    osc.stop(now + 0.10);
  }

  // =========================================================================
  // --- 6. LIGHTNING ZAP: Piezo Electric Arc ---
  // =========================================================================
  public playLightningZap(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    if (this.playSample('sfx_lightning_zap', { rate: 1.0, pitchSpread: 0.15, volume: 0.45, category: 'zap', maxVoices: 2 })) {
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(320, now + 0.035);
    osc.frequency.setValueAtTime(740, now + 0.07);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());

    this.allocateVoice('zap', 2, () => {
      try { osc.stop(); } catch { /* Ignore */ }
    });

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // =========================================================================
  // --- 6.5. TOILET CLANK: Metallic Ricochet ---
  // =========================================================================
  public playToiletClank(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    if (this.playSample('sfx_toilet_clank', { rate: 1.0, pitchSpread: 0.12, volume: 0.5, category: 'clank', maxVoices: 2 })) {
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const rate = 1.0 + (Math.random() * 2 - 1) * 0.1;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580 * rate, now);
    osc.frequency.exponentialRampToValueAtTime(160 * rate, now + 0.13);

    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());

    this.allocateVoice('clank', 2, () => {
      try { osc.stop(); } catch { /* Ignore */ }
    });

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // =========================================================================
  // --- 7. PLAYER HURT & DEATH ---
  // =========================================================================
  public playPlayerHurt(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    if (this.playSample('sfx_player_hurt', { rate: 1.0, pitchSpread: 0.15, volume: 0.65, category: 'hurt', maxVoices: 1 })) {
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.14);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());

    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playPlayerDeath(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    if (this.playSample('sfx_player_death', { rate: 1.0, pitchSpread: 0.05, volume: 0.85, category: 'death', maxVoices: 1 })) {
      return;
    }

    // 1. Descending Comic Whistle
    const slideOsc = ctx.createOscillator();
    const slideGain = ctx.createGain();
    slideOsc.type = 'sawtooth';
    slideOsc.frequency.setValueAtTime(440, now);
    slideOsc.frequency.exponentialRampToValueAtTime(60, now + 0.45);
    slideGain.gain.setValueAtTime(0.65, now);
    slideGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    slideOsc.connect(slideGain);
    slideGain.connect(this.getSfxDestination());
    slideOsc.start(now);
    slideOsc.stop(now + 0.52);

    // 2. Heavy low bass splat impact
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(140, now + 0.35);
    thudOsc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
    thudGain.gain.setValueAtTime(0, now);
    thudGain.gain.setValueAtTime(0.85, now + 0.35);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    thudOsc.connect(thudGain);
    thudGain.connect(this.getSfxDestination());
    thudOsc.start(now + 0.35);
    thudOsc.stop(now + 0.88);
  }

  // =========================================================================
  // --- 8. LEVEL UP FANFARE ---
  // =========================================================================
  public playLevelUp(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    if (this.playSample('sfx_level_up', { rate: 1.0, pitchSpread: 0.02, volume: 0.7, category: 'fanfare', maxVoices: 1 })) {
      return;
    }

    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C-E-G-C-E-G
    notes.forEach((freq, i) => {
      const start = now + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.48, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.26);

      osc.connect(gain);
      gain.connect(this.getSfxDestination());

      osc.start(start);
      osc.stop(start + 0.28);
    });
  }

  // =========================================================================
  // --- 9. EXPLOSION: Deep Rumble Blast ---
  // =========================================================================
  public playExplosion(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (now - this.lastExplosionTime < 0.09) return;
    this.lastExplosionTime = now;

    if (this.playSample('sfx_explosion', { rate: 1.0, pitchSpread: 0.15, volume: 0.75, category: 'explosion', maxVoices: 2 })) {
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const rate = 1.0 + (Math.random() * 2 - 1) * 0.12;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115 * rate, now);
    osc.frequency.exponentialRampToValueAtTime(24 * rate, now + 0.32);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());

    this.allocateVoice('explosion', 2, () => {
      try { osc.stop(); } catch { /* Ignore */ }
    });

    osc.start(now);
    osc.stop(now + 0.38);
  }

  // =========================================================================
  // --- 10. UI BUTTON CLICK: Snappy Comic Pop ---
  // =========================================================================
  public playClick(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    if (this.playSample('sfx_ui_click', { rate: 1.0, pitchSpread: 0.08, volume: 0.4, category: 'ui', maxVoices: 2 })) {
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.04);

    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.getSfxDestination());

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // =========================================================================
  // --- 10b. LAB UI FOLEY: Paper Rustle, Mechanical Switch & Upgrade Buy ---
  // =========================================================================
  public playPaperRustle(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (!this.noiseBuffer) return;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.playbackRate.setValueAtTime(0.9 + Math.random() * 0.2, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1900, now);
    filter.Q.setValueAtTime(1.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDestination());

    noise.start(now);
    noise.stop(now + 0.15);
  }

  public playMechanicalClank(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    // 1. Thud
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.exponentialRampToValueAtTime(55, now + 0.08);
    g1.gain.setValueAtTime(0.45, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc1.connect(g1);
    g1.connect(this.getSfxDestination());
    osc1.start(now);
    osc1.stop(now + 0.1);

    // 2. Metallic Ping
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1400, now);
    osc2.frequency.exponentialRampToValueAtTime(400, now + 0.05);
    g2.gain.setValueAtTime(0.25, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc2.connect(g2);
    g2.connect(this.getSfxDestination());
    osc2.start(now);
    osc2.stop(now + 0.07);
  }

  public playUpgradeBuy(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    this.playGooPickup();

    // Fanfare chord (C5, E5, G5, C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const t = now + i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.getSfxDestination());
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  // =========================================================================
  // --- 11. BGM: 90s Cartoon Funk / Acid Breakbeat ---
  // =========================================================================

  public startBgm(): void {
    if (this.isBgmPlaying || this.isMuted) return;
    if (!this.ensureContext()) return;

    this.isBgmPlaying = true;

    // If pre-rendered BGM audio element exists, play seamless loop
    if (this.bgmAudioElement) {
      this.bgmAudioElement.volume = this.bgmVolume;
      this.bgmAudioElement.loop = true;
      this.bgmAudioElement.play().catch(() => {
        // Fallback to Web Audio procedural scheduler if browser blocks audio element
        this.startProceduralBgm();
      });
      return;
    }

    this.startProceduralBgm();
  }

  public setBgmTrack(audioUrl: string): void {
    if (typeof window === 'undefined') return;
    if (!this.bgmAudioElement) {
      this.bgmAudioElement = new Audio();
      this.bgmAudioElement.loop = true;
    }
    this.bgmAudioElement.src = audioUrl;
    this.bgmAudioElement.volume = this.bgmVolume;
  }

  private startProceduralBgm(): void {
    this.bgmStep = 0;
    this.bgmNextNoteTime = this.ctx!.currentTime;

    const schedule = () => {
      if (!this.isBgmPlaying || !this.ctx) return;
      while (this.bgmNextNoteTime < this.ctx.currentTime + AudioManager.BGM_LOOKAHEAD_S) {
        this.scheduleBgmNote(this.bgmStep, this.bgmNextNoteTime);
        this.bgmStep++;
        this.bgmNextNoteTime += AudioManager.BGM_TEMPO_S;
      }
    };

    this.bgmSchedulerId = window.setInterval(schedule, 25);
    schedule();
  }

  private scheduleBgmNote(step: number, time: number): void {
    const ctx = this.ctx!;

    // 90s Slap Funk Bassline (16-step loop)
    const bassline = [
      65.41, 0, 65.41, 77.78, 0, 87.31, 0, 98.00,
      65.41, 65.41, 0, 116.54, 110.00, 98.00, 87.31, 77.78,
    ];

    const noteFreq = bassline[step % bassline.length];

    if (noteFreq > 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(noteFreq, time);
      osc.frequency.exponentialRampToValueAtTime(noteFreq * 0.94, time + 0.11);
      gain.gain.setValueAtTime(0.20, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
      osc.connect(gain);
      gain.connect(this.getBgmDestination());
      osc.start(time);
      osc.stop(time + 0.14);
    }

    // Acid Breakbeat Drums (Kick on 0, 6, 8, 14; Snare-pop on 4, 12; Hat on odds)
    const stepInBar = step % 16;
    if (stepInBar === 0 || stepInBar === 6 || stepInBar === 8 || stepInBar === 14) {
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(110, time);
      kickOsc.frequency.exponentialRampToValueAtTime(36, time + 0.075);
      kickGain.gain.setValueAtTime(0.32, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.085);
      kickOsc.connect(kickGain);
      kickGain.connect(this.getBgmDestination());
      kickOsc.start(time);
      kickOsc.stop(time + 0.09);
    } else if (stepInBar === 4 || stepInBar === 12) {
      const snareOsc = ctx.createOscillator();
      const snareGain = ctx.createGain();
      snareOsc.type = 'triangle';
      snareOsc.frequency.setValueAtTime(320, time);
      snareOsc.frequency.exponentialRampToValueAtTime(110, time + 0.05);
      snareGain.gain.setValueAtTime(0.24, time);
      snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
      snareOsc.connect(snareGain);
      snareGain.connect(this.getBgmDestination());
      snareOsc.start(time);
      snareOsc.stop(time + 0.065);
    }
  }

  public stopBgm(): void {
    this.isBgmPlaying = false;
    if (this.bgmAudioElement) {
      this.bgmAudioElement.pause();
      this.bgmAudioElement.currentTime = 0;
    }
    if (this.bgmSchedulerId !== null) {
      window.clearInterval(this.bgmSchedulerId);
      this.bgmSchedulerId = null;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
    if (this.isMuted) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}
