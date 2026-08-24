import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';
import { AudioManager } from '../../audio/AudioManager';

export class LaceWhipWeapon implements IWeapon {
  readonly id = 'weapon_lace_whip';
  readonly name = 'Шнуровой Кнут';

  private attackTimer = 0;
  private whipGfx?: Phaser.GameObjects.Graphics;

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    if ((mods.laceWhipLevel ?? 0) <= 0) return;
    const whipLvl = mods.laceWhipLevel;

    const baseSpeed = (ctx.player.stats.attackSpeed ?? 1.0) * (1 + mods.attackSpeedBonus);
    const baseInterval = 1200 / baseSpeed;

    this.attackTimer += delta;
    if (this.attackTimer < baseInterval) return;
    this.attackTimer = 0;

    this.performWhipSlash(ctx, whipLvl);
  }

  private performWhipSlash(ctx: WeaponContext, level: number): void {
    const mods = ctx.gameState.playerModifiers;
    const px = ctx.player.x;
    const py = ctx.player.y;

    let damage = Math.round(22 * (1 + mods.damagePercentBonus) * (1 + (level - 1) * 0.3));
    if (mods.standStillBonusActive) {
      damage = Math.round(damage * 1.5); // +50% dmg when standing still
    }

    const range = (180 + mods.extraRange) * (1 + (level >= 3 ? 0.25 : 0));

    // Direction of whip slash based on player velocity or flipX
    const facingRight = ctx.player.sprite ? !ctx.player.sprite.flipX : true;
    const baseAngle = facingRight ? 0 : Math.PI;

    // Draw visual whip arc VFX
    this.drawWhipArc(ctx.scene, px, py, baseAngle, range);

    // Hit enemies in 180° semicircle arc
    ctx.enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive || enemy.isExploding) return;
      const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
      if (dist <= range) {
        const enemyAngle = Phaser.Math.Angle.Between(px, py, enemy.x, enemy.y);
        let angleDiff = Math.abs(Phaser.Math.Angle.Wrap(enemyAngle - baseAngle));

        if (angleDiff <= Math.PI / 2 + 0.2) {
          ctx.combatSystem.applyDamage(ctx.player, enemy, damage);

          const kbAngle = enemyAngle;
          enemy.applyKnockback(Math.cos(kbAngle) * 260, Math.sin(kbAngle) * 260, 160);

          if (enemy.sprite && ctx.flashSprite) {
            ctx.flashSprite(enemy.sprite, 0xfacc15);
          }
        }
      }
    });

    // Level 3+: Dual whip slash behind player
    if (level >= 3) {
      const backAngle = baseAngle + Math.PI;
      this.drawWhipArc(ctx.scene, px, py, backAngle, range * 0.85);

      ctx.enemiesMap.forEach((enemy) => {
        if (!enemy.isAlive || enemy.isExploding) return;
        const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
        if (dist <= range * 0.85) {
          const enemyAngle = Phaser.Math.Angle.Between(px, py, enemy.x, enemy.y);
          const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(enemyAngle - backAngle));

          if (angleDiff <= Math.PI / 2 + 0.2) {
            ctx.combatSystem.applyDamage(ctx.player, enemy, Math.round(damage * 0.75));
            enemy.applyKnockback(Math.cos(enemyAngle) * 220, Math.sin(enemyAngle) * 220, 140);
          }
        }
      });
    }

    AudioManager.getInstance().playImpactSplat();
    ctx.vibrate?.(35);
  }

  private drawWhipArc(scene: Phaser.Scene, px: number, py: number, baseAngle: number, range: number): void {
    if (!this.whipGfx) {
      this.whipGfx = scene.add.graphics().setDepth(12);
    }

    this.whipGfx.clear();
    this.whipGfx.lineStyle(6, 0xfef08a, 0.95);
    this.whipGfx.beginPath();
    this.whipGfx.arc(px, py, range, baseAngle - Math.PI / 2, baseAngle + Math.PI / 2, false);
    this.whipGfx.strokePath();

    this.whipGfx.lineStyle(2, 0xd97706, 1);
    this.whipGfx.beginPath();
    this.whipGfx.arc(px, py, range * 0.9, baseAngle - Math.PI / 2, baseAngle + Math.PI / 2, false);
    this.whipGfx.strokePath();

    scene.tweens.add({
      targets: this.whipGfx,
      alpha: 0,
      duration: 160,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.whipGfx) {
          this.whipGfx.clear();
          this.whipGfx.alpha = 1;
        }
      },
    });
  }
}
