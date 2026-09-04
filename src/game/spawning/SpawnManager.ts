import type { EnemyDefinition } from '../data/definitions';
import { GameState } from '../core/GameState';
import {
  FODDER_BAT,
  CRAWLER_SWARM,
  SPRINTER_BUG,
  ARMORED_SLUG,
  EXPLODER_SPORE,
  MINI_BOSS_ELITE,
} from '../data/enemies';

export interface EnemyScaling {
  hpMultiplier: number;
  speedMultiplier: number;
  damageMultiplier: number;
}

export type WavePhase = 'breather' | 'buildup' | 'peak_swarm' | 'climax';

export type SpawnType = 'STANDARD' | 'HORIZONTAL' | 'VERTICAL';

export const CYCLE_DURATION_SECONDS = 80;

export const PHASE_DURATIONS = {
  breather: 18,
  buildup: 30,
  peak_swarm: 24,
  climax: 8,
} as const;

export interface WavePhaseState {
  phase: WavePhase;
  cycleIndex: number;
  cycleTime: number;
  phaseProgress: number;
  densityMultiplier: number;
  spawnIntervalMultiplier: number;
  squadMultiplier: number;
}

export class SpawnManager {
  private getPlayerPosition: () => { x: number; y: number; vx: number; vy: number };
  private spawnCallback: (definition: EnemyDefinition, x: number, y: number, scaling: EnemyScaling, isChampion?: boolean) => void;
  private getActiveEnemyCount?: () => number;
  private getViewportExtents?: () => { halfW: number; halfH: number };
  private getPowerScore?: () => number;

  private spawnTimer = 9999;
  private surgeTimer = 0;
  private nextSurgeInterval = 18000;
  private championTimer = 0;
  private nextChampionInterval = 45000;
  private directorTimer = 0;
  private cachedPowerScore = 1;
  private currentActiveCount = 0;
  private nextEndgameSiegeTime = 9.5;
  private lastClimaxSpawnedCycle = -1;

  public miniBossSpawned = false;
  public bossSpawned = false;
  public isSpawnPaused = false;
  public debugHpMult = 1.0;
  public debugSpeedMult = 1.0;
  public debugSpawnRateMult = 1.0;

  private effectiveTargetPop = 14;
  private effectiveSquadSize = 3;
  private effectiveWaveInterval = 2000;

  // Zero-allocation reusable structures
  private currentScaling: EnemyScaling = {
    hpMultiplier: 1.0,
    speedMultiplier: 1.0,
    damageMultiplier: 1.0,
  };

  private currentPhaseState: WavePhaseState = {
    phase: 'breather',
    cycleIndex: 0,
    cycleTime: 0,
    phaseProgress: 0,
    densityMultiplier: 0.5,
    spawnIntervalMultiplier: 1.7,
    squadMultiplier: 0.6,
  };

  private cachedProgression = {
    basePop: 14,
    baseSquad: 3,
    baseInterval: 2000,
  };

  private cachedViewport = {
    halfW: 680,
    halfH: 400,
    maxRadius: 788,
  };

  private scratchPos = {
    x: 0,
    y: 0,
  };

  constructor(
    getPlayerPosition: () => { x: number; y: number; vx: number; vy: number },
    spawnCallback: (definition: EnemyDefinition, x: number, y: number, scaling: EnemyScaling, isChampion?: boolean) => void,
    getViewportExtents?: () => { halfW: number; halfH: number },
    getActiveEnemyCount?: () => number,
    getPowerScore?: () => number
  ) {
    this.getPlayerPosition = getPlayerPosition;
    this.spawnCallback = spawnCallback;
    this.getViewportExtents = getViewportExtents;
    this.getActiveEnemyCount = getActiveEnemyCount;
    this.getPowerScore = getPowerScore;
  }

