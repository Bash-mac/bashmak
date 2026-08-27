import Phaser from 'phaser';
import { ObjectPool } from '../pools/ObjectPool';

export class VfxPool {
  private splatPool: ObjectPool<Phaser.GameObjects.Sprite>;
  private carrotSplatPool: ObjectPool<Phaser.GameObjects.Sprite>;
  private enemyDeadPool: ObjectPool<Phaser.GameObjects.Sprite>;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.splatPool = new ObjectPool<Phaser.GameObjects.Sprite>(scene, {
      create: () => {
        const splat = scene.add.sprite(0, 0, 'vfx_impact_splat_1').setDepth(12).setScale(0.75);
        return splat;
      },
      onRelease: (splat) => {
        splat.stop();
        splat.setScale(0.75);
        splat.setAlpha(1);
      },
      maxSize: 60,
    });
    this.splatPool.prewarm(20);

    this.carrotSplatPool = new ObjectPool<Phaser.GameObjects.Sprite>(scene, {
      create: () => {
        const splat = scene.add.sprite(0, 0, 'vfx_carrot_splat_1').setDepth(12).setScale(0.14);
        return splat;
      },
      onRelease: (splat) => {
        splat.stop();
        splat.setScale(0.14);
        splat.setAlpha(1);
      },
      maxSize: 60,
    });
    this.carrotSplatPool.prewarm(15);

    this.enemyDeadPool = new ObjectPool<Phaser.GameObjects.Sprite>(scene, {
      create: () => {
        const spr = scene.add.sprite(0, 0, 'tex_enemy_dead_1').setDepth(11).setScale(0.35);
        return spr;
      },
      onRelease: (spr) => {
        spr.stop();
        spr.setScale(0.35);
        spr.setAlpha(1);
      },
      maxSize: 80,
    });
    this.enemyDeadPool.prewarm(25);
  }

  public spawnImpactSplat(x: number, y: number, scale = 0.75): void {
    const splat = this.splatPool.get();
    splat.setPosition(x, y);
    splat.setScale(scale);

    if (this.scene.anims.exists('vfx_anim_impact_splat')) {
      splat.play('vfx_anim_impact_splat').once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.splatPool.release(splat);
      });
    } else {
      this.scene.time.delayedCall(200, () => {
        this.splatPool.release(splat);
      });
    }
  }

  public spawnCarrotSplat(x: number, y: number, scale = 0.14): void {
    const splat = this.carrotSplatPool.get();
    splat.setPosition(x, y);
    splat.setScale(scale);

    if (this.scene.anims.exists('vfx_anim_carrot_splat')) {
      splat.play('vfx_anim_carrot_splat').once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.carrotSplatPool.release(splat);
      });
    } else {
      this.scene.time.delayedCall(200, () => {
        this.carrotSplatPool.release(splat);
      });
    }
  }

  public spawnEnemyDeath(x: number, y: number, scale = 0.35): void {
    const spr = this.enemyDeadPool.get();
    spr.setPosition(x, y);
    spr.setScale(scale);

    if (this.scene.anims.exists('vfx_anim_enemy_dead')) {
      spr.play('vfx_anim_enemy_dead').once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.enemyDeadPool.release(spr);
      });
    } else {
      this.scene.time.delayedCall(300, () => {
        this.enemyDeadPool.release(spr);
      });
    }
  }

  public clear(): void {
    this.splatPool.clear();
    this.carrotSplatPool.clear();
    this.enemyDeadPool.clear();
  }
}
