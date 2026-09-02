import Phaser from 'phaser';
import { Entity } from '../entities/Entity';
import type { EnemyDefinition } from '../data/definitions';
import type { EnemyScaling } from './SpawnManager';
import type { EnemyPool } from '../pools/EnemyPool';

export class EnemyFactory {
  public static createEnemy(
    pool: EnemyPool,
    definition: EnemyDefinition,
    x: number,
    y: number,
    id: string,
    scaling?: EnemyScaling,
    isChampion = false,
    scene?: Phaser.Scene
  ): Entity {
    const sprite = pool.acquire(definition.textureKey, x, y);

    const baseScale = definition.displayScale ?? Math.max(0.2, (definition.size || 16) / 64);
    const scale = isChampion ? baseScale * 1.38 : baseScale;
    sprite.setScale(scale);

    const radius = Math.max(12, (definition.size || 16) * 0.85 * (isChampion ? 1.3 : 1.0));
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
    sprite.setDepth(isChampion ? 10 : 8);

    const sc = scene ?? sprite.scene;
    if (definition.animKey && sc.anims.exists(definition.animKey)) {
      sprite.play(definition.animKey);
    }

    if (isChampion) {
      sprite.setTint(0xffd700);
      sc.tweens.add({
        targets: sprite,
        alpha: { from: 0.82, to: 1.0 },
        duration: 320,
        repeat: -1,
        yoyo: true,
      });
    }

    const hpMult = scaling?.hpMultiplier ?? 1.0;
    const dmgMult = scaling?.damageMultiplier ?? 1.0;
    const spdMult = scaling?.speedMultiplier ?? 1.0;

    const isBoss = definition.archetype === 'boss' || definition.archetype === 'miniboss';
    const speedJitter = isBoss ? 1.0 : 0.88 + Math.random() * 0.24;
    const champHpMult = isChampion ? 7.5 : 1.0;
    const champDmgMult = isChampion ? 1.35 : 1.0;

    const scaledMaxHp = Math.round(definition.stats.maxHp * hpMult * champHpMult);
    const scaledDamage = Math.round(definition.stats.damage * dmgMult * champDmgMult);
    const scaledSpeed = Math.round(definition.stats.speed * spdMult * speedJitter);

    const entity = new Entity({
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
    entity.isChampion = isChampion;
    return entity;
  }
}