  public calculateWavePhase(runTimeSeconds: number): WavePhaseState {
    const cycleIndex = Math.floor(runTimeSeconds / CYCLE_DURATION_SECONDS);
    const cycleTime = runTimeSeconds % CYCLE_DURATION_SECONDS;

    let phase: WavePhase;
    let phaseProgress = 0;
    let densityMultiplier = 1.0;
    let spawnIntervalMultiplier = 1.0;
    let squadMultiplier = 1.0;

    if (cycleTime < PHASE_DURATIONS.breather) {
      // Phase 1: Valley / Breather (0s .. 18s)
      phase = 'breather';
      phaseProgress = cycleTime / PHASE_DURATIONS.breather;
      densityMultiplier = 0.70 + 0.10 * phaseProgress;
      spawnIntervalMultiplier = 1.35 - 0.15 * phaseProgress;
      squadMultiplier = 0.80;
    } else if (cycleTime < PHASE_DURATIONS.breather + PHASE_DURATIONS.buildup) {
      // Phase 2: Build-up (18s .. 48s)
      phase = 'buildup';
      phaseProgress = (cycleTime - PHASE_DURATIONS.breather) / PHASE_DURATIONS.buildup;
      densityMultiplier = 0.95 + 0.25 * phaseProgress;
      spawnIntervalMultiplier = 1.00 - 0.15 * phaseProgress;
      squadMultiplier = 1.00 + 0.20 * phaseProgress;
    } else if (cycleTime < PHASE_DURATIONS.breather + PHASE_DURATIONS.buildup + PHASE_DURATIONS.peak_swarm) {
      // Phase 3: Peak Swarm / Squeeze (48s .. 72s)
      phase = 'peak_swarm';
      phaseProgress = (cycleTime - (PHASE_DURATIONS.breather + PHASE_DURATIONS.buildup)) / PHASE_DURATIONS.peak_swarm;
      densityMultiplier = 1.45 + 0.20 * phaseProgress;
      spawnIntervalMultiplier = 0.65;
      squadMultiplier = 1.40;
    } else {
      // Phase 4: Elite / Climax Event (72s .. 80s)
      phase = 'climax';
      phaseProgress = (cycleTime - (PHASE_DURATIONS.breather + PHASE_DURATIONS.buildup + PHASE_DURATIONS.peak_swarm)) / PHASE_DURATIONS.climax;
      densityMultiplier = 1.30;
      spawnIntervalMultiplier = 0.75;
      squadMultiplier = 1.20;
    }

    this.currentPhaseState.phase = phase;
    this.currentPhaseState.cycleIndex = cycleIndex;
    this.currentPhaseState.cycleTime = cycleTime;
    this.currentPhaseState.phaseProgress = phaseProgress;
    this.currentPhaseState.densityMultiplier = densityMultiplier;
    this.currentPhaseState.spawnIntervalMultiplier = spawnIntervalMultiplier;
    this.currentPhaseState.squadMultiplier = squadMultiplier;

    return this.currentPhaseState;
  }

  private getBaseProgression(minutes: number): { basePop: number; baseSquad: number; baseInterval: number } {
    if (minutes < 0.6) {
      // 0:00 - 0:35 (Smooth intro)
      this.cachedProgression.basePop = 30;
      this.cachedProgression.baseSquad = 5;
      this.cachedProgression.baseInterval = 1250;
    } else if (minutes < 1.25) {
      // 0:35 - 1:15 (Steady expansion)
      this.cachedProgression.basePop = 42;
      this.cachedProgression.baseSquad = 6;
      this.cachedProgression.baseInterval = 1150;
    } else if (minutes < 2.5) {
      // 1:15 - 2:30 (Classic horde pressure)
      this.cachedProgression.basePop = 56;
      this.cachedProgression.baseSquad = 7;
      this.cachedProgression.baseInterval = 1050;
    } else if (minutes < 4.0) {
      // 2:30 - 4:00 (Dense swarm)
      this.cachedProgression.basePop = 68;
      this.cachedProgression.baseSquad = 8;
      this.cachedProgression.baseInterval = 1000;
    } else if (minutes < 6.0) {
      // 4:00 - 6:00 (Medium swarm)
      this.cachedProgression.basePop = 75;
      this.cachedProgression.baseSquad = 8;
      this.cachedProgression.baseInterval = 950;
    } else if (minutes < 8.0) {
      // 6:00 - 8:00 (Solid siege)
      this.cachedProgression.basePop = 85;
      this.cachedProgression.baseSquad = 9;
      this.cachedProgression.baseInterval = 900;
    } else if (minutes < 10.0) {
      // 8:00 - 10:00 (Late siege)
      this.cachedProgression.basePop = 100;
      this.cachedProgression.baseSquad = 10;
      this.cachedProgression.baseInterval = 850;
    } else if (minutes < 12.0) {
      // 10:00 - 12:00 (Climax)
      this.cachedProgression.basePop = 115;
      this.cachedProgression.baseSquad = 12;
      this.cachedProgression.baseInterval = 800;
    } else {
      // 12:00+ (Endless Apocalypse Siege)
      this.cachedProgression.basePop = 130;
      this.cachedProgression.baseSquad = 14;
      this.cachedProgression.baseInterval = 750;
    }
    return this.cachedProgression;
  }

