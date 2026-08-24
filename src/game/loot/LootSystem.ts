import Phaser from 'phaser';
import type { PlayerModifiers } from '../data/definitions';
import { SaveManager } from '../core/SaveManager';
import { WORM_HERO } from '../data/heroes';

export class LootSystem {
  public gemsGroup: Phaser.Physics.Arcade.Group;
  public gooDropsGroup: Phaser.Physics.Arcade.Group;
  private scene: Phaser.Scene;
  private saveManager = SaveManager.getInstance();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gemsGroup = scene.physics.add.group();
    this.gooDropsGroup = scene.physics.add.group();
  }

  public spawnGem(x: number, y: number, value: number): void {
    const gem = this.gemsGroup.create(x, y, 'tex_gem') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    gem.setCircle(8);
    gem.setData('xpValue', value);
    gem.setData('speed', 0);
    gem.setDepth(4);
  }

  public spawnGoo(x: number, y: number, count = 1): void {
    const greedMult = this.saveManager.getGreedMultiplier();
    const totalDrops = Math.max(1, Math.round(count * greedMult));

    for (let i = 0; i < totalDrops; i++) {
      const offsetX = totalDrops > 1 ? Phaser.Math.Between(-14, 14) : 0;
      const offsetY = totalDrops > 1 ? Phaser.Math.Between(-14, 14) : 0;
      const drop = this.gooDropsGroup.create(x + offsetX, y + offsetY, 'tex_goo_drop') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      drop.setCircle(10);
      drop.setData('gooValue', 1);
      drop.setData('speed', 0);
      drop.setDepth(4);

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

  public update(deltaSeconds: number, playerX: number, playerY: number, mods: PlayerModifiers, playerLevel: number): void {
    const levelBonus = 1 + (playerLevel - 1) * 0.02;
    const tomeBonus = mods.tomeMagnet > 0 ? 1 + mods.tomeMagnet * 0.4 : 1.0;
    const magnetRadius = (95 + mods.extraRange) * levelBonus * tomeBonus;

    // 1. Attract XP Gems
    const gems = this.gemsGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[];
    for (const gem of gems) {
      if (!gem.active) continue;
      const dist = Phaser.Math.Distance.Between(playerX, playerY, gem.x, gem.y);
      if (dist <= magnetRadius) {
        let speed = (gem.getData('speed') as number) || 0;
        speed += (WORM_HERO.stats.speed + 420) * deltaSeconds;
        gem.setData('speed', speed);
        const angle = Phaser.Math.Angle.Between(gem.x, gem.y, playerX, playerY);
        gem.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      }
    }

    // 2. Attract GOO Drops
    const gooDrops = this.gooDropsGroup.getChildren() as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[];
    for (const drop of gooDrops) {
      if (!drop.active) continue;
      const dist = Phaser.Math.Distance.Between(playerX, playerY, drop.x, drop.y);
      if (dist <= magnetRadius) {
        let speed = (drop.getData('speed') as number) || 0;
        speed += (WORM_HERO.stats.speed + 420) * deltaSeconds;
        drop.setData('speed', speed);
        const angle = Phaser.Math.Angle.Between(drop.x, drop.y, playerX, playerY);
        drop.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      }
    }
  }

  public showFloatText(x: number, y: number, text: string, color = '#4ade80'): void {
    const floatTxt = this.scene.add.text(x, y, text, {
      fontSize: '13px',
      fontStyle: 'bold',
      color,
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.scene.tweens.add({
      targets: floatTxt,
      y: y - 28,
      alpha: 0,
      duration: 650,
      ease: 'Quad.easeOut',
      onComplete: () => floatTxt.destroy(),
    });
  }

  public clear(): void {
    try {
      if (this.gemsGroup?.children) {
        this.gemsGroup.clear(true, true);
      }
      if (this.gooDropsGroup?.children) {
        this.gooDropsGroup.clear(true, true);
      }
    } catch {
      // Groups already destroyed by Phaser scene manager
    }
  }
}
