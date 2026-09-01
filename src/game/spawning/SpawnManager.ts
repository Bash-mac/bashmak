import type { EnemyDefinition } from '../data/definitions';
import { GameState } from '../core/GameState';
import {
  FODDER_BAT,
  CRAWLER_SWARM,
  SPRINTER_BUG,
  ARMORED_SLUG,
  EXPLODER_SPORE,
  MINI_BOSS_ELITE,
  BOSS_KURGAN,
} from '../data/enemies';

export interface EnemyScaling {
  hpMultiplier: number;
  speedMultiplier: number;
  damageMultiplier: number;
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
  public miniBossSpawned = false;
  public bossSpawned = false;

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

  update(deltaMs: number, runTimeSeconds: number): void {
    const minutes = runTimeSeconds / 60;
    const gameState = GameState.getInstance();
    gameState.updatePowerWindow(deltaMs);

    // 0. Stepped Director Power Sampling (every 35s to preserve Power Fantasy window)
    this.directorTimer += deltaMs;
    if (this.directorTimer >= 35000 || this.cachedPowerScore <= 1) {
      this.directorTimer = 0;
      this.cachedPowerScore = this.getPowerScore ? this.getPowerScore() : 1;
    }

    // Freeze powerHpFactor during active Power Window (40s after evolution / max weapon)
    const isPowerWindowActive = gameState.powerWindowTimerMs > 0;
    const powerHpFactor = isPowerWindowActive
      ? 1.0
      : 1 + Math.pow(Math.max(0, this.cachedPowerScore - 1), 0.92) * 0.09;
    const timeHpFactor = 1 + 0.15 * minutes;

    const scaling: EnemyScaling = {
      hpMultiplier: timeHpFactor * powerHpFactor,
      speedMultiplier: Math.min(1.35, 1 + 0.02 * minutes),
      damageMultiplier: 1 + 0.08 * minutes,
    };

    // 1. Timed Boss Spawns
    if (minutes >= 5.0 && !this.miniBossSpawned) {
      this.spawnMiniBoss(scaling);
    }
    if (minutes >= 8.0 && !this.bossSpawned) {
      this.spawnBoss(scaling);
    }

    // 2. Periodic Champion Spawn (every 40-55s starting at 0.8 min)
    if (minutes >= 0.8) {
      this.championTimer += deltaMs;
      if (this.championTimer >= this.nextChampionInterval) {
        this.championTimer = 0;
        this.nextChampionInterval = 40000 + Math.random() * 15000;
        this.spawnChampion(minutes, scaling);
      }
    }

    // 3. Periodic Wave Surge Events (breaks up monotonous trickle)
    this.surgeTimer += deltaMs;
    if (this.surgeTimer >= this.nextSurgeInterval) {
      this.surgeTimer = 0;
      this.nextSurgeInterval = 32000 + Math.random() * 8000;
      this.triggerWaveSurge(minutes, scaling);
    }

    // 4. Dynamic Perimeter Waves (Surrounding Formations & Smooth Pacing)
    const powerSquadBonus = Math.floor((this.cachedPowerScore - 1) * 0.4);
    const powerPopBonus = Math.floor((this.cachedPowerScore - 1) * 1.5);

    let targetPopulation = 14 + powerPopBonus;
    let squadSize = 3 + powerSquadBonus;
    let waveInterval = 2000; // ms between perimeter squad spawns

    if (minutes < 0.6) {
      // 0:00 - 0:35 (Smooth intro, small manageable packs)
      targetPopulation = 14 + powerPopBonus;
      squadSize = 3 + powerSquadBonus;
      waveInterval = 2000;
    } else if (minutes < 1.25) {
      // 0:35 - 1:15 (Building pressure)
      targetPopulation = 28 + powerPopBonus;
      squadSize = 5 + powerSquadBonus;
      waveInterval = 1900;
    } else if (minutes < 2.5) {
      // 1:15 - 2:30 (Solid horde formation)
      targetPopulation = 48 + powerPopBonus;
      squadSize = 8 + powerSquadBonus;
      waveInterval = 1800;
    } else if (minutes < 4.0) {
      // 2:30 - 4:00 (Heavy pressure)
      targetPopulation = 75 + powerPopBonus;
      squadSize = 12 + powerSquadBonus;
      waveInterval = 1650;
    } else if (minutes < 6.0) {
      // 4:00 - 6:00 (Massive swarm)
      targetPopulation = 105 + powerPopBonus;
      squadSize = 16 + powerSquadBonus;
      waveInterval = 1550;
    } else {
      // 6:00+ (Endgame siege)
      targetPopulation = 135 + powerPopBonus;
      squadSize = 20 + powerSquadBonus;
      waveInterval = 1350;
    }

    const activeCount = this.getActiveEnemyCount?.() ?? this.currentActiveCount;
    if (activeCount >= targetPopulation) return;

    this.spawnTimer += deltaMs;
    if (this.spawnTimer >= waveInterval) {
      this.spawnTimer = 0;
      const deficit = targetPopulation - activeCount;
      const countToSpawn = Math.min(squadSize, deficit);

      // Spawn evenly distributed perimeter wave around screen boundaries
      const def = this.selectEnemyDefinition(minutes);
      this.spawnPerimeterWave(def, countToSpawn, scaling);
    }
  }