  update(deltaMs: number, runTimeSeconds: number): void {
    if (this.isSpawnPaused) return;
    const minutes = runTimeSeconds / 60;
    const gameState = GameState.getInstance();
    gameState.updatePowerWindow(deltaMs);

    // 0. Dynamic Power Sampling (every 5s for responsive counter-pressure)
    this.directorTimer += deltaMs;
    if (this.directorTimer >= 5000 || this.cachedPowerScore <= 1) {
      this.directorTimer = 0;
      this.cachedPowerScore = this.getPowerScore ? this.getPowerScore() : 1;
    }

    // Direct, responsive HP scaling relative to player power (soft penalty)
    const powerHpFactor = 1 + Math.pow(Math.max(0, this.cachedPowerScore - 1), 0.9) * 0.04;

    // Dynamic TTK Scaling (smooth 2.5m bridge to prevent 3:00 cliff)
    let timeHpFactor: number;
    if (minutes <= 2.5) {
      timeHpFactor = 1 + 0.05 * minutes;
    } else {
      const lateFactor = minutes > 5.5 ? Math.pow(minutes - 5.5, 1.25) * 0.12 : 0;
      timeHpFactor = 1 + 0.05 * 2.5 + 0.16 * (minutes - 2.5) + lateFactor;
    }

    const speedMultiplier = Math.min(1.8, 1 + 0.04 * minutes + (minutes > 7.0 ? (minutes - 7.0) * 0.06 : 0));
    const damageMultiplier = 1 + 0.08 * minutes + (minutes > 7.0 ? (minutes - 7.0) * 0.12 : 0);

    this.currentScaling.hpMultiplier = timeHpFactor * powerHpFactor * this.debugHpMult;
    this.currentScaling.speedMultiplier = speedMultiplier * this.debugSpeedMult;
    this.currentScaling.damageMultiplier = damageMultiplier;

    // 1. Calculate Wave Tension Phase ("Качели" 80-second rhythm)
    const phaseState = this.calculateWavePhase(runTimeSeconds);

    // 2. Endgame Horde Siege Spawns (Milestone bosses at 5:00 and 8:00 handled exclusively via EventDirector)
    if (minutes >= this.nextEndgameSiegeTime) {
      this.nextEndgameSiegeTime += 1.5; // Every 90 seconds after 9.5m
      this.spawnEndgameSiege(this.currentScaling);
    }

    // 3. Periodic Champion Spawn (coordinated with Climax phase or standalone timer)
    if (phaseState.phase === 'climax' && this.lastClimaxSpawnedCycle !== phaseState.cycleIndex && minutes >= 0.8) {
      this.lastClimaxSpawnedCycle = phaseState.cycleIndex;
      this.spawnChampion(minutes, this.currentScaling);
    } else if (minutes >= 0.8) {
      this.championTimer += deltaMs;
      if (this.championTimer >= this.nextChampionInterval) {
        this.championTimer = 0;
        const baseChampInterval = minutes >= 8.0 ? 22000 : 40000;
        this.nextChampionInterval = baseChampInterval + Math.random() * (minutes >= 8.0 ? 8000 : 15000);
        this.spawnChampion(minutes, this.currentScaling);
      }
    }

    // 4. Periodic Wave Surge Events (intensified during peak_swarm)
    this.surgeTimer += deltaMs;
    if (this.surgeTimer >= this.nextSurgeInterval) {
      this.surgeTimer = 0;
      const surgeBase = phaseState.phase === 'peak_swarm' ? 16000 : (minutes >= 8.0 ? 20000 : 32000);
      this.nextSurgeInterval = surgeBase + Math.random() * 8000;
      this.triggerWaveSurge(minutes, this.currentScaling, phaseState.phase);
    }

    // 5. Dynamic Population Targets Modulated by 4-Phase Tension Rhythm
    const baseProg = this.getBaseProgression(minutes);
    const powerPopBonus = Math.min(8, Math.floor(Math.sqrt(Math.max(0, this.cachedPowerScore - 1)) * 2.0));
    const powerSquadBonus = Math.min(2, Math.floor(Math.sqrt(Math.max(0, this.cachedPowerScore - 1)) * 0.5));
    const powerIntervalMod = Math.max(0.75, 1 - Math.max(0, this.cachedPowerScore - 1) * 0.01);

    this.effectiveTargetPop = Math.max(6, Math.round((baseProg.basePop + powerPopBonus) * phaseState.densityMultiplier * this.debugSpawnRateMult));
    this.effectiveSquadSize = Math.max(2, Math.round((baseProg.baseSquad + powerSquadBonus) * phaseState.squadMultiplier));
    this.effectiveWaveInterval = Math.max(200, Math.round((baseProg.baseInterval * phaseState.spawnIntervalMultiplier * powerIntervalMod) / Math.max(0.1, this.debugSpawnRateMult)));

    const activeCount = this.getActiveEnemyCount?.() ?? this.currentActiveCount;
    if (activeCount >= this.effectiveTargetPop) return;

    this.spawnTimer += deltaMs;
    if (this.spawnTimer >= this.effectiveWaveInterval) {
      this.spawnTimer = 0;
      const deficit = this.effectiveTargetPop - activeCount;
      const countToSpawn = Math.min(this.effectiveSquadSize, deficit);

      const mode: SpawnType = phaseState.phase === 'peak_swarm'
        ? (Math.random() < 0.4 ? 'HORIZONTAL' : (Math.random() < 0.7 ? 'VERTICAL' : 'STANDARD'))
        : 'STANDARD';

      this.spawnWaveBatch(minutes, countToSpawn, this.currentScaling, mode, phaseState.phase);
    }
  }

