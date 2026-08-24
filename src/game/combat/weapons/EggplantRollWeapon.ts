import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';
import { AudioManager } from '../../audio/AudioManager';

export class EggplantRollWeapon implements IWeapon {
  readonly id = 'weapon_eggplant_roll';
  readonly name = 'Фиолетовый Шар';

  private rollCooldownTimer = 0;
  private isRolling = false;
  private rollDurationTimer = 0;

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    if ((mods.eggplantRollLevel ?? 0) <= 0) return;
    const rollLevel = mods.eggplantRollLevel;

    const baseInterval = (4500 - (rollLevel - 1) * 400) / (1 + mods.attackSpeedBonus * 0.5);

    if (this.isRolling) {
      this.rollDurationTimer -= delta;
      this.handleRollingCollision(ctx, rollLevel);

      if (this.rollDurationTimer <= 0) {
        this.isRolling = false;
        if (ctx.player.sprite) {
          ctx.player.sprite.clearTint();
          ctx.player.sprite.setScale(0.72);
        }
      }
      return;
    }

    this.rollCooldownTimer += delta;
    if (this.rollCooldownTimer >= baseInterval) {
      const moveVector = ctx.player.sprite?.body
        ? { x: ctx.player.sprite.body.velocity.x, y: ctx.player.sprite.body.velocity.y }
        : { x: 0, y: 0 };
      const isMoving = Math.abs(moveVector.x) > 10 || Math.abs(moveVector.y) > 10;

      if (isMoving) {
        this.startRoll(ctx, rollLevel);
      }
    }
  }

  private startRoll(ctx: WeaponContext, level: number): void {
    this.rollCooldownTimer = 0;
    this.isRolling = true;
    this.rollDurationTimer = 1200 + (level >= 3 ? 300 : 0);

    // Speed boost and visual roll cue
    ctx.player.applySpeedBoost(1.7, this.rollDurationTimer);

    if (ctx.player.sprite) {
      ctx.player.sprite.setTint(0x9333ea);
      ctx.player.sprite.setScale(0.85);

      ctx.scene.tweens.add({
        targets: ctx.player.sprite,
        angle: ctx.player.sprite.flipX ? -360 : 360,
        duration: 400,
        repeat: 2,
        ease: 'Linear',
      });
    }

    AudioManager.getInstance().playBashStomp();
    ctx.vibrate?.(60);
  }

  private handleRollingCollision(ctx: WeaponContext, level: number): void {
    const px = ctx.player.x;
    const py = ctx.player.y;
    const hitRadius = 48;
    const damage = Math.round((38 + (level - 1) * 12) * (1 + ctx.gameState.playerModifiers.damagePercentBonus));

    ctx.enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive || enemy.isExploding) return;
      const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
      if (dist <= hitRadius) {
        ctx.combatSystem.applyDamage(ctx.player, enemy, damage);

        const angle = Phaser.Math.Angle.Between(px, py, enemy.x, enemy.y);
        enemy.applyKnockback(Math.cos(angle) * 420, Math.sin(angle) * 420, 240);

        if (enemy.sprite && ctx.flashSprite) {
          ctx.flashSprite(enemy.sprite, 0xa855f7);
        }

        AudioManager.getInstance().playImpactSplat();
      }
    });
  }
}
