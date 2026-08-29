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

  private spawnTimer = 0;
  private surgeTimer = 0;
  private nextSurgeInterval = 18000;
  private championTimer = 0;
  private nextChampionInterval = 45000;
  private currentActiveCount = 0;
  public miniBossSpawned = false;
  public bossSpawned = false;

  constructor(
    getPlayerPosition: () => { x: number; y: number; vx: number; vy: number },
    spawnCallback: (definition: EnemyDefinition, x: number, y: number, scaling: EnemyScaling, isChampion?: boolean) => void,
    getViewportExtents?: () => { halfW: number; halfH: number },
    getActiveEnemyCount?: () => number
  ) {
    this.getPlayerPosition = getPlayerPosition;
    this.spawnCallback = spawnCallback;
    this.getViewportExtents = getViewportExtents;
    this.getActiveEnemyCount = getActiveEnemyCount;
  }

  update(deltaMs: number, runTimeSeconds: number): void {
    const minutes = runTimeSeconds / 60;

    // Time scaling multipliers: HP +22%/min, Speed +3%/min (capped 1.25), Damage +15%/min
    const scaling: EnemyScaling = {
      hpMultiplier: 1 + 0.22 * minutes,
      speedMultiplier: Math.min(1.25, 1 + 0.03 * minutes),
      damageMultiplier: 1 + 0.15 * minutes,
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

    // 3. Dynamic Target Population Curve
    let targetPopulation = 18;
    let maxBatchSize = 3;
    let spawnInterval = 450;

    if (minutes < 0.5) {
      // 0:00 - 0:30 (Energetic start)
      targetPopulation = 16;
      maxBatchSize = 3;
      spawnInterval = 450;
    } else if (minutes < 1.0) {
      // 0:30 - 1:00 (Ramping up)
      targetPopulation = 24;
      maxBatchSize = 4;
      spawnInterval = 350;
    } else if (minutes < 2.0) {
      // 1:00 - 2:00
      targetPopulation = 40;
      maxBatchSize = 5;
      spawnInterval = 260;
    } else if (minutes < 3.5) {
      // 2:00 - 3:30
      targetPopulation = 55;
      maxBatchSize = 6;
      spawnInterval = 200;
    } else if (minutes < 5.0) {
      // 3:30 - 5:00
      targetPopulation = 72;
      maxBatchSize = 6;
      spawnInterval = 170;
    } else if (minutes < 7.0) {
      // 5:00 - 7:00
      targetPopulation = 85;
      maxBatchSize = 7;
      spawnInterval = 150;
    } else {
      // 7:00+ (Endgame swarm)
      targetPopulation = 100;
      maxBatchSize = 7;
      spawnInterval = 140;
    }

    const activeCount = this.getActiveEnemyCount?.() ?? this.currentActiveCount;
    if (activeCount >= targetPopulation) return;

    this.spawnTimer += deltaMs;
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      const deficit = targetPopulation - activeCount;
      const batchSize = Math.min(maxBatchSize, deficit);

      for (let i = 0; i < batchSize; i++) {
        const def = this.selectEnemyDefinition(minutes);
        const pos = this.getScreenPerimeterPosition();
        this.spawnCallback(def, pos.x, pos.y, scaling);
      }
    }
  }

  private triggerWaveSurge(minutes: number, scaling: EnemyScaling): void {
    const roll = Math.random();

    if (minutes < 0.7) {
      // Early surges: Mini-Swarm or Pincer
      if (roll < 0.5) {
        this.spawnSwarmRush(FODDER_BAT, 6, scaling);
      } else {
        this.spawnPincerSurge(CRAWLER_SWARM, 6, scaling);
      }
    } else if (minutes < 2.0) {
      // Mid-early surges: Sprinter rush, Swarm or (rare) Ring ambush
      if (roll < 0.35) {
        this.spawnRingSurge(FODDER_BAT, 9, scaling);
      } else if (roll < 0.70) {
        this.spawnPincerSurge(SPRINTER_BUG, 6, scaling);
      } else {
        this.spawnSwarmRush(CRAWLER_SWARM, 8, scaling);
      }
    } else {
      // Mid/late surges: Mixed Swarm, Sprinter pincer, (rare) broken Ring
      if (roll < 0.30) {
        this.spawnRingSurge(CRAWLER_SWARM, 10, scaling);
      } else if (roll < 0.70) {
        this.spawnPincerSurge(ARMORED_SLUG, 6, scaling);
      } else {
        this.spawnSwarmRush(SPRINTER_BUG, 8, scaling);
      }
    }
  }

  private spawnRingSurge(def: EnemyDefinition, count: number, scaling: EnemyScaling): void {
    const player = this.getPlayerPosition();
    const { maxRadius } = this.getViewport();
    const spawnRadius = maxRadius + 70;

    // Open a ~110° escape corridor toward the player's movement direction
    let gapAngle = Math.atan2(player.vy, player.vx);
    if (player.vx === 0 && player.vy === 0) {
      gapAngle = Math.random() * Math.PI * 2;
    }
    const gapSize = Math.PI * 0.6;
    const arc = Math.PI * 2 - gapSize;
    const startAngle = gapAngle + gapSize / 2 + Math.random() * 0.3;
    const angleStep = arc / (count - 1);

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * angleStep;
      const x = player.x + Math.cos(angle) * spawnRadius;
      const y = player.y + Math.sin(angle) * spawnRadius;
      this.spawnCallback(def, x, y, scaling);
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
    this.currentActiveCount = 0;
    this.miniBossSpawned = false;
    this.bossSpawned = false;
  }
}