  /**
   * Samples a cluster spawn origin.
   * In STANDARD mode:
   * - When player is moving, selects an angle within the forward hemisphere (±65° from player velocity)
   *   so enemies spawn ahead of the player across their movement path, leaving flanks/rear open for maneuvering.
   * - When player is stationary, selects a random angle across 360°.
   * - Performs an exact O(1) raycast from player to the outer rectangle boundary (viewport + margin).
   * In HORIZONTAL / VERTICAL modes: selects along the appropriate screen edge.
   */
  public sampleClusterOrigin(mode: SpawnType = 'STANDARD'): { x: number; y: number } {
    const player = this.getPlayerPosition();
    const { halfW, halfH } = this.getViewport();

    const margin = 100;
    const outerW = halfW + margin;
    const outerH = halfH + margin;

    if (mode === 'HORIZONTAL') {
      const side = Math.random() < 0.5 ? -1 : 1;
      return {
        x: player.x + side * outerW,
        y: player.y + (Math.random() - 0.5) * 2 * outerH,
      };
    }

    if (mode === 'VERTICAL') {
      const side = Math.random() < 0.5 ? -1 : 1;
      return {
        x: player.x + (Math.random() - 0.5) * 2 * outerW,
        y: player.y + side * outerH,
      };
    }

    // STANDARD: Front-Arc biased perimeter raycast
    const pSpeed = Math.hypot(player.vx, player.vy);
    let angle: number;
    if (pSpeed > 25) {
      const heading = Math.atan2(player.vy, player.vx);
      // ±65° forward cone (Vampire Survivors style forward spawn)
      angle = heading + (Math.random() - 0.5) * 2.27;
    } else {
      angle = Math.random() * Math.PI * 2;
    }

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const absCos = Math.abs(cos) || 0.0001;
    const absSin = Math.abs(sin) || 0.0001;

    let dist: number;
    if (absCos * outerH > absSin * outerW) {
      dist = outerW / absCos;
    } else {
      dist = outerH / absSin;
    }

    return {
      x: player.x + cos * dist,
      y: player.y + sin * dist,
    };
  }

