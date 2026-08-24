import Phaser from 'phaser';
import { Entity } from '../entities/Entity';
import type { EnemyDefinition } from '../data/definitions';
import type { EnemyScaling } from './SpawnManager';

export class EnemyFactory {
  public static createEnemy(
    enemiesGroup: Phaser.Physics.Arcade.Group,
    definition: EnemyDefinition,
    x: number,
    y: number,
    id: string,
    scaling?: EnemyScaling
  ): Entity {
    const sprite = enemiesGroup.create(x, y, definition.textureKey) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    sprite.setCollideWorldBounds(true);
    sprite.setCircle(definition.size / 2);
    sprite.setData('entityId', id);
    sprite.setDepth(8);

    const hpMult = scaling?.hpMultiplier ?? 1.0;
    const dmgMult = scaling?.damageMultiplier ?? 1.0;
    const spdMult = scaling?.speedMultiplier ?? 1.0;

    const scaledMaxHp = Math.round(definition.stats.maxHp * hpMult);
    const scaledDamage = Math.round(definition.stats.damage * dmgMult);
    const scaledSpeed = Math.round(definition.stats.speed * spdMult);

    return new Entity({
      id,
      type: definition.archetype === 'boss' ? 'boss' : 'enemy',
      stats: {
        ...definition.stats,
        maxHp: scaledMaxHp,
        damage: scaledDamage,
        speed: scaledSpeed,
      },
      sprite,
      definition,
    });
  }
}
