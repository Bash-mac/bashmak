import Phaser from 'phaser';
import type { PlayerModifiers } from '../data/definitions';
import { SaveManager } from '../core/SaveManager';
import { ObjectPool } from '../pools/ObjectPool';
import type { DamageNumberPool } from '../combat/DamageNumberPool';

export class LootSystem {
  public gemsGroup: Phaser.Physics.Arcade.Group;
  public gooDropsGroup: Phaser.Physics.Arcade.Group;
  public chestsGroup: Phaser.Physics.Arcade.Group;
  public consumablesGroup: Phaser.Physics.Arcade.Group;
  private scene: Phaser.Scene;
  private saveManager = SaveManager.getInstance();
  private damageNumbers?: DamageNumberPool;

  private gemPool: ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>;
  private gooPool: ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>;
  private chestPool: ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>;
  private consumablePool: ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>;

  private static readonly MAX_ACTIVE_GEMS = 90;

  constructor(scene: Phaser.Scene, damageNumbers?: DamageNumberPool) {
    this.scene = scene;
    this.damageNumbers = damageNumbers;
    this.gemsGroup = scene.physics.add.group();
    this.gooDropsGroup = scene.physics.add.group();
    this.chestsGroup = scene.physics.add.group();
    this.consumablesGroup = scene.physics.add.group();

    // 1. Gem Pool (XP Snots)
    this.gemPool = new ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>(scene, {
      create: () => {
        const gem = this.gemsGroup.create(0, 0, 'drop_xp_small') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        gem.setScale(0.24);
        gem.setCircle(36, 12, 12);
        gem.setDepth(4);
        return gem;
      },
      onRelease: (gem) => {
        this.scene.tweens.killTweensOf(gem);
        gem.setData('speed', 0);
        gem.setData('xpValue', 0);
        gem.clearTint();
        gem.setTexture('drop_xp_small');
        gem.setScale(0.24);
      },
      maxSize: 150,
    });
    this.gemPool.prewarm(60);

    // 2. Goo Pool (Slime Soda Cans)
    this.gooPool = new ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>(scene, {
      create: () => {
        const drop = this.gooDropsGroup.create(0, 0, 'drop_goo') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        drop.setScale(0.30);
        drop.setCircle(36, 12, 12);
        drop.setDepth(4);
        return drop;
      },
      onRelease: (drop) => {
        this.scene.tweens.killTweensOf(drop);
        drop.setData('speed', 0);
        drop.setData('gooValue', 0);
        drop.clearTint();
        drop.setScale(0.30);
      },
      maxSize: 80,
    });
    this.gooPool.prewarm(30);

    // 3. Mutant Treasure Chests
    this.chestPool = new ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>(scene, {
      create: () => {
        const chest = this.chestsGroup.create(0, 0, 'drop_chest') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        chest.setScale(0.75);
        chest.setCircle(20, 0, 0);
        chest.setDepth(6);
        return chest;
      },
      onRelease: (chest) => {
        this.scene.tweens.killTweensOf(chest);
        chest.clearTint();
        chest.setScale(0.75);
      },
      maxSize: 10,
    });
    this.chestPool.prewarm(4);

    // 4. Combat Consumables Pool (Nuke, Magnet, Freeze, Frenzy)
    this.consumablePool = new ObjectPool<Phaser.Types.Physics.Arcade.SpriteWithDynamicBody>(scene, {
      create: () => {
        const item = this.consumablesGroup.create(0, 0, 'drop_nuke') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        item.setScale(0.75);
        item.setCircle(18, 0, 0);
        item.setDepth(6);
        return item;
      },
      onRelease: (item) => {
        this.scene.tweens.killTweensOf(item);
        item.clearTint();
        item.setData('armed', false);
        item.setData('consumableType', undefined);
      },
      maxSize: 10,
    });
    this.consumablePool.prewarm(4);
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
    if (value >= 50) {
      gem.setTexture('drop_xp_big');
      gem.setTint(0xec4899); // Mega radioactive blob (pink/magenta)
      gem.setScale(0.40);
    } else if (value >= 15) {
      gem.setTexture('drop_xp_big');
      gem.setTint(0xfacc15); // Golden radio-slime
      gem.setScale(0.34);
    } else if (value >= 5) {
      gem.setTexture('drop_xp_big');
      gem.clearTint(); // Cyan-blue nuclear bubble
      gem.setScale(0.28);
    } else {
      gem.setTexture('drop_xp_small');
      gem.clearTint(); // Green slime snot
      gem.setScale(0.24);
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

      drop.setScale(0.05);
      this.scene.tweens.add({
        targets: drop,
        scaleX: 0.30,
        scaleY: 0.30,
        duration: 250,
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
    const magnetRadius = (95 + mods.magnetRadiusBonus) * levelBonus * tomeBonus;
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

  public spawnChest(x: number, y: number): void {
    const chest = this.chestPool.get();
    chest.setPosition(x, y);
    chest.setScale(0.1);
    this.scene.tweens.add({
      targets: chest,
      scaleX: 0.75,
      scaleY: 0.75,
      duration: 350,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (chest.active) {
          this.scene.tweens.add({
            targets: chest,
            scaleX: 0.84,
            scaleY: 0.84,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      },
    });
  }

  public releaseChest(chest: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
    this.chestPool.release(chest);
  }

  public spawnConsumable(x: number, y: number, specificType?: 'nuke' | 'magnet' | 'freeze' | 'frenzy'): void {
    const types: ('nuke' | 'magnet' | 'freeze' | 'frenzy')[] = ['nuke', 'magnet', 'freeze', 'frenzy'];
    const chosenType = specificType || types[Math.floor(Math.random() * types.length)];
    const item = this.consumablePool.get();

    item.setTexture(`drop_${chosenType}`);
    item.setPosition(x, y - 5);
    item.setData('consumableType', chosenType);
    item.setData('armed', false);
    item.setScale(0.2);

    const targetX = x + (Math.random() - 0.5) * 45;
    const targetY = y + 15 + Math.random() * 20;

    // Pop-up and bounce onto the ground
    this.scene.tweens.add({
      targets: item,
      x: targetX,
      y: { from: y - 28, to: targetY },
      scaleX: 0.75,
      scaleY: 0.75,
      duration: 400,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        if (!item.active) return;
        // Arm after bounce so player sees it drop rather than instantly vacuuming it
        item.setData('armed', true);
        this.scene.tweens.add({
          targets: item,
          scaleX: 0.85,
          scaleY: 0.85,
          duration: 450,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
    });

    const labels: Record<string, { text: string; color: string }> = {
      nuke: { text: 'БОМБА!', color: '#ef4444' },
      magnet: { text: 'МАГНИТ!', color: '#3b82f6' },
      freeze: { text: 'ЗАМОРОЗКА!', color: '#06b6d4' },
      frenzy: { text: 'ЯРОСТЬ!', color: '#f59e0b' },
    };
    const info = labels[chosenType];
    if (info) this.showFloatText(targetX, y - 35, info.text, info.color);
  }

  public releaseConsumable(item: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
    this.consumablePool.release(item);
  }

  public clear(): void {
    this.gemPool.clear();
    this.gooPool.clear();
    this.chestPool.clear();
    this.consumablePool.clear();
  }
}