  public sampleSpawnPosition(mode: SpawnType = 'STANDARD'): { x: number; y: number } {
    return this.sampleClusterOrigin(mode);
  }

  private spawnWaveBatch(minutes: number, count: number, scaling: EnemyScaling, mode: SpawnType, phase: WavePhase): void {
    if (count <= 0) return;
    let tankSpawned = 0;
    const maxTanks = minutes >= 2.5 ? (count >= 10 ? 2 : 1) : 0;

    // Pick ONE cluster origin for this squad batch
    const origin = this.sampleClusterOrigin(mode);

    for (let i = 0; i < count; i++) {
      let def: EnemyDefinition;
      if (tankSpawned < maxTanks && (i === 0 || i === Math.floor(count / 2)) && minutes >= 2.5) {
        def = ARMORED_SLUG;
        tankSpawned++;
      } else {
        def = this.selectEnemyDefinition(minutes, phase);
      }

      // Pack members cluster tightly around the squad origin
      const offsetRadius = i === 0 ? 0 : Math.random() * 38;
      const offsetAngle = Math.random() * Math.PI * 2;
      const posX = origin.x + Math.cos(offsetAngle) * offsetRadius;
      const posY = origin.y + Math.sin(offsetAngle) * offsetRadius;

      this.spawnCallback(def, posX, posY, scaling);
    }
  }

  private triggerWaveSurge(minutes: number, scaling: EnemyScaling, phase: WavePhase): void {
    const roll = Math.random();
    const mode: SpawnType = roll < 0.35 ? 'HORIZONTAL' : (roll < 0.70 ? 'VERTICAL' : 'STANDARD');

    if (phase === 'peak_swarm') {
      if (minutes >= 2.5) {
        this.spawnBatchOfType(ARMORED_SLUG, 2, scaling, mode);
        this.spawnBatchOfType(CRAWLER_SWARM, 6, scaling, mode);
      } else {
        this.spawnBatchOfType(CRAWLER_SWARM, 6, scaling, mode);
      }
      return;
    }

    if (minutes < 1.0) {
      this.spawnBatchOfType(roll < 0.5 ? FODDER_BAT : CRAWLER_SWARM, 5, scaling, mode);
    } else if (minutes < 2.25) {
      this.spawnBatchOfType(roll < 0.5 ? CRAWLER_SWARM : SPRINTER_BUG, 6, scaling, mode);
    } else if (minutes < 3.0) {
      if (roll < 0.35) this.spawnBatchOfType(ARMORED_SLUG, 1, scaling, mode);
      this.spawnBatchOfType(CRAWLER_SWARM, 7, scaling, mode);
    } else if (minutes < 7.0) {
      if (roll < 0.4) this.spawnBatchOfType(ARMORED_SLUG, 2, scaling, mode);
      this.spawnBatchOfType(CRAWLER_SWARM, 8, scaling, mode);
    } else {
      if (roll < 0.5) this.spawnBatchOfType(ARMORED_SLUG, 3, scaling, mode);
      this.spawnBatchOfType(CRAWLER_SWARM, 12, scaling, mode);
    }
  }

  private spawnBatchOfType(def: EnemyDefinition, count: number, scaling: EnemyScaling, mode: SpawnType = 'STANDARD'): void {
    const origin = this.sampleClusterOrigin(mode);
    for (let i = 0; i < count; i++) {
      const offsetRadius = i === 0 ? 0 : Math.random() * 40;
      const offsetAngle = Math.random() * Math.PI * 2;
      const posX = origin.x + Math.cos(offsetAngle) * offsetRadius;
      const posY = origin.y + Math.sin(offsetAngle) * offsetRadius;
      this.spawnCallback(def, posX, posY, scaling);
    }
  }