  private spawnPerimeterWave(def: EnemyDefinition, count: number, scaling: EnemyScaling): void {
    if (count <= 0) return;
    const player = this.getPlayerPosition();
    const { halfW, halfH } = this.getViewport();
    const margin = 80;

    for (let i = 0; i < count; i++) {
      const side = (i + Math.floor(Math.random() * 4)) % 4;
      let x = 0;
      let y = 0;

      if (side === 0) {
        // Top
        x = player.x + (Math.random() - 0.5) * (halfW * 2.2);
        y = player.y - (halfH + margin + Math.random() * 50);
      } else if (side === 1) {
        // Right
        x = player.x + (halfW + margin + Math.random() * 50);
        y = player.y + (Math.random() - 0.5) * (halfH * 2.2);
      } else if (side === 2) {
        // Bottom
        x = player.x + (Math.random() - 0.5) * (halfW * 2.2);
        y = player.y + (halfH + margin + Math.random() * 50);
      } else {
        // Left
        x = player.x - (halfW + margin + Math.random() * 50);
        y = player.y + (Math.random() - 0.5) * (halfH * 2.2);
      }

      // Cap tanks and exploders in a wave: at most 1 tank per squad, rest are regular swarms
      let unitDef = def;
      if (def.archetype === 'tank' && i >= 1) {
        unitDef = CRAWLER_SWARM;
      } else if (def.archetype === 'exploder' && i >= 2) {
        unitDef = CRAWLER_SWARM;
      }
      this.spawnCallback(unitDef, x, y, scaling);
    }
  }

  private triggerWaveSurge(minutes: number, scaling: EnemyScaling): void {
    const roll = Math.random();

    if (minutes < 1.0) {
      // Early surges: Small Bat swarm or Crawler pincer
      if (roll < 0.5) {
        this.spawnSwarmRush(FODDER_BAT, 6, scaling);
      } else {
        this.spawnPincerSurge(CRAWLER_SWARM, 6, scaling);
      }
    } else if (minutes < 2.5) {
      // Mid-early surges: Light Sprinter pincer or Crawler swarm
      if (roll < 0.5) {
        this.spawnPincerSurge(SPRINTER_BUG, 5, scaling);
      } else {
        this.spawnSwarmRush(CRAWLER_SWARM, 8, scaling);
      }
    } else {
      // Mid/late surges: Light Tank pincer (2-3 tanks) or Sprinter wave
      if (roll < 0.5) {
        this.spawnPincerSurge(ARMORED_SLUG, 3, scaling);
      } else {
        this.spawnSwarmRush(SPRINTER_BUG, 6, scaling);
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

  private spawnMiniBoss(scaling: EnemyScaling): void {
    this.miniBossSpawned = true;
    const pos = this.getScreenPerimeterPosition();
    this.spawnCallback(MINI_BOSS_ELITE, pos.x, pos.y, scaling);
  }

  private spawnBoss(scaling: EnemyScaling): void {
    this.bossSpawned = true;
    const pos = this.getScreenPerimeterPosition();
    this.spawnCallback(BOSS_KURGAN, pos.x, pos.y, scaling);
  }

  private selectEnemyDefinition(minutes: number): EnemyDefinition {
    const roll = Math.random();

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
    return { halfW, halfH, maxRadius };
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

    return {
      x: player.x + offsetX,
      y: player.y + offsetY,
    };
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
    return {
      x: player.x + Math.cos(moveAngle) * dist,
      y: player.y + Math.sin(moveAngle) * dist,
    };
  }

  private spawnChampion(minutes: number, scaling: EnemyScaling): void {
    const pos = this.getScreenPerimeterPosition();
    if (!pos) return;
    const def = minutes >= 3.0 ? (Math.random() < 0.6 ? ARMORED_SLUG : SPRINTER_BUG) : (Math.random() < 0.5 ? FODDER_BAT : SPRINTER_BUG);
    this.spawnCallback(def, pos.x, pos.y, scaling, true);
  }

  public spawnDirect(def: EnemyDefinition, x: number, y: number, scaling?: Partial<EnemyScaling>, isChampion?: boolean): void {
    const fullScaling: EnemyScaling = {
      hpMultiplier: scaling?.hpMultiplier ?? 1.0,
      speedMultiplier: scaling?.speedMultiplier ?? 1.0,
      damageMultiplier: scaling?.damageMultiplier ?? 1.0,
    };
    this.spawnCallback(def, x, y, fullScaling, isChampion);
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
  }
}
