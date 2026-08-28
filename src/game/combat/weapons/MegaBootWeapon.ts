import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';
import type { Entity } from '../../entities/Entity';
import { AudioManager } from '../../audio/AudioManager';

export class MegaBootWeapon implements IWeapon {
  readonly id = 'weapon_mega_boot';
  readonly name = 'Тяжёлый Башмак';

  private attackTimer = 0;

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    if (mods.megaBootLevel <= 0) return;

    const baseInterval = 1600 / (1 + mods.attackSpeedBonus * 0.8);
    this.attackTimer += delta;

    if (this.attackTimer < baseInterval) return;
    this.attackTimer = 0;

    this.performStomp(ctx);
  }

  private performStomp(ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    const px = ctx.player.x;
    const py = ctx.player.y;
    const lvl = mods.megaBootLevel;

    const baseRadius = (75 + (lvl - 1) * 18) * (1 + mods.attackAreaBonus);
    const baseDamage = Math.round((28 + ctx.player.stats.damage * 0.5) * (1 + mods.damagePercentBonus) * (1 + (lvl - 1) * 0.35));

    // Direction of stomp (movement vector or closest enemy)
    const moveVector = ctx.player.sprite?.body
      ? { x: ctx.player.sprite.body.velocity.x, y: ctx.player.sprite.body.velocity.y }
      : { x: 1, y: 0 };

    let stompAngle = Math.atan2(moveVector.y, moveVector.x);
    if (Math.abs(moveVector.x) < 5 && Math.abs(moveVector.y) < 5) {
      const nearest = this.findNearestEnemy(ctx);
      if (nearest) {
        stompAngle = Phaser.Math.Angle.Between(px, py, nearest.x, nearest.y);
      }
    }

    const stompDist = 55;
    const stompX = px + Math.cos(stompAngle) * stompDist;
    const stompY = py + Math.sin(stompAngle) * stompDist;

    // Visual Cartoon Comic Stomp VFX
    this.spawnStompVFX(ctx.scene, stompX, stompY, baseRadius);

    // Apply Damage and Knockback in radius
    const hitRadius = lvl >= 5 ? baseRadius * 1.5 : baseRadius; // L5 = 360 circle
    const hitX = lvl >= 5 ? px : stompX;
    const hitY = lvl >= 5 ? py : stompY;

    ctx.enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive || enemy.isExploding) return;
      const dist = Phaser.Math.Distance.Between(hitX, hitY, enemy.x, enemy.y);
      if (dist <= hitRadius) {
        ctx.combatSystem.applyDamage(ctx.player, enemy, baseDamage);

        // Heavy Knockback
        const kbAngle = Phaser.Math.Angle.Between(px, py, enemy.x, enemy.y);
        enemy.applyKnockback(Math.cos(kbAngle) * 350, Math.sin(kbAngle) * 350, 220);

        if (enemy.sprite && ctx.flashSprite) {
          ctx.flashSprite(enemy.sprite, 0xfacc15);
        }
      }
    });

    // Dual Stomp at L3+ (Behind player)
    if (lvl >= 3 && lvl < 5) {
      const backX = px - Math.cos(stompAngle) * stompDist;
      const backY = py - Math.sin(stompAngle) * stompDist;
      this.spawnStompVFX(ctx.scene, backX, backY, baseRadius * 0.85);

      ctx.enemiesMap.forEach((enemy) => {
        if (!enemy.isAlive || enemy.isExploding) return;
        const dist = Phaser.Math.Distance.Between(backX, backY, enemy.x, enemy.y);
        if (dist <= baseRadius * 0.85) {
          ctx.combatSystem.applyDamage(ctx.player, enemy, Math.round(baseDamage * 0.7));
          const kbAngle = Phaser.Math.Angle.Between(px, py, enemy.x, enemy.y);
          enemy.applyKnockback(Math.cos(kbAngle) * 280, Math.sin(kbAngle) * 280, 180);
        }
      });
    }

    // Audio, comic camera shake & haptics
    AudioManager.getInstance().playBashStomp();
    ctx.scene.cameras.main.shake(120, 0.005);
    ctx.vibrate?.(45);
  }

  private spawnStompVFX(scene: Phaser.Scene, x: number, y: number, radius: number): void {
    const stompGfx = scene.add.graphics().setDepth(11);
    stompGfx.fillStyle(0xfacc15, 0.85);
    stompGfx.fillCircle(x, y, radius);
    stompGfx.lineStyle(4, 0x78350f, 1);
    stompGfx.strokeCircle(x, y, radius);

    // Comic impact shockwave ring
    scene.tweens.add({
      targets: stompGfx,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => stompGfx.destroy(),
    });

    // Comic "POW!" text popup
    const powText = scene.add.text(x, y - 10, 'BASH!', {
      fontSize: `${Math.round(radius * 0.45)}px`,
      fontStyle: 'bold',
      color: '#fef08a',
      fontFamily: 'monospace',
      stroke: '#451a03',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20);

    scene.tweens.add({
      targets: powText,
      y: y - 35,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 320,
      ease: 'Back.easeOut',
      onComplete: () => powText.destroy(),
    });
  }

  private findNearestEnemy(ctx: WeaponContext): Entity | null {
    let nearest: Entity | null = null;
    let minDistSq = Infinity;
    const px = ctx.player.x;
    const py = ctx.player.y;

    for (const enemy of ctx.enemiesMap.values()) {
      if (!enemy.isAlive || enemy.isExploding) continue;
      const dx = enemy.x - px;
      const dy = enemy.y - py;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearest = enemy;
      }
    }
    return nearest;
  }
}