  public onEnemyCulled(count = 1): void {
    // Fast-recycle wrap around: advance spawn timer so replacements appear in front arc
    this.spawnTimer += count * 450;
  }

  setEnemyCount(count: number): void {
    this.currentActiveCount = count;
  }

  private spawnEndgameSiege(scaling: EnemyScaling): void {
    const pos = this.sampleSpawnPosition('STANDARD');
    this.spawnCallback(MINI_BOSS_ELITE, pos.x, pos.y, scaling);
    this.spawnBatchOfType(ARMORED_SLUG, 4, scaling, 'HORIZONTAL');
  }

  private selectEnemyDefinition(minutes: number, phase: WavePhase): EnemyDefinition {
    const roll = Math.random();

    // In Breather phase, favor easy-to-kill fodder bats so player can collect gems
    if (phase === 'breather') {
      if (minutes < 3.0) return roll < 0.80 ? FODDER_BAT : CRAWLER_SWARM;
      if (minutes < 7.0) return roll < 0.60 ? FODDER_BAT : (roll < 0.88 ? CRAWLER_SWARM : SPRINTER_BUG);
      return roll < 0.40 ? FODDER_BAT : (roll < 0.70 ? CRAWLER_SWARM : (roll < 0.88 ? SPRINTER_BUG : ARMORED_SLUG));
    }

    // In Peak Swarm, favor higher aggression units
    if (phase === 'peak_swarm') {
      if (minutes < 2.25) {
        return roll < 0.40 ? FODDER_BAT : (roll < 0.80 ? CRAWLER_SWARM : SPRINTER_BUG);
      } else if (minutes < 3.0) {
        if (roll < 0.25) return FODDER_BAT;
        if (roll < 0.65) return CRAWLER_SWARM;
        if (roll < 0.95) return SPRINTER_BUG;
        return ARMORED_SLUG;
      } else {
        if (roll < 0.15) return FODDER_BAT;
        if (roll < 0.45) return CRAWLER_SWARM;
        if (roll < 0.75) return SPRINTER_BUG;
        if (roll < 0.90) return ARMORED_SLUG;
        return EXPLODER_SPORE;
      }
    }

    // 0:00 - 0:40: 60% Bats, 40% Crawlers
    if (minutes < 0.65) {
      return roll < 0.60 ? FODDER_BAT : CRAWLER_SWARM;
    }

    // 0:40 - 1:20: 35% Bats, 45% Crawlers, 20% Sprinters
    if (minutes < 1.35) {
      if (roll < 0.35) return FODDER_BAT;
      if (roll < 0.80) return CRAWLER_SWARM;
      return SPRINTER_BUG;
    }

    // 1:20 - 2:25: 20% Bats, 40% Crawlers, 28% Sprinters, 12% Tanks
    if (minutes < 2.25) {
      if (roll < 0.20) return FODDER_BAT;
      if (roll < 0.60) return CRAWLER_SWARM;
      if (roll < 0.88) return SPRINTER_BUG;
      return ARMORED_SLUG;
    }

    // 2:25 - 4:00: 15% Bats, 40% Crawlers, 25% Sprinters, 20% Tanks
    if (minutes < 4.0) {
      if (roll < 0.15) return FODDER_BAT;
      if (roll < 0.55) return CRAWLER_SWARM;
      if (roll < 0.80) return SPRINTER_BUG;
      return ARMORED_SLUG;
    }

    // Power Score weight shift: Heavy vanguards for high-power builds
    if (this.cachedPowerScore >= 12 && minutes >= 1.5) {
      if (roll < 0.10) return FODDER_BAT;
      if (roll < 0.60) return CRAWLER_SWARM;
      if (roll < 0.72) return SPRINTER_BUG;
      if (roll < 0.90) return ARMORED_SLUG;
      return EXPLODER_SPORE;
    }

    // 4.0+ min: Full enemy composition (max 12% sprinters)
    if (roll < 0.15) return FODDER_BAT;
    if (roll < 0.55) return CRAWLER_SWARM;
    if (roll < 0.67) return SPRINTER_BUG;
    if (roll < 0.87) return ARMORED_SLUG;
    return EXPLODER_SPORE;
  }

