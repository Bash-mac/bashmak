import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';
import type { Entity } from '../../entities/Entity';
import { AudioManager } from '../../audio/AudioManager';

export class SlimeSpitWeapon implements IWeapon {
  readonly id = 'weapon_slime_spit';
  readonly name = 'Слизеплюй';

  private attackTimer = 0;

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    // Slime Spit fires if level is active or if hero starts with it
    const spitLevel = mods.slimeSpitLevel || 1;

    const baseSpeed = (ctx.player.stats.attackSpeed ?? 1.3) * (1 + mods.attackSpeedBonus);
    const baseInterval = 770 / baseSpeed;

    this.attackTimer += delta;
    if (this.attackTimer < baseInterval) return;

    const maxRange = 300 + mods.extraRange;
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
      const animKey = ctx.scene.anims.exists('vypolzok_anim_spit') ? 'vypolzok_anim_spit' : 'tony_anim_spit';
      playerSprite.play(animKey, true);
      playerSprite.setData('isAttacking', true);
      ctx.scene.time.delayedCall(260, () => {
        if (playerSprite.active && !playerSprite.getData('isHurt') && ctx.player.isAlive) {
          playerSprite.setData('isAttacking', false);
        }
      });
    }

    const multishot = Math.max(1, mods.multishotCount || 1);
    const bursts = Math.max(1, mods.burstFireCount || 1);

    for (let b = 0; b < bursts; b++) {
      ctx.scene.time.delayedCall(b * 80, () => {
        const spreadAngle = 0.28;
        const startAngle = -((multishot - 1) * spreadAngle) / 2;

        for (let i = 0; i < multishot; i++) {
          const target = targets[i % targets.length] || primaryTarget;
          this.fireSpit(ctx, target, damage, isCrit, mods.pierceCount || 0, startAngle + i * spreadAngle, spitLevel);
        }
      });
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
    const proj = ctx.projectilesGroup.create(
      ctx.player.x,
      ctx.player.y,
      'vfx_spit_proj_1'
    ) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

    if (ctx.scene.anims.exists('vfx_anim_spit_proj')) {
      proj.play('vfx_anim_spit_proj');
    }

    const scale = (ctx.gameState.playerModifiers.fatSpitScale || 1.0) * (isCrit ? 1.4 : 1.0);
    proj.setScale(scale);
    proj.setCircle(10 * scale);
    proj.setData('damage', Math.round(damage));
    proj.setData('pierce', pierce);
    proj.setData('isSlimeSpit', true);
    proj.setData('spitLevel', spitLevel);
    proj.setDepth(9);

    if (isCrit) {
      proj.setTint(0xfacc15);
    }

    const angle = Phaser.Math.Angle.Between(ctx.player.x, ctx.player.y, target.x, target.y) + angleOffset;
    const speed = 520;
    proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    proj.rotation = angle;

    AudioManager.getInstance().playSlimeSpit();

    ctx.scene.time.delayedCall(1300, () => {
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
