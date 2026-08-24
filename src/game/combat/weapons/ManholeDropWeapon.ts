import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';
import type { Entity } from '../../entities/Entity';
import { AudioManager } from '../../audio/AudioManager';

export class ManholeDropWeapon implements IWeapon {
  readonly id = 'weapon_lightning_zap';
  readonly name = 'Чугунный Люк';

  private attackTimer = 0;

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    const level = mods.lightningZapLevel ?? 0;
    if (level <= 0) return;

    const baseInterval = (2200 - (level - 1) * 220) / (1 + mods.attackSpeedBonus * 0.7);

    this.attackTimer += delta;
    if (this.attackTimer < baseInterval) return;

    const targets = this.findStrongestEnemies(ctx.player, ctx.enemiesMap, 450 + mods.extraRange);
    if (targets.length === 0) return;

    this.attackTimer = 0;
    const dropsCount = 1 + (level >= 4 ? 1 : 0) + (mods.multishotCount > 1 ? 1 : 0);

    for (let i = 0; i < Math.min(dropsCount, targets.length); i++) {
      const target = targets[i];
      ctx.scene.time.delayedCall(i * 150, () => {
        if (target.isAlive) {
          this.performManholeDrop(ctx, target, level);
        }
      });
    }
  }

  private performManholeDrop(ctx: WeaponContext, target: Entity, level: number): void {
    const tx = target.x;
    const ty = target.y;
    const mods = ctx.gameState.playerModifiers;

    // Drop manhole sprite animation
    const manhole = ctx.scene.add.image(tx, ty - 220, 'prop_manhole').setDepth(15).setScale(0.85);

    ctx.scene.tweens.add({
      targets: manhole,
      y: ty,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // Impact!
        const damage = Math.round((48 + (level - 1) * 20) * (1 + mods.damagePercentBonus));
        ctx.combatSystem.applyDamage(ctx.player, target, damage);

        // Stun / Slow
        target.applySlow(level >= 3 ? 0.60 : 0.35, 2000);

        if (ctx.damageNumbers) {
          ctx.damageNumbers.showDamage(tx, ty, damage, true);
        }

        // Small shockwave
        const shock = ctx.scene.add.graphics();
        shock.lineStyle(4, 0x94a3b8, 0.9);
        shock.strokeCircle(tx, ty, 48);
        ctx.scene.tweens.add({
          targets: shock,
          alpha: 0,
          scaleX: 1.4,
          scaleY: 1.4,
          duration: 250,
          onComplete: () => shock.destroy(),
        });

        AudioManager.getInstance().playBashStomp();
        ctx.vibrate?.(40);

        // Fade out manhole after short stay
        ctx.scene.tweens.add({
          targets: manhole,
          alpha: 0,
          duration: 350,
          delay: 200,
          onComplete: () => manhole.destroy(),
        });
      },
    });
  }

  private findStrongestEnemies(player: Entity, enemiesMap: Map<string, Entity>, range: number): Entity[] {
    const list: Entity[] = [];
    enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive || enemy.isExploding) return;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      if (dist <= range) {
        list.push(enemy);
      }
    });

    // Sort by maxHp descending (priority on tanks and bosses)
    list.sort((a, b) => b.stats.maxHp - a.stats.maxHp);
    return list;
  }
}
