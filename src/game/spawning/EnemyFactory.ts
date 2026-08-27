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
    const scale = definition.displayScale ?? Math.max(0.2, (definition.size || 16) / 64);
    sprite.setScale(scale);

    const radius = Math.max(12, (definition.size || 16) * 0.85);
    sprite.setCollideWorldBounds(true);
    if (sprite.body) {
      const texRadius = radius / scale;
      const originW = sprite.width || 256;
      const originH = sprite.height || 256;
      sprite.body.setCircle(
        texRadius,
        (originW - texRadius * 2) / 2,
        (originH - texRadius * 2) / 2
      );
    }
    sprite.setData('entityId', id);
    sprite.setDepth(8);

    if (definition.animKey && sprite.scene.anims.exists(definition.animKey)) {
      sprite.play(definition.animKey);
    }

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
