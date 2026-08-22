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
  private poisonTimer = 0;
  private poisonDps = 0;
  private poisonTickAccumulator = 0;

  // Attack cooldown tracker for enemies
  public attackCooldown = 0;
  public isExploding = false;

  // Boss state
  public bossPhase = 1;

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
    if (this.slowTimer > 0) {
      return this.stats.speed * (1 - this.slowAmount);
    }
    return this.stats.speed;
  }

  applySlow(percent: number, durationMs: number): void {
    this.slowAmount = percent;
    this.slowTimer = durationMs;
  }

  applyPoison(dps: number, durationMs: number): void {
    this.poisonDps = dps;
    this.poisonTimer = durationMs;
  }

  updateStatusEffects(deltaMs: number, onPoisonDamage?: (dmg: number) => void): void {
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
      this.sprite.destroy();
      this.sprite = undefined;
    }
  }
}
