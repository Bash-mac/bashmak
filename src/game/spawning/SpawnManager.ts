import type { EnemyDefinition } from '../data/definitions';
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

  private spawnTimer = 0;
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

    // 0. Stepped Director Power Sampling (every 35s to preserve Power Fantasy window)
    this.directorTimer += deltaMs;
    if (this.directorTimer >= 35000 || this.cachedPowerScore <= 1) {
      this.directorTimer = 0;
      this.cachedPowerScore = this.getPowerScore ? this.getPowerScore() : 1;
    }

    // Sub-linear Power Scaling (< 1.0 exponent) ensures player DPS always outpaces mob HP
    const powerHpFactor = 1 + Math.pow(Math.max(0, this.cachedPowerScore - 1), 0.85) * 0.07;
    const timeHpFactor = 1 + 0.12 * minutes;

    const scaling: EnemyScaling = {
      hpMultiplier: timeHpFactor * powerHpFactor,
      speedMultiplier: Math.min(1.22, 1 + 0.02 * minutes),
      damageMultiplier: 1 + 0.08 * minutes,
    };

    // 1. Timed Boss Spawns
    if (minutes >= 5.0 && !this.miniBossSpawned) {
      this.spawnMiniBoss(scaling);
    }
    if (minutes >= 8.0 && !this.bossSpawned) {
      this.spawnBoss(scaling);
    }

    // 2. Periodic Champion Spawn (every 45-60s starting at 1.5 min)
    if (minutes >= 1.5) {
      this.championTimer += deltaMs;
      if (this.championTimer >= this.nextChampionInterval) {
        this.championTimer = 0;
        this.nextChampionInterval = 65000 + Math.random() * 20000;
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

    // 4. Dynamic Directional Squad Waves (Pacing, Formations & Density Scaling)
    const powerSquadBonus = Math.floor((this.cachedPowerScore - 1) * 0.35);
    const powerPopBonus = Math.floor((this.cachedPowerScore - 1) * 1.5);

    let targetPopulation = 20 + powerPopBonus;
    let squadSize = 6 + powerSquadBonus;
    let waveInterval = 2400; // ms between directional squad spawns

    if (minutes < 0.5) {
      // 0:00 - 0:30 (Tutorial / early pacing)
      targetPopulation = 18 + powerPopBonus;
      squadSize = 5 + powerSquadBonus;
      waveInterval = 2500;
    } else if (minutes < 1.5) {
      // 0:30 - 1:30
      targetPopulation = 28 + powerPopBonus;
      squadSize = 7 + powerSquadBonus;
      waveInterval = 2200;
    } else if (minutes < 3.0) {
      // 1:30 - 3:00
      targetPopulation = 45 + powerPopBonus;
      squadSize = 9 + powerSquadBonus;
      waveInterval = 1900;
    } else if (minutes < 5.0) {
      // 3:00 - 5:00
      targetPopulation = 65 + powerPopBonus;
      squadSize = 12 + powerSquadBonus;
      waveInterval = 1700;
    } else if (minutes < 7.0) {
      // 5:00 - 7:00
      targetPopulation = 85 + powerPopBonus;
      squadSize = 14 + powerSquadBonus;
      waveInterval = 1500;
    } else {
      // 7:00+ (Endgame swarm)
      targetPopulation = 100 + powerPopBonus;
      squadSize = 16 + powerSquadBonus;
      waveInterval = 1300;
    }

    const activeCount = this.getActiveEnemyCount?.() ?? this.currentActiveCount;
    if (activeCount >= targetPopulation) return;

    this.spawnTimer += deltaMs;
    if (this.spawnTimer >= waveInterval) {
      this.spawnTimer = 0;
      const deficit = targetPopulation - activeCount;
      const countToSpawn = Math.min(squadSize, deficit);

      // Spawn a homogeneous directional squad from one distinct flank/angle
      const def = this.selectEnemyDefinition(minutes);
      this.spawnDirectionalSquad(def, countToSpawn, scaling);
    }
  }

  private spawnDirectionalSquad(def: EnemyDefinition, count: number, scaling: EnemyScaling): void {
    if (count <= 0) return;
    const player = this.getPlayerPosition();
    const { maxRadius } = this.getViewport();
    const baseDist = maxRadius + 70;

    // Pick a distinct flank/sector (ahead/flank/behind)
    let baseAngle = Math.random() * Math.PI * 2;
    if (player.vx !== 0 || player.vy !== 0) {
      const moveAngle = Math.atan2(player.vy, player.vx);
      const roll = Math.random();
      if (roll < 0.45) {
        // Intercept ahead (cone +/- 35 deg)
        baseAngle = moveAngle + (Math.random() - 0.5) * 0.7;
      } else if (roll < 0.80) {
        // Flank perpendicular (left or right)
        baseAngle = moveAngle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.4;
      } else {
        // Pursue from rear
        baseAngle = moveAngle + Math.PI + (Math.random() - 0.5) * 0.6;
      }
    }

    // Spread the squad tightly in a directional wedge (arc ~25-35 deg)
    const wedgeSpread = Math.min(0.55, 0.08 * count);
    const startAngle = baseAngle - wedgeSpread / 2;
    const angleStep = count > 1 ? wedgeSpread / (count - 1) : 0;

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * angleStep;
      const depthOffset = (Math.random() - 0.5) * 45 + (i % 2 === 0 ? 0 : 30);
      const dist = baseDist + depthOffset;
      const x = player.x + Math.cos(angle) * dist;
      const y = player.y + Math.sin(angle) * dist;
      // Cap exploders in a single squad to at most 2 to prevent audio/FPS cascade
      const unitDef = def.archetype === 'exploder' && i >= 2 ? CRAWLER_SWARM : def;
      this.spawnCallback(unitDef, x, y, scaling);
    }
  }

  private triggerWaveSurge(minutes: number, scaling: EnemyScaling): void {
    const roll = Math.random();

    if (minutes < 0.7) {
      // Early surges: Mini-Swarm or Pincer
      if (roll < 0.5) {
        this.spawnSwarmRush(FODDER_BAT, 8, scaling);
      } else {
        this.spawnPincerSurge(CRAWLER_SWARM, 8, scaling);
      }
    } else if (minutes < 2.0) {
      // Mid-early surges: Sprinter rush or Pincer
      if (roll < 0.5) {
        this.spawnPincerSurge(SPRINTER_BUG, 8, scaling);
      } else {
        this.spawnSwarmRush(CRAWLER_SWARM, 10, scaling);
      }
    } else {
      // Mid/late surges: Slugs pincer or Sprinter swarm
      if (roll < 0.5) {
        this.spawnPincerSurge(ARMORED_SLUG, 8, scaling);
      } else {
        this.spawnSwarmRush(SPRINTER_BUG, 12, scaling);
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
        x2 = player.x + (Math.random() - 0.5) * halfW * 1.8;
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

    // 0:00 - 0:15: 80% Bats, 20% Crawlers
    if (minutes < 0.25) {
      return roll < 0.80 ? FODDER_BAT : CRAWLER_SWARM;
    }

    // 0:15 - 0:40: 60% Bats, 30% Crawlers, 10% Sprinters
    if (minutes < 0.65) {
      if (roll < 0.60) return FODDER_BAT;
      if (roll < 0.90) return CRAWLER_SWARM;
      return SPRINTER_BUG;
    }

    // 0:40 - 1:15: 40% Bats, 40% Crawlers, 20% Sprinters
    if (minutes < 1.25) {
      if (roll < 0.40) return FODDER_BAT;
      if (roll < 0.80) return CRAWLER_SWARM;
      return SPRINTER_BUG;
    }

    // 1:15 - 2:30: 20% Bats, 35% Crawlers, 30% Sprinters, 15% Armored Slugs
    if (minutes < 2.5) {
      if (roll < 0.20) return FODDER_BAT;
      if (roll < 0.55) return CRAWLER_SWARM;
      if (roll < 0.85) return SPRINTER_BUG;
      return ARMORED_SLUG;
    }

    // 2:30 - 4:00: 15% Bats, 25% Crawlers, 25% Sprinters, 25% Slugs, 10% Exploders
    if (minutes < 4.0) {
      if (roll < 0.15) return FODDER_BAT;
      if (roll < 0.40) return CRAWLER_SWARM;
      if (roll < 0.65) return SPRINTER_BUG;
      if (roll < 0.90) return ARMORED_SLUG;
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
