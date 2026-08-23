import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';
import type { Entity } from '../../entities/Entity';

export class LightningZapWeapon implements IWeapon {
  readonly id = 'weapon_lightning_zap';
  readonly name = 'Статический разряд';

  private zapGraphics?: Phaser.GameObjects.Graphics;

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    if (mods.lightningZapLevel <= 0) return;

    if (!this.zapGraphics) {
      this.zapGraphics = ctx.scene.add.graphics().setDepth(15);
    }

    const vx = ctx.player.sprite?.body ? ctx.player.sprite.body.velocity.x : 0;
    const vy = ctx.player.sprite?.body ? ctx.player.sprite.body.velocity.y : 0;
    const isMoving = Math.abs(vx) > 5 || Math.abs(vy) > 5;

    if (isMoving) {
      mods.staticZapCharge += (delta / 1000) * 35;
      if (mods.staticZapCharge >= mods.staticZapMax) {
        mods.staticZapCharge = 0;
        this.triggerZapChain(ctx);
      }
    }
  }

  private triggerZapChain(ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    const chainRadius = 260 + mods.extraRange;
    const maxChains = 3 + mods.lightningZapLevel;

    const nearby: Array<{ entity: Entity; dist: number }> = [];
    ctx.enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive || enemy.isExploding) return;
      const dist = Phaser.Math.Distance.Between(ctx.player.x, ctx.player.y, enemy.x, enemy.y);
      if (dist <= chainRadius) {
        nearby.push({ entity: enemy, dist });
      }
    });

    nearby.sort((a, b) => a.dist - b.dist);
    const targets = nearby.slice(0, maxChains).map((n) => n.entity);
    if (targets.length === 0) return;

    if (this.zapGraphics) {
      this.zapGraphics.clear();
      this.zapGraphics.lineStyle(3, 0x38bdf8, 0.9);

      let prevX = ctx.player.x;
      let prevY = ctx.player.y;

      for (const t of targets) {
        const midX = (prevX + t.x) / 2 + (Math.random() - 0.5) * 20;
        const midY = (prevY + t.y) / 2 + (Math.random() - 0.5) * 20;
        this.zapGraphics.lineBetween(prevX, prevY, midX, midY);
        this.zapGraphics.lineBetween(midX, midY, t.x, t.y);

        const zapDmg = Math.round(28 * (1 + mods.damagePercentBonus) * (1 + mods.lightningZapLevel * 0.25));
        ctx.combatSystem.applyDamage(ctx.player, t, zapDmg);
        if (t.sprite && ctx.flashSprite) {
          ctx.flashSprite(t.sprite, 0x38bdf8);
        }

        prevX = t.x;
        prevY = t.y;
      }

      ctx.scene.time.delayedCall(120, () => {
        this.zapGraphics?.clear();
      });
    }

    ctx.vibrate?.(30);
  }
}
