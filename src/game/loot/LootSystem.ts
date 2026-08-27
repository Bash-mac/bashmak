import Phaser from 'phaser';
import type { PlayerModifiers } from '../data/definitions';
import { SaveManager } from '../core/SaveManager';
import { ObjectPool } from '../pools/ObjectPool';
import type { DamageNumberPool } from '../combat/DamageNumberPool';

export class LootSystem {
  public gemsGroup: Phaser.Physics.Arcade.Group;
  public gooDropsGroup: Phaser.Physics.Arcade.Group;
  private scene: Phaser.Scene;
  private saveManager = SaveManager.getInstance();
  private damageNumbers?: DamageNumberPool;

  private gemPool: ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>;
  private gooPool: ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>;

  private static readonly MAX_ACTIVE_GEMS = 90;

  constructor(scene: Phaser.Scene, damageNumbers?: DamageNumberPool) {
    this.scene = scene;
    this.damageNumbers = damageNumbers;
    this.gemsGroup = scene.physics.add.group();
    this.gooDropsGroup = scene.physics.add.group();

    // 1. Gem Pool
    this.gemPool = new ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>(scene, {
      create: () => {
        const gem = this.gemsGroup.create(0, 0, 'tex_gem') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        gem.setCircle(8);
        gem.setDepth(4);
        return gem;
      },
      onRelease: (gem) => {
        gem.setData('speed', 0);
        gem.setData('xpValue', 0);
        gem.clearTint();
        gem.setScale(1);
      },
      maxSize: 150,
    });
    this.gemPool.prewarm(60);

    // 2. Goo Pool
    this.gooPool = new ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>(scene, {
      create: () => {
        const drop = this.gooDropsGroup.create(0, 0, 'tex_goo_drop') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        drop.setCircle(10);
        drop.setDepth(4);
        return drop;
      },
      onRelease: (drop) => {
        drop.setData('speed', 0);
        drop.setData('gooValue', 0);
        drop.clearTint();
        drop.setScale(1);
      },
      maxSize: 80,
    });
    this.gooPool.prewarm(30);
  }

  public setDamageNumberPool(pool: DamageNumberPool): void {
    this.damageNumbers = pool;
  }

  public spawnGem(x: number, y: number, value: number, playerX?: number, playerY?: number): void {
    // Gem Capping & Merging check
    if (this.gemPool.activeCount >= LootSystem.MAX_ACTIVE_GEMS && playerX !== undefined && playerY !== undefined) {
      this.mergeDistantGem(value, playerX, playerY);
      return;
    }

    const gem = this.gemPool.get();
    gem.setPosition(x, y);
    gem.setData('xpValue', value);
    gem.setData('speed', 0);
    this.applyGemVisualTier(gem, value);
  }

  private mergeDistantGem(newValue: number, playerX: number, playerY: number): void {
    const activeGems = (this.gemsGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]).filter(
      (g) => g.active
    );

    if (activeGems.length === 0) return;

    let farthestGem: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
    let maxDist = -1;

    let closestGem: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
    let minDist = Number.MAX_VALUE;

    for (const gem of activeGems) {
      const dist = Phaser.Math.Distance.Between(playerX, playerY, gem.x, gem.y);
      if (dist > maxDist) {
        maxDist = dist;
        farthestGem = gem;
      }
      if (dist < minDist) {
        minDist = dist;
        closestGem = gem;
      }
    }

    let mergedXpValue = newValue;
    if (farthestGem && farthestGem !== closestGem) {
      const distantVal = (farthestGem.getData('xpValue') as number) || 1;
      mergedXpValue += distantVal;
      this.releaseGem(farthestGem);
    }

