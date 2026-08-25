import Phaser from 'phaser';
import type { Entity } from '../entities/Entity';
import type { LootSystem } from '../loot/LootSystem';
import { AudioManager } from '../audio/AudioManager';
import { createPlatformAdapter } from '../../platform';
import { ObjectPool } from '../pools/ObjectPool';

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
  private poolSpritePool?: ObjectPool<Phaser.GameObjects.Sprite>;
  private audio = AudioManager.getInstance();
  private platform = createPlatformAdapter();

  private initPool(scene: Phaser.Scene): void {
    if (!this.poolSpritePool) {
      this.poolSpritePool = new ObjectPool<Phaser.GameObjects.Sprite>(scene, {
        create: () => {
          return scene.add.sprite(0, 0, 'vfx_acid_pool_1').setDepth(3);
        },
        onRelease: (sprite) => {
          if (sprite && sprite.anims && typeof sprite.anims.stop === 'function') {
            sprite.anims.stop();
          }
          sprite?.clearTint?.();
          sprite?.setScale?.(1);
          sprite?.setAlpha?.(1);
        },
        maxSize: 10,
      });
      this.poolSpritePool.prewarm(6);
    }
  }

  public spawnAcidPool(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    damage: number,
    durationMs: number,
    isPlayer: boolean
  ): void {
    this.initPool(scene);

    if (this.acidPools.length >= 6) {
      const old = this.acidPools.shift();
      if (old && this.poolSpritePool) {
        this.poolSpritePool.release(old.sprite);
      }
    }

    const sprite = this.poolSpritePool
      ? this.poolSpritePool.get()
      : scene.add.sprite(x, y, 'vfx_acid_pool_1');

    sprite.setPosition(x, y);
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
        if (this.poolSpritePool) {
          this.poolSpritePool.release(pool.sprite);
        } else {
          pool.sprite.destroy();
        }
        this.acidPools.splice(i, 1);
        continue;
      }

      if (pool.tickCooldown <= 0) {
        pool.tickCooldown = 500;
        if (pool.isPlayerPool) {
          ctx.applyAreaDamageToEnemies(pool.x, pool.y, pool.radius, pool.damage);
        } else {
          const dist = Phaser.Math.Distance.Between(ctx.player.x, ctx.player.y, pool.x, pool.y);
          if (dist <= pool.radius) {
            ctx.applyDamageToPlayer(pool.damage);
          }
        }
      }
    }
  }

  public startExploderFuse(
    exploder: Entity,
    scene: Phaser.Scene,
    onExplode: (e: Entity) => void
  ): void {
    if (exploder.isExploding) return;
    exploder.isExploding = true;
    exploder.stats.speed = 0;
    if (exploder.sprite?.body) {
      exploder.sprite.body.stop();
    }

    if (exploder.sprite) {
      scene.tweens.add({
        targets: exploder.sprite,
        scaleX: 1.45,
        scaleY: 1.45,
        tint: 0xff0000,
        yoyo: true,
        repeat: 3,
        duration: 120,
        onComplete: () => {
          onExplode(exploder);
        },
      });
    } else {
      scene.time.delayedCall(800, () => onExplode(exploder));
    }
  }

  public detonateExploder(exploder: Entity, ctx: HazardContext): void {
    const x = exploder.x;
    const y = exploder.y;
    const blastRadius = exploder.definition?.explosionRadius || 80;
    const blastDmg = exploder.definition?.explosionDamage || 22;

    this.spawnAcidPool(ctx.scene, x, y, blastRadius, 6, 3500, false);

    const blastGfx = ctx.scene.add.graphics();
    blastGfx.setPosition(x, y);
    blastGfx.lineStyle(3, 0xef4444, 1);
    blastGfx.fillStyle(0xdc2626, 0.5);
    blastGfx.fillCircle(0, 0, blastRadius);
    blastGfx.strokeCircle(0, 0, blastRadius);

    ctx.scene.tweens.add({
      targets: blastGfx,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 300,
      onComplete: () => blastGfx.destroy(),
    });

    const distToPlayer = Phaser.Math.Distance.Between(ctx.player.x, ctx.player.y, x, y);
    if (distToPlayer <= blastRadius) {
      ctx.applyDamageToPlayer(blastDmg);
      const angle = Phaser.Math.Angle.Between(x, y, ctx.player.x, ctx.player.y);
      ctx.player.applyKnockback(Math.cos(angle) * 320, Math.sin(angle) * 320, 200);
    }

    ctx.applyAreaDamageToEnemies(x, y, blastRadius, blastDmg * 1.5);
    this.audio.playExplosion();
    this.platform.vibrate(40);
  }

  public triggerScreenWipeBlast(scene: Phaser.Scene, x: number, y: number, ctx: HazardContext): void {
    this.audio.playExplosion();

    const blastGfx = scene.add.graphics();
    blastGfx.setPosition(x, y);
    blastGfx.lineStyle(6, 0xfacc15, 1);
    blastGfx.fillStyle(0xa855f7, 0.4);
    blastGfx.fillCircle(0, 0, 380);
    blastGfx.strokeCircle(0, 0, 380);

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
    if (this.poolSpritePool) {
      this.poolSpritePool.clear();
      this.poolSpritePool = undefined;
    }
    this.acidPools = [];
  }
}
