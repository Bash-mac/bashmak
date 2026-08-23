/**
 * AudioManager — Звуковой движок Bashmak (Web Audio API)
 * Полностью процедурный синтез 90s Gross-Out Cartoon SFX + фоновый бит без тяжелых внешних файлов.
 */
export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private sfxVolume = 0.8;
  private bgmVolume = 0.5;

  // XP Streak Pitch Escalator
  private xpStreakCount = 0;
  private xpStreakResetTimer: number | null = null;

  // BGM Loop State
  private bgmIntervalId: number | null = null;
  private bgmStep = 0;
  private isBgmPlaying = false;

  private constructor() {
    // AudioContext will be initialized on first user gesture
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
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private ensureContext(): boolean {
    this.init();
    return this.ctx !== null && this.ctx.state === 'running';
  }

  // =========================================================================
  // --- 💎 1. XP PICKUP: Escalating Pitch (Дофаминовая слот-машина) ---
  // =========================================================================
  public playXpPickup(): void {
    if (this.isMuted || !this.ensureContext()) return;

    // Reset streak if inactive for 700ms
    if (this.xpStreakResetTimer) {
      window.clearTimeout(this.xpStreakResetTimer);
    }
    this.xpStreakResetTimer = window.setTimeout(() => {
      this.xpStreakCount = 0;
    }, 700);

    const baseFreq = 380;
    // Scale notes in semi-tones: C4, D4, E4, F4, G4, A4, B4, C5...
    const noteSteps = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 24];
    const stepIndex = Math.min(this.xpStreakCount, noteSteps.length - 1);
    const semitones = noteSteps[stepIndex];
    const freq = baseFreq * Math.pow(2, semitones / 12);
    this.xpStreakCount++;

    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.15, now + 0.08);

    gain.gain.setValueAtTime(this.sfxVolume * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  // =========================================================================
  // --- 🟢 2. GOO COIN PICKUP: Wet Bubbly Pop ---
  // =========================================================================
  public playGooPickup(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.09);

    gain.gain.setValueAtTime(this.sfxVolume * 0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // =========================================================================
  // --- 💦 3. SLIME SPIT: Wet Squelch / Squirt ---
  // =========================================================================
  public playSlimeSpit(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

    gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  // =========================================================================
  // --- 💥 4. IMPACT SPLAT: Wet Squish Hit ---
  // =========================================================================
  public playImpactSplat(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

    gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // =========================================================================
  // --- 👟 5. BASH STOMP: Heavy Bass Thud ---
  // =========================================================================
  public playBashStomp(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.22);

    gain.gain.setValueAtTime(this.sfxVolume * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  // =========================================================================
  // --- ⚡ 6. LIGHTNING ZAP: Electric Arc Crackle ---
  // =========================================================================
  public playLightningZap(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.setValueAtTime(340, now + 0.04);
    osc.frequency.setValueAtTime(820, now + 0.08);

    gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  // =========================================================================
  // --- 🩸 7. PLAYER HURT: Comic Punch Ouch ---
  // =========================================================================
  public playPlayerHurt(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.15);

    gain.gain.setValueAtTime(this.sfxVolume * 0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  // =========================================================================
  // --- 🎺 8. LEVEL UP: 90s Victory Fanfare Arpeggio ---
  // =========================================================================
  public playLevelUp(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C-E-G-C-E-G
    notes.forEach((freq, i) => {
      const start = now + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(this.sfxVolume * 0.5, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  // =========================================================================
  // --- 💣 9. EXPLOSION: Deep Rumble Blast ---
  // =========================================================================
  public playExplosion(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);

    gain.gain.setValueAtTime(this.sfxVolume * 0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.42);
  }

  // =========================================================================
  // --- 🔘 10. UI BUTTON CLICK: Snappy Comic Pop ---
  // =========================================================================
  public playClick(): void {
    if (this.isMuted || !this.ensureContext()) return;
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // =========================================================================
  // --- 🎶 11. DYNAMIC RETRO BGM: 90s Sewer Funk Groove ---
  // =========================================================================
  public startBgm(): void {
    if (this.isBgmPlaying || this.isMuted) return;
    if (!this.ensureContext()) return;

    this.isBgmPlaying = true;
    this.bgmStep = 0;

    // Funk Bassline Scale (in Hz)
    const bassline = [
      65.41, 0, 65.41, 77.78, 0, 87.31, 0, 98.00,
      65.41, 65.41, 0, 116.54, 110.00, 98.00, 87.31, 77.78
    ];

    const tempoMs = 135; // ~111 BPM 90s breakbeat funk

    this.bgmIntervalId = window.setInterval(() => {
      if (!this.isBgmPlaying || this.isMuted || !this.ctx) return;

      const now = this.ctx.currentTime;
      const noteFreq = bassline[this.bgmStep % bassline.length];

      if (noteFreq > 0) {
        // Slap Bass Tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(noteFreq, now);
        osc.frequency.exponentialRampToValueAtTime(noteFreq * 0.95, now + 0.12);

        gain.gain.setValueAtTime(this.bgmVolume * 0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
      }

      // Kick on 0, 8; Snare-pop on 4, 12
      if (this.bgmStep % 8 === 0) {
        // Kick
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(110, now);
        kickOsc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

        kickGain.gain.setValueAtTime(this.bgmVolume * 0.35, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        kickOsc.connect(kickGain);
        kickGain.connect(this.ctx.destination);

        kickOsc.start(now);
        kickOsc.stop(now + 0.1);
      } else if (this.bgmStep % 8 === 4) {
        // Snare / Rim Pop
        const snareOsc = this.ctx.createOscillator();
        const snareGain = this.ctx.createGain();
        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(320, now);
        snareOsc.frequency.exponentialRampToValueAtTime(120, now + 0.05);

        snareGain.gain.setValueAtTime(this.bgmVolume * 0.25, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        snareOsc.connect(snareGain);
        snareGain.connect(this.ctx.destination);

        snareOsc.start(now);
        snareOsc.stop(now + 0.07);
      }

      this.bgmStep++;
    }, tempoMs);
  }

  public stopBgm(): void {
    this.isBgmPlaying = false;
    if (this.bgmIntervalId !== null) {
      window.clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
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
