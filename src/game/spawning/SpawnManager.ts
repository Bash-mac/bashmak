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
  private lastSpawnSide = 0;
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
      // Lower target density (0.48x .. 0.56x), slower spawn interval (1.75x .. 1.60x), small squads
      phase = 'breather';
      phaseProgress = cycleTime / PHASE_DURATIONS.breather;
      densityMultiplier = 0.48 + 0.08 * phaseProgress;
      spawnIntervalMultiplier = 1.75 - 0.15 * phaseProgress;
      squadMultiplier = 0.60;
    } else if (cycleTime < PHASE_DURATIONS.breather + PHASE_DURATIONS.buildup) {
      // Phase 2: Build-up (18s .. 48s)
      // Steadily rising pressure (0.80x .. 1.05x), normalizing interval (1.10x .. 0.95x)
      phase = 'buildup';
      phaseProgress = (cycleTime - PHASE_DURATIONS.breather) / PHASE_DURATIONS.buildup;
      densityMultiplier = 0.80 + 0.25 * phaseProgress;
      spawnIntervalMultiplier = 1.10 - 0.15 * phaseProgress;
      squadMultiplier = 0.90 + 0.20 * phaseProgress;
    } else if (cycleTime < PHASE_DURATIONS.breather + PHASE_DURATIONS.buildup + PHASE_DURATIONS.peak_swarm) {
      // Phase 3: Peak Swarm / Squeeze (48s .. 72s)
      // Dense pressure (1.35x .. 1.55x), rapid spawn intervals (0.70x), large squads
      phase = 'peak_swarm';
      phaseProgress = (cycleTime - (PHASE_DURATIONS.breather + PHASE_DURATIONS.buildup)) / PHASE_DURATIONS.peak_swarm;
      densityMultiplier = 1.35 + 0.20 * phaseProgress;
      spawnIntervalMultiplier = 0.70;
      squadMultiplier = 1.35;
    } else {
      // Phase 4: Elite / Climax Event (72s .. 80s)
      // Maintained high density (1.20x), preparing rewards for following breather
      phase = 'climax';
      phaseProgress = (cycleTime - (PHASE_DURATIONS.breather + PHASE_DURATIONS.buildup + PHASE_DURATIONS.peak_swarm)) / PHASE_DURATIONS.climax;
      densityMultiplier = 1.20;
      spawnIntervalMultiplier = 0.85;
      squadMultiplier = 1.10;
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
      // 0:00 - 0:35 (Smooth intro, small manageable packs)
      this.cachedProgression.basePop = 14;
      this.cachedProgression.baseSquad = 3;
      this.cachedProgression.baseInterval = 2000;
    } else if (minutes < 1.25) {
      // 0:35 - 1:15 (Early expansion)
      this.cachedProgression.basePop = 24;
      this.cachedProgression.baseSquad = 4;
      this.cachedProgression.baseInterval = 1900;
    } else if (minutes < 2.5) {
      // 1:15 - 2:30 (Solid horde formation)
      this.cachedProgression.basePop = 38;
      this.cachedProgression.baseSquad = 6;
      this.cachedProgression.baseInterval = 1800;
    } else if (minutes < 4.0) {
      // 2:30 - 4:00 (Heavy pressure)
      this.cachedProgression.basePop = 56;
      this.cachedProgression.baseSquad = 9;
      this.cachedProgression.baseInterval = 1650;
    } else if (minutes < 6.0) {
      // 4:00 - 6:00 (Massive swarm)
      this.cachedProgression.basePop = 80;
      this.cachedProgression.baseSquad = 12;
      this.cachedProgression.baseInterval = 1450;
    } else if (minutes < 8.0) {
      // 6:00 - 8:00 (Heavy siege)
      this.cachedProgression.basePop = 110;
      this.cachedProgression.baseSquad = 16;
      this.cachedProgression.baseInterval = 1200;
    } else if (minutes < 10.0) {
      // 8:00 - 10:00 (Apocalyptic swarm)
      this.cachedProgression.basePop = 140;
      this.cachedProgression.baseSquad = 20;
      this.cachedProgression.baseInterval = 1000;
    } else if (minutes < 12.0) {
      // 10:00 - 12:00 (Nightmare swarm)
      this.cachedProgression.basePop = 165;
      this.cachedProgression.baseSquad = 24;
      this.cachedProgression.baseInterval = 800;
    } else {
      // 12:00+ (Endless Apocalypse Siege)
      this.cachedProgression.basePop = 190;
      this.cachedProgression.baseSquad = 28;
      this.cachedProgression.baseInterval = 650;
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

    // Direct, responsive HP scaling relative to player power (no artificial 40s freeze)
    const powerHpFactor = 1 + Math.max(0, this.cachedPowerScore - 1) * 0.16;

    // Dynamic TTK Scaling
    const lateFactor = minutes > 5.5 ? Math.pow(minutes - 5.5, 1.65) * 0.24 : 0;
    const timeHpFactor = 1 + 0.25 * minutes + lateFactor;

    const speedMultiplier = Math.min(2.0, 1 + 0.05 * minutes + (minutes > 7.0 ? (minutes - 7.0) * 0.10 : 0));
    const damageMultiplier = 1 + 0.12 * minutes + (minutes > 7.0 ? (minutes - 7.0) * 0.20 : 0) + Math.max(0, this.cachedPowerScore - 1) * 0.03;

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
    const powerPopBonus = Math.floor((this.cachedPowerScore - 1) * 2.5);
    const powerSquadBonus = Math.floor((this.cachedPowerScore - 1) * 0.6);
    const powerIntervalMod = Math.max(0.65, 1 - Math.max(0, this.cachedPowerScore - 1) * 0.02);

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

      if (phaseState.phase === 'peak_swarm') {
        // Directional swarm charge with predictive heading bias
        this.spawnDirectionalSwarm(minutes, countToSpawn, this.currentScaling);
      } else {
        // Standard perimeter wave
        const def = this.selectEnemyDefinition(minutes, phaseState.phase);
        this.spawnPerimeterWave(def, countToSpawn, this.currentScaling);
      }
    }
  }

  private spawnDirectionalSwarm(minutes: number, count: number, scaling: EnemyScaling): void {
    if (count <= 0) return;
    const player = this.getPlayerPosition();
    const { halfW, halfH, maxRadius } = this.getViewport();
    const playerSpeed = Math.hypot(player.vx, player.vy);

    let moveAngle: number;
    if (playerSpeed > 30) {
      moveAngle = Math.atan2(player.vy, player.vx);
    } else {
      moveAngle = Math.random() * Math.PI * 2;
    }

    // Predictive lead distance based on player speed
    const leadDist = Math.min(160, playerSpeed * 1.1);
    const targetCenterX = player.x + Math.cos(moveAngle) * leadDist;
    const targetCenterY = player.y + Math.sin(moveAngle) * leadDist;
    const spawnDist = maxRadius + leadDist + 100;

    let tankSpawned = 0;
    const maxTanks = minutes >= 2.5 ? (count >= 10 ? 2 : 1) : 0;

    for (let i = 0; i < count; i++) {
      const roll = count > 1 ? i / (count - 1) : 0.5;
      let angle = moveAngle;
      const dist = spawnDist + (Math.random() - 0.5) * 60;
      let def: EnemyDefinition;

      if (roll < 0.60) {
        // 60% in front interception cone (+/- 35 degrees)
        angle = moveAngle + (Math.random() - 0.5) * 1.2;
        if (tankSpawned < maxTanks && (i === 0 || i === 1) && minutes >= 2.5) {
          def = ARMORED_SLUG;
          tankSpawned++;
        } else {
          def = this.selectEnemyDefinition(minutes, 'peak_swarm');
        }
      } else if (roll < 0.85) {
        // 25% on flanks (+/- 90 degrees) - sprinters cutting off diagonal escapes
        const flankDir = Math.random() < 0.5 ? 1 : -1;
        angle = moveAngle + flankDir * (Math.PI / 2 + (Math.random() - 0.5) * 0.4);
        def = minutes >= 1.0 ? SPRINTER_BUG : CRAWLER_SWARM;
      } else {
        // 15% trailing behind to complete the encirclement
        angle = moveAngle + Math.PI + (Math.random() - 0.5) * 0.6;
        def = FODDER_BAT;
      }

      let sx = targetCenterX + Math.cos(angle) * dist;
      let sy = targetCenterY + Math.sin(angle) * dist;

      // Strict off-screen clamping: ensure (sx, sy) is outside visible camera viewport [halfW + 80, halfH + 80]
      const dx = sx - player.x;
      const dy = sy - player.y;
      const margin = 80;
      if (Math.abs(dx) < halfW + margin && Math.abs(dy) < halfH + margin) {
        const scaleX = (halfW + margin) / Math.max(1, Math.abs(dx));
        const scaleY = (halfH + margin) / Math.max(1, Math.abs(dy));
        const scale = Math.max(scaleX, scaleY);
        sx = player.x + dx * scale;
        sy = player.y + dy * scale;
      }

      this.spawnCallback(def, sx, sy, scaling);
    }
  }

  private spawnPerimeterWave(def: EnemyDefinition, count: number, scaling: EnemyScaling): void {
    if (count <= 0) return;
    const player = this.getPlayerPosition();
    const { halfW, halfH } = this.getViewport();
    const playerSpeed = Math.hypot(player.vx, player.vy);

    let baseSide: number;

    if (playerSpeed > 35) {
      // Determine player's movement direction (0: Top, 1: Right, 2: Bottom, 3: Left)
      let headingSide: number;
      if (Math.abs(player.vx) > Math.abs(player.vy)) {
        headingSide = player.vx > 0 ? 1 : 3;
      } else {
        headingSide = player.vy > 0 ? 2 : 0;
      }

      // Flank from sides or trail behind to avoid face-planting into player's path
      const flankA = (headingSide + 1) % 4;
      const flankB = (headingSide + 3) % 4;
      const trail = (headingSide + 2) % 4;

      const roll = Math.random();
      if (roll < 0.45) baseSide = flankA;
      else if (roll < 0.90) baseSide = flankB;
      else baseSide = trail;
    } else {
      // Rotate smoothly around perimeter (+1 or -1) when stationary
      const step = Math.random() < 0.5 ? 1 : 3;
      baseSide = (this.lastSpawnSide + step) % 4;
    }

    this.lastSpawnSide = baseSide;
    const adjacentSide = (baseSide + (Math.random() < 0.5 ? 1 : 3)) % 4;

    // Buffer margin: ensures 1.5-2.0s of walking time before reaching camera boundary
    const margin = 110;

    for (let i = 0; i < count; i++) {
      // 70% from main flank, 30% from adjacent angle - leaves escape route open
      const side = (i % 3 === 2) ? adjacentSide : baseSide;
      let x = 0;
      let y = 0;

      if (side === 0) {
        // Top
        x = player.x + (Math.random() - 0.5) * (halfW * 1.8);
        y = player.y - (halfH + margin + Math.random() * 40);
      } else if (side === 1) {
        // Right
        x = player.x + (halfW + margin + Math.random() * 40);
        y = player.y + (Math.random() - 0.5) * (halfH * 1.8);
      } else if (side === 2) {
        // Bottom
        x = player.x + (Math.random() - 0.5) * (halfW * 1.8);
        y = player.y + (halfH + margin + Math.random() * 40);
      } else {
        // Left
        x = player.x - (halfW + margin + Math.random() * 40);
        y = player.y + (Math.random() - 0.5) * (halfH * 1.8);
      }

      // Cap tanks and exploders in a wave: allow up to 2 tanks per squad on larger squads
      let unitDef = def;
      const maxTanks = count >= 8 ? 2 : 1;
      if (def.archetype === 'tank' && i >= maxTanks) {
        unitDef = CRAWLER_SWARM;
      } else if (def.archetype === 'exploder' && i >= 2) {
        unitDef = CRAWLER_SWARM;
      }
      this.spawnCallback(unitDef, x, y, scaling);
    }
  }

  private triggerWaveSurge(minutes: number, scaling: EnemyScaling, phase: WavePhase): void {
    const roll = Math.random();

    if (phase === 'peak_swarm') {
      // Intense peak surges
      if (minutes >= 2.5) {
        if (roll < 0.5) {
          this.spawnPincerSurge(ARMORED_SLUG, 4, scaling);
        } else {
          this.spawnSwarmRush(SPRINTER_BUG, 10, scaling);
        }
      } else {
        this.spawnSwarmRush(SPRINTER_BUG, 8, scaling);
      }
      return;
    }

    if (minutes < 1.0) {
      // Early surges: Small Bat swarm or Crawler pincer
      if (roll < 0.5) {
        this.spawnSwarmRush(FODDER_BAT, 6, scaling);
      } else {
        this.spawnPincerSurge(CRAWLER_SWARM, 6, scaling);
      }
    } else if (minutes < 2.0) {
      // 1:00 - 2:00: Sprinters or Light Tank Pincer (2 Zasorogs charging)
      if (roll < 0.5) {
        this.spawnPincerSurge(ARMORED_SLUG, 2, scaling);
      } else {
        this.spawnSwarmRush(SPRINTER_BUG, 6, scaling);
      }
    } else if (minutes < 7.0) {
      // Mid surges (2:00 - 7:00): Heavy Tank pincer (4 tanks) or Sprinter wave (10 sprinters)
      if (roll < 0.5) {
        this.spawnPincerSurge(ARMORED_SLUG, 4, scaling);
      } else {
        this.spawnSwarmRush(SPRINTER_BUG, 10, scaling);
      }
    } else {
      // Late-game apocalyptic surges (7:00+): Dense Armored Slug Pincer or Massive Sprinter Charge
      if (roll < 0.5) {
        this.spawnPincerSurge(ARMORED_SLUG, 8, scaling);
      } else {
        this.spawnSwarmRush(SPRINTER_BUG, 18, scaling);
      }
    }
  }

  private spawnPincerSurge(def: EnemyDefinition, count: number, scaling: EnemyScaling): void {
    const player = this.getPlayerPosition();
    const { halfW, halfH } = this.getViewport();
    const margin = 100;
    const isHorizontal = Math.random() < 0.5;
    const halfCount = Math.floor(count / 2);

    for (let i = 0; i < halfCount; i++) {
      let x1 = 0;
      let y1 = 0;
      let x2 = 0;
      let y2 = 0;
      if (isHorizontal) {
        const offsetY = (Math.random() - 0.5) * halfH * 1.8;
        x1 = player.x - (halfW + margin);
        y1 = player.y + offsetY;
        x2 = player.x + (halfW + margin);
        y2 = player.y + (Math.random() - 0.5) * halfH * 1.8;
      } else {
        const offsetX = (Math.random() - 0.5) * halfW * 1.8;
        x1 = player.x + offsetX;
        y1 = player.y - (halfH + margin);
        x2 = player.x + (Math.random() - 0.5) * halfH * 1.8;
        y2 = player.y + (halfH + margin);
      }
      this.spawnCallback(def, x1, y1, scaling);
      this.spawnCallback(def, x2, y2, scaling);
    }
  }

  private spawnSwarmRush(def: EnemyDefinition, count: number, scaling: EnemyScaling): void {
    const player = this.getPlayerPosition();
    const { maxRadius } = this.getViewport();
    const clusterAngle = Math.random() * Math.PI * 2;
    const baseDist = maxRadius + 80;

    for (let i = 0; i < count; i++) {
      const spreadAngle = clusterAngle + (Math.random() - 0.5) * 0.45;
      const spreadDist = baseDist + (Math.random() - 0.5) * 60;
      const x = player.x + Math.cos(spreadAngle) * spreadDist;
      const y = player.y + Math.sin(spreadAngle) * spreadDist;
      this.spawnCallback(def, x, y, scaling);
    }
  }

  setEnemyCount(count: number): void {
    this.currentActiveCount = count;
  }

  private spawnEndgameSiege(scaling: EnemyScaling): void {
    const pos = this.getScreenPerimeterPosition();
    this.spawnCallback(MINI_BOSS_ELITE, pos.x, pos.y, scaling);
    this.spawnPincerSurge(ARMORED_SLUG, 4, scaling);
  }

  private selectEnemyDefinition(minutes: number, phase: WavePhase): EnemyDefinition {
    const roll = Math.random();

    // In Breather phase, favor easy-to-kill fodder bats so player can collect gems
    if (phase === 'breather') {
      if (minutes < 3.0) return roll < 0.85 ? FODDER_BAT : CRAWLER_SWARM;
      if (minutes < 7.0) return roll < 0.65 ? FODDER_BAT : (roll < 0.90 ? CRAWLER_SWARM : SPRINTER_BUG);
      return roll < 0.45 ? FODDER_BAT : (roll < 0.75 ? CRAWLER_SWARM : (roll < 0.90 ? SPRINTER_BUG : ARMORED_SLUG));
    }

    // In Peak Swarm, favor higher aggression units
    if (phase === 'peak_swarm') {
      if (minutes < 1.5) {
        return roll < 0.40 ? FODDER_BAT : (roll < 0.85 ? CRAWLER_SWARM : SPRINTER_BUG);
      } else if (minutes < 3.0) {
        if (roll < 0.20) return FODDER_BAT;
        if (roll < 0.55) return CRAWLER_SWARM;
        if (roll < 0.85) return SPRINTER_BUG;
        return ARMORED_SLUG;
      } else {
        if (roll < 0.10) return FODDER_BAT;
        if (roll < 0.35) return CRAWLER_SWARM;
        if (roll < 0.65) return SPRINTER_BUG;
        if (roll < 0.85) return ARMORED_SLUG;
        return EXPLODER_SPORE;
      }
    }

    // 0:00 - 0:45: 75% Bats, 25% Crawlers (NO sprinters or tanks!)
    if (minutes < 0.75) {
      return roll < 0.75 ? FODDER_BAT : CRAWLER_SWARM;
    }

    // 0:45 - 1:30: 45% Bats, 45% Crawlers, 10% Sprinters
    if (minutes < 1.5) {
      if (roll < 0.45) return FODDER_BAT;
      if (roll < 0.90) return CRAWLER_SWARM;
      return SPRINTER_BUG;
    }

    // 1:30 - 2:30: 30% Bats, 45% Crawlers, 20% Sprinters, 5% Armored Slugs
    if (minutes < 2.5) {
      if (roll < 0.30) return FODDER_BAT;
      if (roll < 0.75) return CRAWLER_SWARM;
      if (roll < 0.95) return SPRINTER_BUG;
      return ARMORED_SLUG;
    }

    // 2:30 - 4:00: 20% Bats, 40% Crawlers, 25% Sprinters, 8% Slugs, 7% Exploders
    if (minutes < 4.0) {
      if (roll < 0.20) return FODDER_BAT;
      if (roll < 0.60) return CRAWLER_SWARM;
      if (roll < 0.85) return SPRINTER_BUG;
      if (roll < 0.93) return ARMORED_SLUG;
      return EXPLODER_SPORE;
    }

    // Power Score weight shift: Heavy vanguards for high-power builds
    if (this.cachedPowerScore >= 12 && minutes >= 1.5) {
      if (roll < 0.05) return FODDER_BAT;
      if (roll < 0.25) return CRAWLER_SWARM;
      if (roll < 0.50) return SPRINTER_BUG;
      if (roll < 0.80) return ARMORED_SLUG;
      return EXPLODER_SPORE;
    }

    // 4.0+ min: Full enemy composition
    if (roll < 0.10) return FODDER_BAT;
    if (roll < 0.30) return CRAWLER_SWARM;
    if (roll < 0.55) return SPRINTER_BUG;
    if (roll < 0.80) return ARMORED_SLUG;
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
    const player = this.getPlayerPosition();
    const { halfW, halfH } = this.getViewport();
    const margin = 100;
    const spawnW = halfW + margin;
    const spawnH = halfH + margin;

    const side = Math.floor(Math.random() * 4);
    let offsetX = 0;
    let offsetY = 0;

    switch (side) {
      case 0: // Top
        offsetX = (Math.random() - 0.5) * spawnW * 2;
        offsetY = -spawnH;
        break;
      case 1: // Bottom
        offsetX = (Math.random() - 0.5) * spawnW * 2;
        offsetY = spawnH;
        break;
      case 2: // Left
        offsetX = -spawnW;
        offsetY = (Math.random() - 0.5) * spawnH * 2;
        break;
      case 3: // Right
        offsetX = spawnW;
        offsetY = (Math.random() - 0.5) * spawnH * 2;
        break;
    }

    this.scratchPos.x = player.x + offsetX;
    this.scratchPos.y = player.y + offsetY;
    return this.scratchPos;
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
