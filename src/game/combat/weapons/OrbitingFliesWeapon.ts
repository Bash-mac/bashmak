import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';

interface OrbitFly {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
}

export class OrbitingFliesWeapon implements IWeapon {
  readonly id = 'wpn_homing_daggers';
  readonly name = 'Орбитальные Мухи';

  private flies: OrbitFly[] = [];
  private currentAngle = 0;
  private hitCooldowns: Map<string, number> = new Map();

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    const level = mods.homingDaggersLevel ?? 0;
    if (level <= 0) {
      this.clearFlies(ctx);
      return;
    }

    const targetFlyCount = Math.max(2, mods.homingDaggersCount || 2);
    const radius = 90 + (mods.extraRange > 0 ? 20 : 0);
    const rotationSpeed = (2.6 + (level >= 3 ? 1.0 : 0)) * (1 + mods.attackSpeedBonus * 0.5);

    // Maintain fly instances count
    this.syncFlyCount(ctx, targetFlyCount);

    // Update orbit rotation
    const deltaSec = delta / 1000;
    this.currentAngle += rotationSpeed * deltaSec;
    const px = ctx.player.x;
    const py = ctx.player.y;

    const angleStep = (Math.PI * 2) / this.flies.length;

    // Update positions
    for (let i = 0; i < this.flies.length; i++) {
      const fly = this.flies[i];
      if (!fly.sprite || !fly.sprite.active) continue;

      const angle = this.currentAngle + i * angleStep;
      const fx = px + Math.cos(angle) * radius;
      const fy = py + Math.sin(angle) * radius;

      fly.sprite.setPosition(fx, fy);
      fly.sprite.rotation = angle + Math.PI / 2;
    }

    // Update enemy contact damage cooldowns
    for (const [id, cd] of this.hitCooldowns.entries()) {
      if (cd <= delta) {
        this.hitCooldowns.delete(id);
      } else {
        this.hitCooldowns.set(id, cd - delta);
      }
    }

    // Check collision with nearby enemies
    const damage = Math.round((14 + (level - 1) * 5) * (1 + mods.damagePercentBonus));

    ctx.enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive || enemy.isExploding) return;
      if (this.hitCooldowns.has(enemy.id)) return;

      for (const fly of this.flies) {
        if (!fly.sprite || !fly.sprite.active) continue;
        const dist = Phaser.Math.Distance.Between(fly.sprite.x, fly.sprite.y, enemy.x, enemy.y);
        if (dist <= 26) {
          ctx.combatSystem.applyDamage(ctx.player, enemy, damage);
          this.hitCooldowns.set(enemy.id, 280);

          const pushAngle = Phaser.Math.Angle.Between(px, py, enemy.x, enemy.y);
          enemy.applyKnockback(Math.cos(pushAngle) * 160, Math.sin(pushAngle) * 160, 100);

          if (ctx.vfxPool) {
            ctx.vfxPool.spawnImpactSplat(fly.sprite.x, fly.sprite.y, 0.6);
          }
          break;
        }
      }
    });
  }

  public reset(): void {
    this.flies = [];
    this.hitCooldowns.clear();
    this.currentAngle = 0;
  }

  private syncFlyCount(ctx: WeaponContext, targetCount: number): void {
    // 1. Remove invalid / dead / foreign scene flies
    for (let i = this.flies.length - 1; i >= 0; i--) {
      const fly = this.flies[i];
      if (!fly.sprite || !fly.sprite.active || fly.sprite.scene !== ctx.scene) {
        this.flies.splice(i, 1);
      }
    }

    // 2. Spawn missing flies
    while (this.flies.length < targetCount) {
      const spr = ctx.projectilePool
        ? ctx.projectilePool.getProjectile('tex_homing_dagger', ctx.player.x, ctx.player.y)
        : (ctx.projectilesGroup.create(ctx.player.x, ctx.player.y, 'tex_homing_dagger') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody);

      spr.setScale(1.1);
      spr.setTint(0x4ade80); // Toxic green fly
      spr.setDepth(9);
      if (spr.body) {
        spr.body.enable = false; // Managed directly via orbital positions
      }
      this.flies.push({ sprite: spr });
    }

    // 3. Release excess flies
    while (this.flies.length > targetCount) {
      const fly = this.flies.pop();
      if (fly?.sprite) {
        if (ctx.projectilePool) {
          ctx.projectilePool.releaseProjectile(fly.sprite);
        } else {
          fly.sprite.destroy();
        }
      }
    }
  }

  private clearFlies(ctx: WeaponContext): void {
    for (const fly of this.flies) {
      if (fly.sprite?.active && fly.sprite.scene === ctx.scene) {
        if (ctx.projectilePool) {
          ctx.projectilePool.releaseProjectile(fly.sprite);
        } else {
          fly.sprite.destroy();
        }
      }
    }
    this.flies = [];
    this.hitCooldowns.clear();
  }
}
