import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';
import type { Entity } from '../../entities/Entity';
import { AudioManager } from '../../audio/AudioManager';

export class PiezoTaserWeapon implements IWeapon {
  readonly id = 'weapon_lightning_zap';
  readonly name = 'Пьезо-Шокер';

  private attackTimer = 0;

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    const level = mods.lightningZapLevel ?? 0;
    if (level <= 0) return;

    // Running speeds up static charge by +40%
    const isMoving = ctx.player.sprite?.body && (ctx.player.sprite.body.velocity.x !== 0 || ctx.player.sprite.body.velocity.y !== 0);
    const speedMultiplier = (isMoving ? 1.4 : 1.0) * (1 + mods.attackSpeedBonus * 0.8);
    const baseInterval = (level >= 5 ? 900 : 2000 - (level - 1) * 220) / speedMultiplier;

    this.attackTimer += delta;
    if (this.attackTimer < baseInterval) return;

    const range = (240 + (level - 1) * 15) * (1 + (mods.extraRange || 0));
    const targets = this.findRandomEnemiesInRange(ctx.player, ctx.enemiesMap, range);
    if (targets.length === 0) return;

    this.attackTimer = 0;
    const zapCount = 1 + (level >= 4 ? 1 : 0) + (mods.multishotCount > 1 ? 1 : 0);

    for (let i = 0; i < Math.min(zapCount, targets.length); i++) {
      const target = targets[i];
      ctx.scene.time.delayedCall(i * 120, () => {
        if (target.isAlive) {
          this.performPiezoZap(ctx, target, level);
        }
      });
    }
  }

  private performPiezoZap(ctx: WeaponContext, primaryTarget: Entity, level: number): void {
    const px = ctx.player.x;
    const py = ctx.player.y;
    const tx = primaryTarget.x;
    const ty = primaryTarget.y;
    const mods = ctx.gameState.playerModifiers;

    // 1. Primary Electric Arc from Player to Target
    this.drawLightningArc(ctx.scene, px, py, tx, ty, 0xfacc15, 0x22c55e, 4);

    // Damage & Stun (Rolls crit based on player stats)
    const baseDmg = 45 + (level - 1) * 16;
    const rawPrimaryDamage = Math.round(baseDmg * (1 + mods.damagePercentBonus));
    const isCrit = Math.random() < mods.critChance;
    const primaryDamage = isCrit ? Math.round(rawPrimaryDamage * (mods.critMultiplier || 2.0)) : rawPrimaryDamage;

    ctx.combatSystem.applyDamage(ctx.player, primaryTarget, primaryDamage);
    if (primaryTarget.sprite) ctx.flashSprite?.(primaryTarget.sprite, 0xfef08a);

    if (level >= 3) {
      primaryTarget.applySlow(0.80, 800); // 80% micro-paralysis
    }

    if (ctx.damageNumbers) {
      ctx.damageNumbers.showDamage(tx, ty, primaryDamage, isCrit);
    }

    // 2. Secondary Chain Sparks (2-3 random nearby enemies)
    const chainCount = 2 + (level >= 2 ? 1 : 0) + (level >= 5 ? 1 : 0);
    const nearbyEnemies = this.findNearbyEnemies(primaryTarget, ctx.enemiesMap, 95 * (1 + mods.attackAreaBonus), chainCount);

    nearbyEnemies.forEach((secTarget, idx) => {
      ctx.scene.time.delayedCall(50 + idx * 40, () => {
        if (!secTarget.isAlive) return;
        this.drawLightningArc(ctx.scene, tx, ty, secTarget.x, secTarget.y, 0x4ade80, 0xfef08a, 2.5);
        const rawSecDmg = Math.round(rawPrimaryDamage * 0.55);
        const isSecCrit = Math.random() < mods.critChance;
        const secDmg = isSecCrit ? Math.round(rawSecDmg * (mods.critMultiplier || 2.0)) : rawSecDmg;
        ctx.combatSystem.applyDamage(ctx.player, secTarget, secDmg);
        if (secTarget.sprite) ctx.flashSprite?.(secTarget.sprite, 0xa3e635);
        if (level >= 3) secTarget.applySlow(0.50, 1500);
        if (ctx.damageNumbers) {
          ctx.damageNumbers.showDamage(secTarget.x, secTarget.y, secDmg, isSecCrit);
        }
      });
    });

    // Sound & Haptics
    AudioManager.getInstance().playLightningZap();
    ctx.vibrate?.(30);
  }

  private drawLightningArc(
    scene: Phaser.Scene,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    coreColor: number,
    glowColor: number,
    lineWidth: number
  ): void {
    const gfx = scene.add.graphics().setDepth(20);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const segments = Math.max(3, Math.floor(dist / 32));

    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];

    for (let i = 1; i < segments; i++) {
      const prog = i / segments;
      const baseX = x1 + (x2 - x1) * prog;
      const baseY = y1 + (y2 - y1) * prog;
      const offset = (Math.random() - 0.5) * 28;
      // Perpendicular jitter
      points.push({
        x: baseX - sin * offset,
        y: baseY + cos * offset,
      });
    }
    points.push({ x: x2, y: y2 });

    // Outer glow line
    gfx.lineStyle(lineWidth + 3, glowColor, 0.75);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      gfx.lineTo(points[i].x, points[i].y);
    }
    gfx.strokePath();

    // Inner bright core
    gfx.lineStyle(lineWidth, coreColor, 1.0);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      gfx.lineTo(points[i].x, points[i].y);
    }
    gfx.strokePath();

    // Fade tween
    scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 140,
      ease: 'Quad.easeOut',
      onComplete: () => gfx.destroy(),
    });
  }

  private findRandomEnemiesInRange(player: Entity, enemiesMap: Map<string, Entity>, range: number): Entity[] {
    const candidates: Entity[] = [];
    const rangeSq = range * range;
    const px = player.x;
    const py = player.y;

    for (const enemy of enemiesMap.values()) {
      if (!enemy.isAlive || enemy.isExploding) continue;
      const dx = enemy.x - px;
      const dy = enemy.y - py;
      if (dx * dx + dy * dy <= rangeSq) {
        candidates.push(enemy);
      }
    }

    // Shuffle and pick
    return candidates.sort(() => Math.random() - 0.5);
  }

  private findNearbyEnemies(origin: Entity, enemiesMap: Map<string, Entity>, maxDist: number, maxCount: number): Entity[] {
    const list: Entity[] = [];
    const distSqMax = maxDist * maxDist;

    for (const enemy of enemiesMap.values()) {
      if (!enemy.isAlive || enemy.isExploding || enemy.id === origin.id) continue;
      const dx = enemy.x - origin.x;
      const dy = enemy.y - origin.y;
      if (dx * dx + dy * dy <= distSqMax) {
        list.push(enemy);
      }
    }

    return list.sort(() => Math.random() - 0.5).slice(0, maxCount);
  }
}

