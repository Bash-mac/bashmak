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

    const targets = this.findStrongestEnemies(ctx.player, ctx.enemiesMap, 450);
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
        const shockRadius = 48 * (1 + mods.attackAreaBonus);
        const shock = ctx.scene.add.graphics();
        shock.lineStyle(4, 0x94a3b8, 0.9);
        shock.strokeCircle(tx, ty, shockRadius);
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

  private findStrongestEnemies(player: Entity, enemiesMap: Map<string, Entity>, range: number, maxCount = 3): Entity[] {
    const list: Entity[] = [];
    const rangeSq = range * range;
    const px = player.x;
    const py = player.y;

    for (const enemy of enemiesMap.values()) {
      if (!enemy.isAlive || enemy.isExploding) continue;
      const dx = enemy.x - px;
      const dy = enemy.y - py;
      const distSq = dx * dx + dy * dy;
      if (distSq > rangeSq) continue;

      let insertIdx = list.length;
      while (insertIdx > 0 && list[insertIdx - 1].stats.maxHp < enemy.stats.maxHp) {
        insertIdx--;
      }
      if (insertIdx < maxCount) {
        list.splice(insertIdx, 0, enemy);
        if (list.length > maxCount) {
          list.pop();
        }
      }
    }

    return list;
  }
}
