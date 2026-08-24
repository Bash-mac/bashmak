import Phaser from 'phaser';
import type { Entity } from '../entities/Entity';
import type { LootSystem } from '../loot/LootSystem';
import { AudioManager } from '../audio/AudioManager';
import { createPlatformAdapter } from '../../platform';

export interface AcidPool {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  radius: number;
  damage: number;
  isPlayerPool: boolean;
  timeLeftMs: number;
  tickCooldown: number;
}

export interface HazardContext {
  scene: Phaser.Scene;
  player: Entity;
  enemiesMap: Map<string, Entity>;
  lootSystem: LootSystem;
  applyDamageToPlayer: (dmg: number) => void;
  applyAreaDamageToEnemies: (x: number, y: number, radius: number, dmg: number) => void;
}

export class HazardSystem {
  private acidPools: AcidPool[] = [];
  private audio = AudioManager.getInstance();
  private platform = createPlatformAdapter();

  public spawnAcidPool(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    damage: number,
    durationMs: number,
    isPlayer: boolean
  ): void {
    if (this.acidPools.length >= 6) {
      const old = this.acidPools.shift();
      old?.sprite.destroy();
    }

    const sprite = scene.add.sprite(x, y, 'vfx_acid_pool_1');
    sprite.setDisplaySize(radius * 2, radius * 2);
    sprite.setAlpha(0.85);
    sprite.setDepth(3);

    if (scene.anims.exists('vfx_anim_acid_pool')) {
      sprite.play('vfx_anim_acid_pool');
    }

    this.acidPools.push({
      sprite,
      x,
      y,
      radius,
      damage,
      isPlayerPool: isPlayer,
      timeLeftMs: durationMs,
      tickCooldown: 500,
    });
  }

  public update(delta: number, ctx: HazardContext): void {
    for (let i = this.acidPools.length - 1; i >= 0; i--) {
      const pool = this.acidPools[i];
      pool.timeLeftMs -= delta;
      pool.tickCooldown -= delta;

      if (pool.timeLeftMs <= 0) {
        pool.sprite.destroy();
        this.acidPools.splice(i, 1);
        continue;
      }

      if (pool.tickCooldown <= 0) {
        pool.tickCooldown = 500;
        if (pool.isPlayerPool) {
          ctx.applyAreaDamageToEnemies(pool.x, pool.y, pool.radius, pool.damage);
        } else {
          const dist = Phaser.Math.Distance.Between(pool.x, pool.y, ctx.player.x, ctx.player.y);
          if (dist <= pool.radius && ctx.player.isAlive) {
            ctx.applyDamageToPlayer(pool.damage);
          }
        }
      }
    }
  }

  public startExploderFuse(enemy: Entity, scene: Phaser.Scene, onDetonate: (e: Entity) => void): void {
    if (enemy.isExploding) return;
    enemy.isExploding = true;

    scene.time.delayedCall(600, () => {
      onDetonate(enemy);
    });

    if (enemy.sprite) {
      enemy.sprite.setVelocity(0, 0);
      scene.tweens.add({
        targets: enemy.sprite,
        scaleX: 1.4,
        scaleY: 1.4,
        duration: 200,
        yoyo: true,
        repeat: 2,
        ease: 'Quad.easeInOut',
      });
      this.flashSprite(scene, enemy.sprite, 0xff0000);
    }
  }

  public detonateExploder(enemy: Entity, ctx: HazardContext): void {
    if (!enemy.sprite) return;
    const x = enemy.x;
    const y = enemy.y;
    const radius = 90;
    const dmg = Math.round(enemy.stats.damage * 1.5);

    enemy.destroy();
    ctx.enemiesMap.delete(enemy.id);
    this.audio.playExplosion();

    const shockwave = ctx.scene.add.circle(x, y, radius, 0xdc2626, 0.7).setDepth(11);
    ctx.scene.tweens.add({
      targets: shockwave,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 250,
      onComplete: () => shockwave.destroy(),
    });

    const distToPlayer = Phaser.Math.Distance.Between(x, y, ctx.player.x, ctx.player.y);
    if (distToPlayer <= radius && ctx.player.isAlive) {
      ctx.applyDamageToPlayer(dmg);
    }

    ctx.lootSystem.spawnGem(x, y, enemy.definition?.xpReward ?? 6);
    ctx.applyAreaDamageToEnemies(x, y, radius, dmg);
  }

  public triggerScreenWipeBlast(scene: Phaser.Scene, x: number, y: number, ctx: HazardContext): void {
    this.audio.playExplosion();
    const blastGfx = scene.add.graphics().setDepth(12);
    blastGfx.lineStyle(6, 0xfacc15, 1);
    blastGfx.fillStyle(0xa855f7, 0.4);
    blastGfx.fillCircle(x, y, 380);
    blastGfx.strokeCircle(x, y, 380);

    scene.tweens.add({
      targets: blastGfx,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 450,
      onComplete: () => blastGfx.destroy(),
    });

    ctx.applyAreaDamageToEnemies(x, y, 380, 250);
    this.platform.vibrate(60);
  }

  public flashSprite(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, tintColor: number): void {
    if (!sprite || !sprite.active) return;
    sprite.setTint(tintColor);
    scene.time.delayedCall(80, () => {
      if (sprite && sprite.active) {
        sprite.clearTint();
      }
    });
  }

  public clear(): void {
    try {
      this.acidPools.forEach((p) => {
        if (p.sprite?.active) {
          p.sprite.destroy();
        }
      });
    } catch {
      // Ignore
    }
    this.acidPools = [];
  }
}