    if (closestGem) {
      const curVal = (closestGem.getData('xpValue') as number) || 1;
      const totalVal = curVal + mergedXpValue;
      closestGem.setData('xpValue', totalVal);
      this.applyGemVisualTier(closestGem, totalVal);

      this.scene.tweens.add({
        targets: closestGem,
        scaleX: closestGem.scaleX * 1.3,
        scaleY: closestGem.scaleY * 1.3,
        duration: 150,
        yoyo: true,
        ease: 'Quad.easeInOut',
      });
    }
  }

  private applyGemVisualTier(gem: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, value: number): void {
    if (value >= 100) {
      gem.setTint(0xec4899); // Mega gem: pink/magenta
      gem.setScale(1.8);
    } else if (value >= 25) {
      gem.setTint(0xfacc15); // Super gem: gold
      gem.setScale(1.5);
    } else if (value >= 5) {
      gem.setTint(0x38bdf8); // High gem: cyan
      gem.setScale(1.25);
    } else {
      gem.clearTint(); // Normal gem: lime green
      gem.setScale(1.0);
    }
  }

  public releaseGem(gem: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
    this.gemPool.release(gem);
  }

  public spawnGoo(x: number, y: number, count = 1): void {
    const greedMult = this.saveManager.getGreedMultiplier();
    const totalDrops = Math.max(1, Math.round(count * greedMult));

    for (let i = 0; i < totalDrops; i++) {
      const offsetX = totalDrops > 1 ? Phaser.Math.Between(-14, 14) : 0;
      const offsetY = totalDrops > 1 ? Phaser.Math.Between(-14, 14) : 0;

      const drop = this.gooPool.get();
      drop.setPosition(x + offsetX, y + offsetY);
      drop.setData('gooValue', 1);
      drop.setData('speed', 0);

      drop.setScale(0.2);
      this.scene.tweens.add({
        targets: drop,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Back.easeOut',
      });
    }
  }

  public releaseGoo(drop: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
    this.gooPool.release(drop);
  }

  public pullAllGemsToPlayer(playerX: number, playerY: number): void {
    const gems = this.gemsGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[];
    for (const gem of gems) {
      if (gem.active) {
        gem.setData('speed', 700);
        const angle = Phaser.Math.Angle.Between(gem.x, gem.y, playerX, playerY);
        gem.setVelocity(Math.cos(angle) * 700, Math.sin(angle) * 700);
      }
    }
  }

  public update(
    deltaSeconds: number,
    playerX: number,
    playerY: number,
    mods: PlayerModifiers,
    playerLevel: number,
    playerSpeed = 200
  ): void {
    const levelBonus = 1 + (playerLevel - 1) * 0.02;
    const tomeBonus = mods.tomeMagnet > 0 ? 1 + mods.tomeMagnet * 0.4 : 1.0;
    const magnetRadius = (95 + mods.extraRange) * levelBonus * tomeBonus;
    const magnetRadiusSq = magnetRadius * magnetRadius;

    // 1. Attract XP Gems
    const gems = this.gemsGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[];
    for (const gem of gems) {
      if (!gem.active) continue;
      const dx = playerX - gem.x;
      const dy = playerY - gem.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= magnetRadiusSq) {
        let speed = (gem.getData('speed') as number) || 0;
        speed += (playerSpeed + 420) * deltaSeconds;
        gem.setData('speed', speed);
        const angle = Math.atan2(dy, dx);
        gem.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      }
    }

    // 2. Attract GOO Drops
    const gooDrops = this.gooDropsGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[];
    for (const drop of gooDrops) {
      if (!drop.active) continue;
      const dx = playerX - drop.x;
      const dy = playerY - drop.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= magnetRadiusSq) {
        let speed = (drop.getData('speed') as number) || 0;
        speed += (playerSpeed + 420) * deltaSeconds;
        drop.setData('speed', speed);
        const angle = Math.atan2(dy, dx);
        drop.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      }
    }
  }

  public showFloatText(x: number, y: number, text: string, color = '#4ade80'): void {
    if (this.damageNumbers) {
      this.damageNumbers.showText(x, y, text, color);
    }
  }

  public clear(): void {
    this.gemPool.clear();
    this.gooPool.clear();
  }
}
