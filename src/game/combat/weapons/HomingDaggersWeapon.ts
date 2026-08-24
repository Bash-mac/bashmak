import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';
import type { Entity } from '../../entities/Entity';
import { WORM_HERO } from '../../data/heroes';

export class HomingDaggersWeapon implements IWeapon {
  readonly id = 'weapon_homing_daggers';
  readonly name = 'Беспроводные иглы';

  private attackTimer = 0;

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    if (mods.homingDaggersLevel <= 0) return;

    const baseSpeed = (ctx.player.stats.attackSpeed ?? 1.3) * (1 + mods.attackSpeedBonus);
    const baseInterval = (WORM_HERO.attackIntervalMs ?? 770) / baseSpeed;

    this.attackTimer += delta;
    if (this.attackTimer < baseInterval) return;

    const maxRange = 280 + mods.extraRange;
    const targets = this.findNearbyEnemies(ctx.player, ctx.enemiesMap, maxRange);
    if (targets.length === 0) return;

    this.attackTimer = 0;
    const primaryTarget = targets[0];
    let damage = ctx.player.stats.damage * (1 + mods.damagePercentBonus);

    // Low HP rage bonus
    if (ctx.player.health.percent < mods.lowHpDmgThreshold) {
      damage *= (1 + mods.lowHpDmgBonus);
    }

    // Critical Hits
    let isCrit = false;
    if (mods.critChance > 0 && Math.random() < mods.critChance) {
      isCrit = true;
      damage *= mods.critMultiplier;
    }

    // Visual spit animation on player sprite
    const playerSprite = ctx.player.sprite;
    if (playerSprite && playerSprite.active && !playerSprite.getData('isHurt')) {
      playerSprite.play('tony_anim_spit', true);
      playerSprite.setData('isAttacking', true);
      ctx.scene.time.delayedCall(280, () => {
        if (playerSprite.active && !playerSprite.getData('isHurt') && ctx.player.isAlive) {
          playerSprite.setData('isAttacking', false);
        }
      });
    }

    const totalDaggers = Math.max(1, mods.homingDaggersCount);
    const bursts = Math.max(1, mods.burstFireCount);

    for (let b = 0; b < bursts; b++) {
      ctx.scene.time.delayedCall(b * 75, () => {
        const spreadAngle = 0.32;
        const startAngle = -((totalDaggers - 1) * spreadAngle) / 2;

        for (let i = 0; i < totalDaggers; i++) {
          const target = targets[i % targets.length] || primaryTarget;
          this.fireDagger(ctx, target, damage, isCrit, mods.pierceCount, startAngle + i * spreadAngle);
        }
      });
    }
  }

  private fireDagger(
    ctx: WeaponContext,
    target: Entity,
    damage: number,
    isCrit: boolean,
    pierce: number,
    angleOffset: number
  ): void {
    const proj = ctx.projectilesGroup.create(ctx.player.x, ctx.player.y, 'tex_homing_dagger') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    const scale = (ctx.gameState.playerModifiers.fatSpitScale || 1.0) * (isCrit ? 1.4 : 1.1);
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
    proj.setData('isHoming', true);
    proj.setData('speed', 580);
    proj.setDepth(9);

    if (ctx.scene.anims.exists('vfx_anim_spit_proj')) {
      proj.play('vfx_anim_spit_proj');
    }

    if (isCrit) {
      proj.setTint(0xfacc15);
    }

    const angle = Phaser.Math.Angle.Between(ctx.player.x, ctx.player.y, target.x, target.y) + angleOffset;
    proj.setVelocity(Math.cos(angle) * 580, Math.sin(angle) * 580);
    proj.rotation = angle;

    ctx.scene.time.delayedCall(1200, () => {
      if (proj && proj.active) proj.destroy();
    });
  }

  private findNearbyEnemies(player: Entity, enemiesMap: Map<string, Entity>, range: number): Entity[] {
    const valid: Array<{ entity: Entity; dist: number }> = [];
    enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive || enemy.isExploding) return;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      if (dist <= range) {
        valid.push({ entity: enemy, dist });
      }
    });
    valid.sort((a, b) => a.dist - b.dist);
    return valid.map((v) => v.entity);
  }
}
