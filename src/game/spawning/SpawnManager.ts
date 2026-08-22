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

  private spawnTimer = 0;
  private currentActiveCount = 0;
  public miniBossSpawned = false;
  public bossSpawned = false;

  constructor(
    getPlayerPosition: () => { x: number; y: number; vx: number; vy: number },
    spawnCallback: (definition: EnemyDefinition, x: number, y: number, scaling: EnemyScaling) => void
  ) {
    this.getPlayerPosition = getPlayerPosition;
    this.spawnCallback = spawnCallback;
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
    if (minutes >= 10.0 && !this.bossSpawned) {
      this.spawnBoss(scaling);
    }

    // 2. Exact Vampire Survivors Target Population Curve
    let targetPopulation = 25;
    if (minutes < 1.0) {
      targetPopulation = 25;
    } else if (minutes < 2.5) {
      targetPopulation = 45;
    } else if (minutes < 4.0) {
      targetPopulation = 70;
    } else if (minutes < 5.0) {
      targetPopulation = 90;
    } else if (minutes < 8.0) {
      targetPopulation = 110;
    } else {
      targetPopulation = 130;
    }

    // If population is healthy, check interval
    if (this.currentActiveCount >= targetPopulation) return;

    this.spawnTimer += deltaMs;
    // Fast replenishment (every 250ms spawn batches of 3-5 until target is reached)
    if (this.spawnTimer >= 250) {
      this.spawnTimer = 0;
      const deficit = targetPopulation - this.currentActiveCount;
      const batchSize = Math.min(5, deficit);

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

    // 0-1.0 min: 60% Fodder Bats, 40% Crawlers
    if (minutes < 1.0) {
      return roll < 0.6 ? FODDER_BAT : CRAWLER_SWARM;
    }

    // 1.0-1.5 min: 45% Bats, 45% Crawlers, 10% Sprinters
    if (minutes < 1.5) {
      if (roll < 0.45) return FODDER_BAT;
      if (roll < 0.90) return CRAWLER_SWARM;
      return SPRINTER_BUG;
    }

    // 1.5-3.0 min: 20% Bats, 40% Crawlers, 25% Sprinters, 15% Armored Slugs
    if (minutes < 3.0) {
      if (roll < 0.20) return FODDER_BAT;
      if (roll < 0.60) return CRAWLER_SWARM;
      if (roll < 0.85) return SPRINTER_BUG;
      return ARMORED_SLUG;
    }

    // 3.0+ min: Full enemy composition (including Exploder Spores)
    if (roll < 0.15) return FODDER_BAT;
    if (roll < 0.45) return CRAWLER_SWARM;
    if (roll < 0.65) return SPRINTER_BUG;
    if (roll < 0.85) return ARMORED_SLUG;
    return EXPLODER_SPORE;
  }

  /**
   * Spawns strictly outside the camera viewport (perimeter + 60px)
   */
  public getScreenPerimeterPosition(): { x: number; y: number } {
    const player = this.getPlayerPosition();
    // 1280x720 screen half-extents
    const halfW = 680;
    const halfH = 400;

    const side = Math.floor(Math.random() * 4);
    let offsetX = 0;
    let offsetY = 0;

    switch (side) {
      case 0: // Top
        offsetX = (Math.random() - 0.5) * halfW * 2;
        offsetY = -halfH - 50;
        break;
      case 1: // Bottom
        offsetX = (Math.random() - 0.5) * halfW * 2;
        offsetY = halfH + 50;
        break;
      case 2: // Left
        offsetX = -halfW - 50;
        offsetY = (Math.random() - 0.5) * halfH * 2;
        break;
      case 3: // Right
        offsetX = halfW + 50;
        offsetY = (Math.random() - 0.5) * halfH * 2;
        break;
    }

    return {
      x: player.x + offsetX,
      y: player.y + offsetY,
    };
  }

  /**
   * Vampire Survivors Wrap-Around Reposition:
   * Teleports distant enemies in front of the player's movement direction.
   */
  public getRepositionPosition(): { x: number; y: number } {
    const player = this.getPlayerPosition();
    let moveAngle = Math.atan2(player.vy, player.vx);

    // If player is standing still, pick a random angle
    if (player.vx === 0 && player.vy === 0) {
      moveAngle = Math.random() * Math.PI * 2;
    } else {
      // Add slight cone variation (-45 to +45 deg)
      moveAngle += (Math.random() - 0.5) * 1.4;
    }

    const dist = 500 + Math.random() * 80;
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
