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
  private spawnCallback: (definition: EnemyDefinition, x: number, y: number, scaling: EnemyScaling) => void;
  private getActiveEnemyCount?: () => number;
  private getViewportExtents?: () => { halfW: number; halfH: number };

  private spawnTimer = 0;
  private currentActiveCount = 0;
  public miniBossSpawned = false;
  public bossSpawned = false;

  constructor(
    getPlayerPosition: () => { x: number; y: number; vx: number; vy: number },
    spawnCallback: (definition: EnemyDefinition, x: number, y: number, scaling: EnemyScaling) => void,
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

    // Time scaling multipliers: HP +25%/min, Speed +5%/min, Damage +15%/min
    const scaling: EnemyScaling = {
      hpMultiplier: 1 + 0.25 * minutes,
      speedMultiplier: 1 + 0.05 * minutes,
      damageMultiplier: 1 + 0.15 * minutes,
    };

    // 1. Timed Event Spawns
    if (minutes >= 5.0 && !this.miniBossSpawned) {
      this.spawnMiniBoss(scaling);
    }
    if (minutes >= 8.0 && !this.bossSpawned) {
      this.spawnBoss(scaling);
    }

    // 2. Smooth Early-Game to Late-Game Target Population Curve
    let targetPopulation = 5;
    let maxBatchSize = 1;
    let spawnInterval = 1200;

    if (minutes < 0.4) {
      // 0:00 - 0:24 (Warmup / tutorial farm)
      targetPopulation = 5;
      maxBatchSize = 1;
      spawnInterval = 1200;
    } else if (minutes < 0.8) {
      // 0:24 - 0:48 (Early trickle)
      targetPopulation = 10;
      maxBatchSize = 2;
      spawnInterval = 800;
    } else if (minutes < 1.5) {
      // 0:48 - 1:30 (First steady swarm)
      targetPopulation = 22;
      maxBatchSize = 3;
      spawnInterval = 500;
    } else if (minutes < 2.5) {
      targetPopulation = 42;
      maxBatchSize = 4;
      spawnInterval = 350;
    } else if (minutes < 4.0) {
      targetPopulation = 65;
      maxBatchSize = 5;
      spawnInterval = 250;
    } else if (minutes < 6.0) {
      targetPopulation = 90;
      maxBatchSize = 5;
      spawnInterval = 200;
    } else if (minutes < 8.0) {
      targetPopulation = 110;
      maxBatchSize = 6;
      spawnInterval = 200;
    } else {
      targetPopulation = 130;
      maxBatchSize = 7;
      spawnInterval = 180;
    }

    const activeCount = this.getActiveEnemyCount?.() ?? this.currentActiveCount;
    // If population is healthy, check interval
    if (activeCount >= targetPopulation) return;

    this.spawnTimer += deltaMs;
    // Replenish deficit smoothly
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

    // 0:00 - 0:30 (0 - 0.5m): 100% Fodder Bats (warmup XP farm)
    if (minutes < 0.5) {
      return FODDER_BAT;
    }

    // 0:30 - 1:15 (0.5 - 1.25m): 75% Bats, 25% slow Crawlers
    if (minutes < 1.25) {
      return roll < 0.75 ? FODDER_BAT : CRAWLER_SWARM;
    }

    // 1:15 - 2:00 (1.25 - 2.0m): 45% Bats, 45% Crawlers, 10% Sprinters
    if (minutes < 2.0) {
      if (roll < 0.45) return FODDER_BAT;
      if (roll < 0.90) return CRAWLER_SWARM;
      return SPRINTER_BUG;
    }

    // 2:00 - 3.5m: 20% Bats, 45% Crawlers, 20% Sprinters, 15% Armored Slugs
    if (minutes < 3.5) {
      if (roll < 0.20) return FODDER_BAT;
      if (roll < 0.65) return CRAWLER_SWARM;
      if (roll < 0.85) return SPRINTER_BUG;
      return ARMORED_SLUG;
    }

    // 3.5+ min: Full enemy composition (including Exploder Spores)
    if (roll < 0.15) return FODDER_BAT;
    if (roll < 0.45) return CRAWLER_SWARM;
    if (roll < 0.65) return SPRINTER_BUG;
    if (roll < 0.85) return ARMORED_SLUG;
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

  reset(): void {
    this.spawnTimer = 0;
    this.currentActiveCount = 0;
    this.miniBossSpawned = false;
    this.bossSpawned = false;
  }
}
