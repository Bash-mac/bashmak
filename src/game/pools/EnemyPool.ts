import Phaser from 'phaser';

/**
 * Object pool for enemy sprites, grouped by textureKey.
 * Eliminates dynamic allocations in the spawn callback (Zero-Allocation rule).
 *
 * Usage:
 *   acquire(textureKey, x, y) → reactivated or newly-created sprite
 *   release(sprite)           → deactivated, tweens killed, physics disabled
 *   clear()                   → destroys all pooled sprites (called in GameScene.shutdown)
 */
export class EnemyPool {
  private scene: Phaser.Scene;
  private group: Phaser.Physics.Arcade.Group;
  /** textureKey → inactive sprites ready for reuse */
  private pools: Map<string, Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]> = new Map();

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.group = group;
  }

  /**
   * Returns a reusable sprite for the given texture, positioned at (x, y).
   * Creates a new one if the pool for this key is empty.
   */
  acquire(textureKey: string, x: number, y: number): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
    const pool = this.pools.get(textureKey);
    let sprite = pool?.pop();

    if (sprite) {
      // Reactivate from pool
      sprite.setPosition(x, y);
      sprite.setActive(true).setVisible(true);
      if (sprite.body) {
        sprite.body.enable = true;
        sprite.body.reset(x, y);
      }
      // Re-add to group so physics overlap/collide work
      if (!this.group.contains(sprite)) {
        this.group.add(sprite);
      }
    } else {
      // First time for this texture — allocate once
      sprite = this.group.create(x, y, textureKey) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    }

    return sprite;
  }

  /**
   * Returns a sprite to the pool.
   * Kills tweens, disables physics, hides the sprite.
   * Must NOT call sprite.destroy().
   */
  release(sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
    if (!sprite || !sprite.scene) return;

    this.scene.tweens.killTweensOf(sprite);
    sprite.setActive(false).setVisible(false);
    sprite.clearTint();
    sprite.setAlpha(1);
    sprite.setFlipX(false);
    sprite.setRotation(0);
    sprite.anims.stop();

    if (sprite.body) {
      sprite.body.stop();
      sprite.body.enable = false;
    }

    this.group.remove(sprite, false, false);

    const key = sprite.texture.key;
    let pool = this.pools.get(key);
    if (!pool) {
      pool = [];
      this.pools.set(key, pool);
    }
    pool.push(sprite);
  }

  /**
   * Destroys all pooled (inactive) sprites. Called in GameScene.shutdown().
   */
  clear(): void {
    for (const pool of this.pools.values()) {
      for (const sprite of pool) {
        sprite.destroy();
      }
    }
    this.pools.clear();
  }
}
