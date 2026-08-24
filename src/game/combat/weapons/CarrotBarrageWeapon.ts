import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';
import type { Entity } from '../../entities/Entity';
import { AudioManager } from '../../audio/AudioManager';

export class CarrotBarrageWeapon implements IWeapon {
  readonly id = 'weapon_carrot_barrage';
  readonly name = 'Морковный Град';

  private attackTimer = 0;

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    if ((mods.carrotBarrageLevel ?? 0) <= 0) return;
    const carrotLevel = mods.carrotBarrageLevel;

    const baseSpeed = (ctx.player.stats.attackSpeed ?? 1.4) * (1 + mods.attackSpeedBonus);
    const baseInterval = 550 / baseSpeed;

    this.attackTimer += delta;
    if (this.attackTimer < baseInterval) return;

    const targets = this.findNearbyEnemies(ctx.player, ctx.enemiesMap, 340 + mods.extraRange);
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
    const spreadAngle = 0.22;
    const startAngle = -((carrotsCount - 1) * spreadAngle) / 2;

    for (let i = 0; i < carrotsCount; i++) {
      const angle = Phaser.Math.Angle.Between(ctx.player.x, ctx.player.y, primaryTarget.x, primaryTarget.y) + startAngle + i * spreadAngle;
      this.fireCarrot(ctx, angle, damage, isSuperCrit, 1 + (carrotLevel >= 4 ? 1 : 0) + (mods.pierceCount || 0));
    }

    AudioManager.getInstance().playClick();
  }

  private fireCarrot(ctx: WeaponContext, angle: number, damage: number, isSuperCrit: boolean, pierce: number): void {
    const proj = ctx.projectilesGroup.create(
      ctx.player.x,
      ctx.player.y,
      'tex_carrot_proj'
    ) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

    const scale = isSuperCrit ? 1.5 : 1.0;
    proj.setScale(scale);
    proj.setCircle(8 * scale);
    proj.setData('damage', Math.round(damage));
    proj.setData('pierce', pierce);
    proj.setData('isCarrot', true);
    proj.setDepth(9);

    if (isSuperCrit) {
      proj.setTint(0xf97316);
    }

    const speed = 640;
    proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    proj.rotation = angle;

    ctx.scene.time.delayedCall(1100, () => {
      if (proj && proj.active) proj.destroy();
    });
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
