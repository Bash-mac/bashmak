import Phaser from 'phaser';
import { ObjectPool } from '../pools/ObjectPool';

export class VfxPool {
  private splatPool: ObjectPool<Phaser.GameObjects.Sprite>;
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

  public clear(): void {
    this.splatPool.clear();
  }
}
