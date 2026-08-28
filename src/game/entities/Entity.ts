import type Phaser from 'phaser';
import { StatsComponent } from './components/StatsComponent';
import type { StatsData } from './components/StatsComponent';
import { HealthComponent } from './components/HealthComponent';
import type { EnemyDefinition } from '../data/definitions';

export type EntityType = 'hero' | 'enemy' | 'projectile' | 'pickup' | 'boss';

export interface EntityConfig {
  id: string;
  type: EntityType;
  stats: StatsData;
  sprite?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  definition?: EnemyDefinition;
}

export class Entity {
  public readonly id: string;
  public readonly type: EntityType;
  public readonly stats: StatsComponent;
  public readonly health: HealthComponent;
  public sprite?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  public definition?: EnemyDefinition;

  // Status effect timers
  private slowTimer = 0;
  private slowAmount = 0;
  private speedBoostTimer = 0;
  private speedBoostAmount = 0;
  private poisonTimer = 0;
  private poisonDps = 0;
  private poisonTickAccumulator = 0;
  public knockbackTimer = 0;
  public knockbackVx = 0;
  public knockbackVy = 0;

  // Attack cooldown tracker for enemies
  public attackCooldown = 0;
  public isExploding = false;

  // Boss state
  public bossPhase = 1;

  // Flanking angle offset (radians) for natural arc spreading
  public flankOffset = (Math.random() - 0.5) * 0.7;
  public isChampion = false;

  constructor(config: EntityConfig) {
    this.id = config.id;
    this.type = config.type;
    this.stats = new StatsComponent(config.stats);
    this.health = new HealthComponent(config.stats.maxHp);
    this.sprite = config.sprite;
    this.definition = config.definition;
  }

  get isAlive(): boolean {
    return this.health.isAlive;
  }

  get x(): number {
    return this.sprite?.x ?? 0;
  }

  get y(): number {
    return this.sprite?.y ?? 0;
  }

  get effectiveSpeed(): number {
    let spd = this.stats.speed;
    if (this.slowTimer > 0) {
      spd *= (1 - this.slowAmount);
    }
    if (this.speedBoostTimer > 0) {
      spd *= this.speedBoostAmount;
    }
    return spd;
  }

  applySpeedBoost(multiplier: number, durationMs: number): void {
    this.speedBoostAmount = multiplier;
    this.speedBoostTimer = durationMs;
  }

  applySlow(percent: number, durationMs: number): void {
    this.slowAmount = percent;
    this.slowTimer = durationMs;
  }

  applyPoison(dps: number, durationMs: number): void {
    this.poisonDps = dps;
    this.poisonTimer = durationMs;
  }

  applyKnockback(vx: number, vy: number, durationMs = 120): void {
    const mass = this.definition?.mass ?? 1;
    const factor = mass > 1 ? Math.max(0.1, 1 / Math.sqrt(mass)) : 1;
    this.knockbackVx = vx * factor;
    this.knockbackVy = vy * factor;
    this.knockbackTimer = durationMs;
    if (this.sprite?.body) {
      this.sprite.body.setVelocity(this.knockbackVx, this.knockbackVy);
    }
  }

  updateStatusEffects(deltaMs: number, onPoisonDamage?: (dmg: number) => void): void {
    // Knockback timer
    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= deltaMs;
    }

    // Speed boost timer
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= deltaMs;
      if (this.speedBoostTimer <= 0) {
        this.speedBoostAmount = 0;
      }
    }

    // Slow effect
    if (this.slowTimer > 0) {
      this.slowTimer -= deltaMs;
      if (this.slowTimer <= 0) {
        this.slowAmount = 0;
      }
    }

    // Poison effect
    if (this.poisonTimer > 0) {
      this.poisonTimer -= deltaMs;
      this.poisonTickAccumulator += deltaMs;

      // Tick every 500ms
      if (this.poisonTickAccumulator >= 500) {
        this.poisonTickAccumulator -= 500;
        const tickDmg = Math.max(1, Math.round(this.poisonDps * 0.5));
        this.health.takeDamage(tickDmg);
        if (onPoisonDamage) {
          onPoisonDamage(tickDmg);
        }
      }
    }
  }

  destroy(): void {
    if (this.sprite) {
      if (this.sprite.scene) {
        this.sprite.scene.tweens.killTweensOf(this.sprite);
      }
      if (this.sprite.body) {
        this.sprite.body.stop();
        this.sprite.body.enable = false;
      }
      this.sprite.destroy();
      this.sprite = undefined;
    }
  }
}
