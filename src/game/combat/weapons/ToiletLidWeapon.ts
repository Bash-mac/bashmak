import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';
import type { Entity } from '../../entities/Entity';
import { AudioManager } from '../../audio/AudioManager';

interface ActiveToiletLid {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  bouncesLeft: number;
  baseDamage: number;
  damageMultiplier: number;
  lastHitEnemyId?: string;
  speed: number;
  lifeTimerMs: number;
  vx: number;
  vy: number;
  level: number;
  hitImmunityTimerMs: number;
}

export class ToiletLidWeapon implements IWeapon {
  readonly id = 'weapon_toilet_lid';
  readonly name = 'Крышка от унитаза';

  private attackTimer = 0;
  private lids: ActiveToiletLid[] = [];
  private lastCtx: WeaponContext | null = null;

  public reset(): void {
    this.attackTimer = 0;
    if (this.lastCtx) {
      for (const lid of this.lids) {
        if (lid.sprite?.active) {
          if (this.lastCtx.projectilePool) this.lastCtx.projectilePool.releaseProjectile(lid.sprite);
          else lid.sprite.destroy();
        }
      }
    }
    this.lids = [];
  }

  public update(delta: number, ctx: WeaponContext): void {
    this.lastCtx = ctx;
    // 1. Update active ricochet lids
    this.updateActiveLids(delta, ctx);

    // 2. Attack check
    const mods = ctx.gameState.playerModifiers;
    const level = mods.toiletLidLevel ?? 0;
    if (level <= 0) return;

    const baseSpeed = (ctx.player.stats.attackSpeed ?? 1.0) * (1 + mods.attackSpeedBonus);
    const baseInterval = 1350 / baseSpeed;

    this.attackTimer += delta;
    if (this.attackTimer < baseInterval) return;

    this.attackTimer = 0;
    this.launchLids(ctx, level);
  }

  private launchLids(ctx: WeaponContext, level: number): void {
    const mods = ctx.gameState.playerModifiers;
    const px = ctx.player.x;
    const py = ctx.player.y;

    const primaryTarget = this.findClosestEnemy(ctx.player, ctx.enemiesMap, 500);
    let baseAngle = 0;

    if (primaryTarget) {
      baseAngle = Phaser.Math.Angle.Between(px, py, primaryTarget.x, primaryTarget.y);
    } else {
      baseAngle = Math.random() * Math.PI * 2;
    }

    const count = (level >= 4 ? 2 : 1) + (mods.multishotCount > 1 ? mods.multishotCount - 1 : 0);
    const baseDmg = 27 + ctx.player.stats.damage * 0.5 + (level - 1) * 18;
    const bounces = (mods.toiletLidBounces ?? 3) + (mods.bounceCount || 0);

    for (let i = 0; i < count; i++) {
      const spread = count > 1 ? (i - (count - 1) / 2) * 0.32 : 0;
      const angle = baseAngle + spread;
      this.spawnSingleLid(ctx, px, py, angle, baseDmg, bounces, level);
    }

    AudioManager.getInstance().playToiletClank();
  }

  private spawnSingleLid(
    ctx: WeaponContext,
    x: number,
    y: number,
    angle: number,
    baseDamage: number,
    bounces: number,
    level: number
  ): void {
    const mods = ctx.gameState.playerModifiers;
    const proj = ctx.projectilePool
      ? ctx.projectilePool.getProjectile('vfx_toilet_lid_spin', x, y)
      : (ctx.projectilesGroup.create(x, y, 'vfx_toilet_lid_spin') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody);

    const baseScale = 0.38 * (level >= 4 ? 1.2 : 1.0) * (1 + (mods.attackAreaBonus || 0) * 0.4);
    proj.setScale(baseScale);
    proj.setDepth(13);

    if (proj.body) {
      proj.body.setCircle(26, (proj.width - 52) / 2, (proj.height - 52) / 2);
    }

    if (ctx.scene.anims.exists('anim_toilet_lid_spin')) {
      proj.play('anim_toilet_lid_spin');
    }

    const speed = 560 * (1 + (level >= 2 ? 0.25 : 0) + (level >= 5 ? 0.25 : 0));
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    proj.setVelocity(vx, vy);
    proj.setData('damage', baseDamage);
    proj.setData('pierce', 999);
    proj.setData('isToiletLid', true);

    this.lids.push({
      sprite: proj,
      bouncesLeft: bounces,
      baseDamage,
      damageMultiplier: 1.0,
      speed,
      lifeTimerMs: 4200,
      vx,
      vy,
      level,
      hitImmunityTimerMs: 80,
    });
  }

