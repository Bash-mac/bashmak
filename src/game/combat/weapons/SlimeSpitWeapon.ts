import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';
import type { Entity } from '../../entities/Entity';
import { AudioManager } from '../../audio/AudioManager';

interface ActiveSpit {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  lifeTimeMs: number;
}

export class SlimeSpitWeapon implements IWeapon {
  readonly id = 'weapon_slime_spit';
  readonly name = 'Слизеплюй';

  private attackTimer = 0;
  private activeSpits: ActiveSpit[] = [];

  public reset(): void {
    this.attackTimer = 0;
    this.activeSpits = [];
  }

  update(delta: number, ctx: WeaponContext): void {
    // 1. Update existing active flying spits
    for (let i = this.activeSpits.length - 1; i >= 0; i--) {
      const spit = this.activeSpits[i];
      if (!spit.sprite.active) {
        this.activeSpits.splice(i, 1);
        continue;
      }
      spit.lifeTimeMs += delta;
      if (spit.lifeTimeMs >= 1600) {
        if (ctx.projectilePool) {
          ctx.projectilePool.releaseProjectile(spit.sprite);
        } else {
          spit.sprite.destroy();
        }
        this.activeSpits.splice(i, 1);
      }
    }

    // 2. Weapon attack check
    const mods = ctx.gameState.playerModifiers;
    if ((mods.slimeSpitLevel ?? 0) <= 0) return;
    const spitLevel = mods.slimeSpitLevel;

    const baseSpeed = (ctx.player.stats.attackSpeed ?? 1.3) * (1 + mods.attackSpeedBonus);
    const baseInterval = 1000 / baseSpeed;

    this.attackTimer += delta;
    if (this.attackTimer < baseInterval) return;

    const maxRange = 400;
    const targets = this.findNearbyEnemies(ctx.player, ctx.enemiesMap, maxRange);
    if (targets.length === 0) return;

    this.attackTimer = 0;
    const primaryTarget = targets[0];
    let damage = Math.round(ctx.player.stats.damage * 0.92) * (1 + mods.damagePercentBonus);

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
    if (playerSprite && playerSprite.active && !playerSprite.getData('isHurt') && ctx.gameState.currentHeroId === 'hero_vypolzok') {
      if (ctx.scene.anims.exists('vypolzok_anim_spit')) {
        playerSprite.play('vypolzok_anim_spit', true);
      }
      playerSprite.setData('isAttacking', true);
      ctx.scene.time.delayedCall(260, () => {
        if (playerSprite.active && !playerSprite.getData('isHurt') && ctx.player.isAlive) {
          playerSprite.setData('isAttacking', false);
        }
      });
    }

    const spitCount = (spitLevel >= 5 ? 3 : spitLevel >= 3 ? 2 : 1) + (mods.multishotCount > 1 ? mods.multishotCount - 1 : 0);
    const bursts = Math.max(1, mods.burstFireCount || 1);
    const spreadAngle = 0.22;
    const startAngle = -((spitCount - 1) * spreadAngle) / 2;

    for (let b = 0; b < bursts; b++) {
      const burstDelay = b * 120;
      if (burstDelay === 0) {
        for (let i = 0; i < spitCount; i++) {
          const target = targets[i % targets.length] || primaryTarget;
          const angleOffset = startAngle + i * spreadAngle;
          this.fireSpit(ctx, target, damage, isCrit, mods.pierceCount || 0, angleOffset, spitLevel);
        }
      } else {
        ctx.scene.time.delayedCall(burstDelay, () => {
          if (!ctx.player.isAlive || !ctx.player.sprite?.active) return;
          const freshTargets = this.findNearbyEnemies(ctx.player, ctx.enemiesMap, maxRange);
          for (let i = 0; i < spitCount; i++) {
            const target = freshTargets[i % Math.max(1, freshTargets.length)] || primaryTarget;
            const angleOffset = startAngle + i * spreadAngle;
            this.fireSpit(ctx, target, damage, isCrit, mods.pierceCount || 0, angleOffset, spitLevel);
          }
        });
      }
    }
  }

  private fireSpit(
    ctx: WeaponContext,
    target: Entity,
    damage: number,
    isCrit: boolean,
    pierce: number,
    angleOffset: number,
    spitLevel: number
  ): void {
    const proj = ctx.projectilePool
      ? ctx.projectilePool.getProjectile('vfx_spit_proj_1', ctx.player.x, ctx.player.y)
      : (ctx.projectilesGroup.create(
          ctx.player.x,
          ctx.player.y,
          'vfx_spit_proj_1'
        ) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody);

    if (ctx.scene.anims.exists('vfx_anim_spit_proj')) {
      proj.play('vfx_anim_spit_proj');
    }

    const scale = 0.70 * (ctx.gameState.playerModifiers.fatSpitScale || 1.0) * (isCrit ? 1.3 : 1.0);
    proj.setScale(scale);
    if (proj.body) {
      const targetRadius = isCrit ? 18 : 15;
      const bodyRadius = targetRadius / scale;
      proj.body.setCircle(
        bodyRadius,
        (proj.width - bodyRadius * 2) / 2,
        (proj.height - bodyRadius * 2) / 2
      );
    }
    proj.setData('damage', Math.round(damage));
    proj.setData('pierce', pierce);
    proj.setData('isSlimeSpit', true);
    proj.setData('spitLevel', spitLevel);
    proj.setDepth(9);

    if (isCrit) {
      proj.setTint(0xfacc15);
    }

    const angle = Phaser.Math.Angle.Between(ctx.player.x, ctx.player.y, target.x, target.y) + angleOffset;
    const speed = 560;
    proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    proj.rotation = angle;

    AudioManager.getInstance().playSlimeSpit();
    this.activeSpits.push({ sprite: proj, lifeTimeMs: 0 });
  }

  private findNearbyEnemies(player: Entity, enemiesMap: Map<string, Entity>, range: number, maxCount = 4): Entity[] {
    const rangeSq = range * range;
    const px = player.x;
    const py = player.y;
    const targets: Entity[] = [];
    const distancesSq: number[] = [];

    for (const enemy of enemiesMap.values()) {
      if (!enemy.isAlive || enemy.isExploding) continue;
      const dx = enemy.x - px;
      const dy = enemy.y - py;
      const distSq = dx * dx + dy * dy;
      if (distSq > rangeSq) continue;

      let insertIdx = targets.length;
      while (insertIdx > 0 && distancesSq[insertIdx - 1] > distSq) {
        insertIdx--;
      }
      if (insertIdx < maxCount) {
        targets.splice(insertIdx, 0, enemy);
        distancesSq.splice(insertIdx, 0, distSq);
        if (targets.length > maxCount) {
          targets.pop();
          distancesSq.pop();
        }
      }
    }
    return targets;
  }
}
