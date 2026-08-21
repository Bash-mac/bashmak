import Phaser from 'phaser';
import { StatsComponent } from './components/StatsComponent';
import type { StatsData } from './components/StatsComponent';
import { HealthComponent } from './components/HealthComponent';

export type EntityType = 'hero' | 'enemy' | 'projectile' | 'pickup';

export interface EntityConfig {
  id: string;
  type: EntityType;
  stats: StatsData;
  sprite?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
}

export class Entity {
  public readonly id: string;
  public readonly type: EntityType;
  public readonly stats: StatsComponent;
  public readonly health: HealthComponent;
  public sprite?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

  constructor(config: EntityConfig) {
    this.id = config.id;
    this.type = config.type;
    this.stats = new StatsComponent(config.stats);
    this.health = new HealthComponent(config.stats.maxHp);
    this.sprite = config.sprite;
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

  destroy(): void {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = undefined;
    }
  }
}
