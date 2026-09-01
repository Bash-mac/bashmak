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

    const range = (380 + (level - 1) * 35) * (1 + (mods.extraRange || 0));
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
    const tx = primaryTarget.x;
    const ty = primaryTarget.y;
    const mods = ctx.gameState.playerModifiers;

    // 1. Primary Lightning Strike from Sky Above (Baked HD VFX)
    const strikeScale = (level >= 5 ? 0.56 : 0.46) * (1 + (mods.attackAreaBonus || 0) * 0.25);
    ctx.vfxPool?.spawnPiezoStrike(tx, ty, strikeScale);

    // Damage & Stun (Rolls crit based on player stats)
    const baseDmg = 16 + (level - 1) * 7;
    const rawPrimaryDamage = Math.round(baseDmg * (1 + mods.damagePercentBonus));
    const isCrit = Math.random() < mods.critChance;
    const primaryDamage = isCrit ? Math.round(rawPrimaryDamage * (mods.critMultiplier || 2.0)) : rawPrimaryDamage;

    ctx.combatSystem.applyDamage(ctx.player, primaryTarget, primaryDamage);
    if (primaryTarget.sprite) ctx.flashSprite?.(primaryTarget.sprite, 0xfef08a);
    ctx.vfxPool?.spawnPiezoHit(tx, ty, level >= 5 ? 0.75 : 0.5);

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
      ctx.scene.time.delayedCall(35 + idx * 30, () => {
        if (!secTarget.isAlive) return;
        ctx.vfxPool?.spawnProceduralLightning(tx, ty, secTarget.x, secTarget.y, {
          color: 0xfef08a,
          glowColor: 0x22c55e,
          durationMs: 110,
          forks: false,
        });
        const rawSecDmg = Math.round(rawPrimaryDamage * 0.40);
        const isSecCrit = Math.random() < mods.critChance;
        const secDmg = isSecCrit ? Math.round(rawSecDmg * (mods.critMultiplier || 2.0)) : rawSecDmg;
        ctx.combatSystem.applyDamage(ctx.player, secTarget, secDmg);
        if (secTarget.sprite) ctx.flashSprite?.(secTarget.sprite, 0xa3e635);
        ctx.vfxPool?.spawnPiezoHit(secTarget.x, secTarget.y, 0.35);
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