  public getViewport(): { halfW: number; halfH: number; maxRadius: number } {
    const extents = this.getViewportExtents?.() || { halfW: 680, halfH: 400 };
    const halfW = Math.max(450, extents.halfW);
    const halfH = Math.max(320, extents.halfH);
    const maxRadius = Math.hypot(halfW, halfH);

    this.cachedViewport.halfW = halfW;
    this.cachedViewport.halfH = halfH;
    this.cachedViewport.maxRadius = maxRadius;
    return this.cachedViewport;
  }

  /**
   * Spawns strictly outside the visible camera viewport (perimeter + 100px)
   */
  public getScreenPerimeterPosition(): { x: number; y: number } {
    return this.sampleSpawnPosition('STANDARD');
  }

  /**
   * Vampire Survivors Wrap-Around Reposition:
   * Teleports distant enemies outside view in front of the player's movement direction.
   */
  public getRepositionPosition(): { x: number; y: number } {
    const player = this.getPlayerPosition();
    const { maxRadius } = this.getViewport();
    let moveAngle = Math.atan2(player.vy, player.vx);

    // If player is standing still, pick a random angle
    if (player.vx === 0 && player.vy === 0) {
      moveAngle = Math.random() * Math.PI * 2;
    } else {
      // Add slight cone variation (-45 to +45 deg)
      moveAngle += (Math.random() - 0.5) * 1.4;
    }

    const dist = maxRadius + 120 + Math.random() * 80;
    this.scratchPos.x = player.x + Math.cos(moveAngle) * dist;
    this.scratchPos.y = player.y + Math.sin(moveAngle) * dist;
    return this.scratchPos;
  }

  private spawnChampion(minutes: number, scaling: EnemyScaling): void {
    const pos = this.getScreenPerimeterPosition();
    if (!pos) return;
    const def = minutes >= 3.0 ? (Math.random() < 0.6 ? ARMORED_SLUG : SPRINTER_BUG) : (Math.random() < 0.5 ? FODDER_BAT : SPRINTER_BUG);
    this.spawnCallback(def, pos.x, pos.y, scaling, true);
  }

  public spawnDirect(def: EnemyDefinition, x: number, y: number, scaling?: Partial<EnemyScaling>, isChampion?: boolean): void {
    this.currentScaling.hpMultiplier = scaling?.hpMultiplier ?? 1.0;
    this.currentScaling.speedMultiplier = scaling?.speedMultiplier ?? 1.0;
    this.currentScaling.damageMultiplier = scaling?.damageMultiplier ?? 1.0;
    this.spawnCallback(def, x, y, this.currentScaling, isChampion);
  }

  // Public Inspection API for tests, analytics, and QA
  public getCurrentPhase(): WavePhase {
    return this.currentPhaseState.phase;
  }

  public getPhaseState(): Readonly<WavePhaseState> {
    return this.currentPhaseState;
  }

  public getTargetPopulation(): number {
    return this.effectiveTargetPop;
  }

  public getSpawnInterval(): number {
    return this.effectiveWaveInterval;
  }

  public getSquadSize(): number {
    return this.effectiveSquadSize;
  }

  public getPowerScoreValue(): number {
    return this.cachedPowerScore;
  }

  reset(): void {
    this.spawnTimer = 0;
    this.surgeTimer = 0;
    this.nextSurgeInterval = 32000;
    this.championTimer = 0;
    this.nextChampionInterval = 45000;
    this.directorTimer = 0;
    this.cachedPowerScore = 1;
    this.currentActiveCount = 0;
    this.miniBossSpawned = false;
    this.bossSpawned = false;
    this.lastClimaxSpawnedCycle = -1;
  }
}
