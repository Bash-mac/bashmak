import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';
import type { Entity } from '../../entities/Entity';
import { AudioManager } from '../../audio/AudioManager';

interface ActiveBoomerang {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  elapsedMs: number;
  outwardDurationMs: number;
  initialVx: number;
  initialVy: number;
  returning: boolean;
}

export class CarrotBarrageWeapon implements IWeapon {
  readonly id = 'weapon_carrot_barrage';
  readonly name = 'Морковный Град';

  private attackTimer = 0;
  private boomerangs: ActiveBoomerang[] = [];

  public reset(): void {
    this.attackTimer = 0;
    this.boomerangs = [];
  }

  update(delta: number, ctx: WeaponContext): void {
    // 1. Update existing flying boomerangs
    this.updateBoomerangs(delta, ctx);

    // 2. Attack check
    const mods = ctx.gameState.playerModifiers;
    if ((mods.carrotBarrageLevel ?? 0) <= 0) return;
    const carrotLevel = mods.carrotBarrageLevel;

    const baseSpeed = (ctx.player.stats.attackSpeed ?? 1.4) * (1 + mods.attackSpeedBonus);
    const baseInterval = 650 / baseSpeed;

    this.attackTimer += delta;
    if (this.attackTimer < baseInterval) return;

    const targets = this.findNearbyEnemies(ctx.player, ctx.enemiesMap, 360 + mods.extraRange);
    if (targets.length === 0) return;

    this.attackTimer = 0;
    const primaryTarget = targets[0];

    let damage = ctx.player.stats.damage * (1 + mods.damagePercentBonus);

    // 10 Stacks Kill-Streak Mega Shot
    let isSuperCrit = false;
    if (mods.killStreakStacks >= 10) {
      mods.killStreakStacks = 0;
      isSuperCrit = true;
      damage *= 2.0;
    } else if (mods.critChance > 0 && Math.random() < mods.critChance) {
      damage *= mods.critMultiplier;
    }

    const carrotsCount = 2 + (carrotLevel >= 3 ? 1 : 0) + (carrotLevel >= 5 ? 2 : 0) + (mods.multishotCount > 1 ? mods.multishotCount - 1 : 0);
    const spreadAngle = 0.24;
    const startAngle = -((carrotsCount - 1) * spreadAngle) / 2;

    for (let i = 0; i < carrotsCount; i++) {
      const angle = Phaser.Math.Angle.Between(ctx.player.x, ctx.player.y, primaryTarget.x, primaryTarget.y) + startAngle + i * spreadAngle;
      this.fireCarrotBoomerang(ctx, angle, damage, isSuperCrit, 2 + (carrotLevel >= 4 ? 2 : 0) + (mods.pierceCount || 0));
    }

    AudioManager.getInstance().playClick();
  }

  private fireCarrotBoomerang(ctx: WeaponContext, angle: number, damage: number, isSuperCrit: boolean, pierce: number): void {
    const proj = ctx.projectilePool
      ? ctx.projectilePool.getProjectile('tex_carrot_proj', ctx.player.x, ctx.player.y)
      : (ctx.projectilesGroup.create(ctx.player.x, ctx.player.y, 'tex_carrot_proj') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody);

    const scale = isSuperCrit ? 1.5 : 1.0;
    proj.setScale(scale);
    const radius = 14 * scale;
    if (proj.body) {
      proj.body.setCircle(
        radius,
        (proj.width - radius * 2) / 2,
        (proj.height - radius * 2) / 2
      );
    }
    proj.setData('damage', Math.round(damage));
    proj.setData('pierce', pierce);
    proj.setData('isCarrot', true);
    proj.setData('isCrit', isSuperCrit);
    proj.setDepth(9);

    if (isSuperCrit) {
      proj.setTint(0xf97316);
    }

    const speed = 580;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    proj.setVelocity(vx, vy);
    proj.rotation = angle;

    this.boomerangs.push({
      sprite: proj,
      elapsedMs: 0,
      outwardDurationMs: 420,
      initialVx: vx,
      initialVy: vy,
      returning: false,
    });
  }

  private updateBoomerangs(delta: number, ctx: WeaponContext): void {
    const px = ctx.player.x;
    const py = ctx.player.y;

    for (let i = this.boomerangs.length - 1; i >= 0; i--) {
      const boom = this.boomerangs[i];
      const spr = boom.sprite;

      if (!spr || !spr.active) {
        this.boomerangs.splice(i, 1);
        continue;
      }

      boom.elapsedMs += delta;
      spr.rotation += 0.25; // Spinning boomerang

      if (!boom.returning) {
        if (boom.elapsedMs < boom.outwardDurationMs) {
          // Slow down towards apex
          const progress = boom.elapsedMs / boom.outwardDurationMs;
          const factor = Math.max(0.1, 1 - progress * 0.9);
          spr.setVelocity(boom.initialVx * factor, boom.initialVy * factor);
        } else {
          boom.returning = true;
        }
      } else {
        // Homing back to player
        const dist = Phaser.Math.Distance.Between(spr.x, spr.y, px, py);
        if (dist <= 35 || boom.elapsedMs >= 1500) {
          // Caught by player or expired
          if (ctx.projectilePool) {
            ctx.projectilePool.releaseProjectile(spr);
          } else {
            spr.destroy();
          }
          this.boomerangs.splice(i, 1);
          continue;
        }

        const returnAngle = Phaser.Math.Angle.Between(spr.x, spr.y, px, py);
        const returnSpeed = Math.min(800, 450 + (boom.elapsedMs - boom.outwardDurationMs) * 0.7);
        spr.setVelocity(Math.cos(returnAngle) * returnSpeed, Math.sin(returnAngle) * returnSpeed);
      }
    }
  }

  private findNearbyEnemies(player: Entity, enemiesMap: Map<string, Entity>, range: number): Entity[] {
    const list: Entity[] = [];
    enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive || enemy.isExploding) return;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      if (dist <= range) list.push(enemy);
    });
    list.sort((a, b) => Phaser.Math.Distance.Between(player.x, player.y, a.x, a.y) - Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y));
    return list;
  }
}
