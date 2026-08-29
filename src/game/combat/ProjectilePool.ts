import Phaser from 'phaser';
import { ObjectPool } from '../pools/ObjectPool';

export class ProjectilePool {
  private poolsByTexture: Map<string, ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>> = new Map();
  private scene: Phaser.Scene;
  private projectilesGroup: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene, projectilesGroup: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.projectilesGroup = projectilesGroup;

    this.getPoolForTexture('vfx_spit_proj_1', 30);
    this.getPoolForTexture('tex_carrot_proj', 30);
    this.getPoolForTexture('tex_homing_dagger', 20);
    this.getPoolForTexture('tex_eggplant_ball', 10);
    this.getPoolForTexture('vfx_toilet_lid_spin', 10);
    this.getPoolForTexture('vfx_orbit_fly', 10);
  }

  private getPoolForTexture(
    textureKey: string,
    prewarmCount = 15
  ): ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody> {
    let pool = this.poolsByTexture.get(textureKey);
    if (!pool) {
      pool = new ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>(this.scene, {
        create: () => {
          const sprite = this.projectilesGroup.create(0, 0, textureKey) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
          sprite.setDepth(9);
          return sprite;
        },
        onRelease: (proj) => {
          proj.setData('damage', 0);
          proj.setData('pierce', 0);
          proj.setData('isSlimeSpit', false);
          proj.setData('isCarrot', false);
          proj.setData('isHoming', false);
          proj.setData('isToiletLid', false);
          proj.stop();
          proj.clearTint();
          proj.setScale(1);
          proj.rotation = 0;
          if (proj.body) {
            proj.body.stop();
          }
        },
        maxSize: 100,
      });
      pool.prewarm(prewarmCount);
      this.poolsByTexture.set(textureKey, pool);
    }
    return pool;
  }

  public getProjectile(
    textureKey: string,
    x: number,
    y: number
  ): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
    const pool = this.getPoolForTexture(textureKey);
    const proj = pool.get();
    proj.setPosition(x, y);
    return proj;
  }

  public releaseProjectile(proj: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
    const textureKey = proj.texture?.key;
    if (textureKey && this.poolsByTexture.has(textureKey)) {
      this.poolsByTexture.get(textureKey)!.release(proj);
    } else {
      proj.destroy();
    }
  }

  public clear(): void {
    this.poolsByTexture.forEach((pool) => pool.clear());
    this.poolsByTexture.clear();
  }
}
