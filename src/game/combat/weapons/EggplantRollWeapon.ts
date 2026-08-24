import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';
import type { Entity } from '../../entities/Entity';
import { AudioManager } from '../../audio/AudioManager';

interface ActiveRicochetBall {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  bouncesLeft: number;
  damage: number;
  lastHitEnemyId?: string;
  speed: number;
  lifeTimerMs: number;
}

export class EggplantRollWeapon implements IWeapon {
  readonly id = 'weapon_eggplant_roll';
  readonly name = 'Фиолетовый Шар';

  private attackTimer = 0;
  private balls: ActiveRicochetBall[] = [];

  public reset(): void {
    this.attackTimer = 0;
    this.balls = [];
  }

  update(delta: number, ctx: WeaponContext): void {
    // 1. Update active ricochets
    this.updateRicochetBalls(delta, ctx);

    // 2. Attack check
    const mods = ctx.gameState.playerModifiers;
    if ((mods.eggplantRollLevel ?? 0) <= 0) return;
    const rollLevel = mods.eggplantRollLevel;

    const baseSpeed = (ctx.player.stats.attackSpeed ?? 1.0) * (1 + mods.attackSpeedBonus);
    const baseInterval = 1400 / baseSpeed;

    this.attackTimer += delta;
    if (this.attackTimer < baseInterval) return;

    const targets = this.findNearbyEnemies(ctx.player, ctx.enemiesMap, 300 + mods.extraRange);
    if (targets.length === 0) return;

    this.attackTimer = 0;
    const primaryTarget = targets[0];
    const damage = Math.round((35 + (rollLevel - 1) * 12) * (1 + mods.damagePercentBonus));
    const bounces = 3 + (rollLevel >= 2 ? 1 : 0) + (rollLevel >= 3 ? 1 : 0) + (rollLevel >= 5 ? 2 : 0) + (mods.bounceCount || 0);

    this.launchBall(ctx, primaryTarget, damage, bounces);
    AudioManager.getInstance().playBashStomp();
  }

  private launchBall(ctx: WeaponContext, target: Entity, damage: number, bounces: number): void {
    const proj = ctx.projectilePool
      ? ctx.projectilePool.getProjectile('tex_eggplant_ball', ctx.player.x, ctx.player.y)
      : (ctx.projectilesGroup.create(ctx.player.x, ctx.player.y, 'tex_eggplant_ball') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody);

    proj.setScale(1.1);
    const radius = 16;
    if (proj.body) {
      proj.body.setCircle(
        radius,
        (proj.width - radius * 2) / 2,
        (proj.height - radius * 2) / 2
      );
    }
    proj.setData('damage', damage);
    proj.setData('pierce', 999); // Doesn't destroy on collision, handled by ricochet
    proj.setData('isEggplantBall', true);
    proj.setDepth(9);

    const angle = Phaser.Math.Angle.Between(ctx.player.x, ctx.player.y, target.x, target.y);
    const speed = 560;
    proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.balls.push({
      sprite: proj,
      bouncesLeft: bounces,
      damage,
      speed,
      lifeTimerMs: 2500,
    });
  }

  private updateRicochetBalls(delta: number, ctx: WeaponContext): void {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      const spr = ball.sprite;

      if (!spr || !spr.active) {
        this.balls.splice(i, 1);
        continue;
      }

      ball.lifeTimerMs -= delta;
      spr.rotation += 0.2; // Rolling animation

      // Check collision with enemies for ricochet bounce
      let hitOccurred = false;
      ctx.enemiesMap.forEach((enemy) => {
        if (hitOccurred || !enemy.isAlive || enemy.isExploding) return;
        if (enemy.id === ball.lastHitEnemyId) return;

        const dist = Phaser.Math.Distance.Between(spr.x, spr.y, enemy.x, enemy.y);
        if (dist <= 36) {
          hitOccurred = true;
          ball.lastHitEnemyId = enemy.id;
          ball.bouncesLeft--;

          // Deal damage and huge knockback
          ctx.combatSystem.applyDamage(ctx.player, enemy, ball.damage);
          const angle = Phaser.Math.Angle.Between(spr.x, spr.y, enemy.x, enemy.y);
          enemy.applyKnockback(Math.cos(angle) * 360, Math.sin(angle) * 360, 200);

          if (ctx.vfxPool) {
            ctx.vfxPool.spawnImpactSplat(spr.x, spr.y, 0.9);
          }
          AudioManager.getInstance().playImpactSplat();

          if (ball.bouncesLeft <= 0) {
            // Expired ricochets
            if (ctx.projectilePool) {
              ctx.projectilePool.releaseProjectile(spr);
            } else {
              spr.destroy();
            }
            this.balls.splice(i, 1);
          } else {
            // Find next target to bounce to
            const nextTarget = this.findNextBounceTarget(spr.x, spr.y, enemy.id, ctx.enemiesMap, 280);
            if (nextTarget) {
              const bounceAngle = Phaser.Math.Angle.Between(spr.x, spr.y, nextTarget.x, nextTarget.y);
              spr.setVelocity(Math.cos(bounceAngle) * ball.speed, Math.sin(bounceAngle) * ball.speed);
            } else {
              // Reverse velocity slightly with random offset
              const bounceAngle = angle + Math.PI + Phaser.Math.FloatBetween(-0.6, 0.6);
              spr.setVelocity(Math.cos(bounceAngle) * ball.speed, Math.sin(bounceAngle) * ball.speed);
            }
          }
        }
      });

      if (ball.lifeTimerMs <= 0 && spr.active) {
        if (ctx.projectilePool) {
          ctx.projectilePool.releaseProjectile(spr);
        } else {
          spr.destroy();
        }
        this.balls.splice(i, 1);
      }
    }
  }

  private findNextBounceTarget(x: number, y: number, excludeId: string, enemiesMap: Map<string, Entity>, range: number): Entity | null {
    let closest: Entity | null = null;
    let minDist = range;

    enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive || enemy.isExploding || enemy.id === excludeId) return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    });

    return closest;
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