  private updateActiveLids(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    const bounds = ctx.scene.physics.world.bounds;
    const pad = 16;
    const minX = bounds.x + pad;
    const maxX = bounds.right - pad;
    const minY = bounds.y + pad;
    const maxY = bounds.bottom - pad;

    for (let i = this.lids.length - 1; i >= 0; i--) {
      const lid = this.lids[i];
      const spr = lid.sprite;

      if (!spr || !spr.active) {
        this.lids.splice(i, 1);
        continue;
      }

      lid.lifeTimerMs -= delta;
      lid.hitImmunityTimerMs -= delta;

      // 1. World Bounds Ricochet
      let bouncedWall = false;
      if (spr.x < minX) {
        spr.x = minX;
        lid.vx = Math.abs(lid.vx) * (0.95 + Math.random() * 0.1);
        lid.vy += (Math.random() - 0.5) * 80;
        bouncedWall = true;
      } else if (spr.x > maxX) {
        spr.x = maxX;
        lid.vx = -Math.abs(lid.vx) * (0.95 + Math.random() * 0.1);
        lid.vy += (Math.random() - 0.5) * 80;
        bouncedWall = true;
      }

      if (spr.y < minY) {
        spr.y = minY;
        lid.vy = Math.abs(lid.vy) * (0.95 + Math.random() * 0.1);
        lid.vx += (Math.random() - 0.5) * 80;
        bouncedWall = true;
      } else if (spr.y > maxY) {
        spr.y = maxY;
        lid.vy = -Math.abs(lid.vy) * (0.95 + Math.random() * 0.1);
        lid.vx += (Math.random() - 0.5) * 80;
        bouncedWall = true;
      }

      if (bouncedWall) {
        spr.setVelocity(lid.vx, lid.vy);
        lid.bouncesLeft--;
        AudioManager.getInstance().playToiletClank();
        ctx.vfxPool?.spawnToiletLidImpact(spr.x, spr.y, 0.38);
      }

      // 2. Enemy Hit Check
      if (lid.hitImmunityTimerMs <= 0 && lid.bouncesLeft > 0) {
        const hitRadius = 62 * spr.scaleX;
        let hitEnemy: Entity | null = null;

        for (const enemy of ctx.enemiesMap.values()) {
          if (!enemy.isAlive || enemy.id === lid.lastHitEnemyId) continue;
          const dist = Phaser.Math.Distance.Between(spr.x, spr.y, enemy.x, enemy.y);
          if (dist <= hitRadius) {
            hitEnemy = enemy;
            break;
          }
        }

        if (hitEnemy) {
          lid.lastHitEnemyId = hitEnemy.id;
          lid.hitImmunityTimerMs = 120; // 120ms cooldown between hits
          lid.bouncesLeft--;

          // Calculate Damage
          const rawDamage = Math.round(lid.baseDamage * lid.damageMultiplier * (1 + mods.damagePercentBonus));
          const isCrit = Math.random() < mods.critChance;
          const finalDamage = isCrit ? Math.round(rawDamage * (mods.critMultiplier || 2.0)) : rawDamage;

          ctx.combatSystem.applyDamage(ctx.player, hitEnemy, finalDamage);
          if (hitEnemy.sprite) ctx.flashSprite?.(hitEnemy.sprite, 0x84cc16);
          if (ctx.damageNumbers) {
            ctx.damageNumbers.showDamage(hitEnemy.x, hitEnemy.y, finalDamage, isCrit);
          }

          // Visual & Audio
          ctx.vfxPool?.spawnToiletLidImpact(hitEnemy.x, hitEnemy.y, 0.48);
          AudioManager.getInstance().playToiletClank();
          ctx.vibrate?.(12);

          // Lv.3+ Slime puddle & slow
          if (lid.level >= 3) {
            hitEnemy.applySlow(0.45, 2500);
            if (ctx.spawnAcidPool) {
              ctx.spawnAcidPool(hitEnemy.x, hitEnemy.y, 32, 14, 2500, true);
            } else {
              ctx.vfxPool?.spawnImpactSplat(hitEnemy.x, hitEnemy.y, 0.5);
            }
          }

          // Lv.5 accumulative +8% per enemy ricochet (wall bounces don't ramp)
          if (lid.level >= 5) {
            lid.damageMultiplier += 0.08;
            lid.speed = Math.min(850, lid.speed * 1.05);
          }

          // Redirect toward next nearby enemy or reflect
          const nextTarget = this.findNextRicochetTarget(hitEnemy, ctx.enemiesMap, 420);
          if (nextTarget) {
            const nextAngle = Phaser.Math.Angle.Between(spr.x, spr.y, nextTarget.x, nextTarget.y) + (Math.random() - 0.5) * 0.25;
            lid.vx = Math.cos(nextAngle) * lid.speed;
            lid.vy = Math.sin(nextAngle) * lid.speed;
          } else {
            const currentAngle = Math.atan2(lid.vy, lid.vx);
            const bounceAngle = currentAngle + Math.PI + (Math.random() - 0.5) * 1.2;
            lid.vx = Math.cos(bounceAngle) * lid.speed;
            lid.vy = Math.sin(bounceAngle) * lid.speed;
          }
          spr.setVelocity(lid.vx, lid.vy);
        }
      }

      // 3. Remove expired lids
      if (lid.bouncesLeft <= 0 || lid.lifeTimerMs <= 0) {
        ctx.vfxPool?.spawnToiletLidImpact(spr.x, spr.y, 0.35);
        if (ctx.projectilePool) {
          ctx.projectilePool.releaseProjectile(spr);
        } else {
          spr.destroy();
        }
        this.lids.splice(i, 1);
      }
    }
  }

  private findClosestEnemy(from: { x: number; y: number }, enemiesMap: Map<string, Entity>, maxRange: number): Entity | null {
    let closest: Entity | null = null;
    let minDistanceSq = maxRange * maxRange;

    for (const enemy of enemiesMap.values()) {
      if (!enemy.isAlive) continue;
      const dx = enemy.x - from.x;
      const dy = enemy.y - from.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closest = enemy;
      }
    }
    return closest;
  }

  private findNextRicochetTarget(
    currentEnemy: Entity,
    enemiesMap: Map<string, Entity>,
    maxRange: number
  ): Entity | null {
    let closest: Entity | null = null;
    let minDistanceSq = maxRange * maxRange;

    for (const enemy of enemiesMap.values()) {
      if (!enemy.isAlive || enemy.id === currentEnemy.id) continue;
      const dx = enemy.x - currentEnemy.x;
      const dy = enemy.y - currentEnemy.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closest = enemy;
      }
    }
    return closest;
  }
}
