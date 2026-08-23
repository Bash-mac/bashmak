import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';

export class BouncingBonesWeapon implements IWeapon {
  readonly id = 'weapon_bouncing_bones';
  readonly name = 'Отскакивающие кости';

  private boneAttackTimer = 0;

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    if (mods.bouncingBonesLevel <= 0) return;

    this.boneAttackTimer += delta;
    const boneInterval = 1800 / (1 + mods.attackSpeedBonus * 0.7);

    if (this.boneAttackTimer < boneInterval) return;

    const targets = this.findNearbyEnemies(ctx, 350 + mods.extraRange);
    if (targets.length === 0) return;

    this.boneAttackTimer = 0;
    const boneCount = Math.max(1, mods.bouncingBonesCount);
    const boneDamage = Math.round(24 * (1 + mods.damagePercentBonus) * 1.4);

    for (let i = 0; i < boneCount; i++) {
      const angle = (Math.PI * 2 * i) / boneCount + Math.random() * 0.4;
      this.fireBone(ctx, angle, boneDamage, mods.bounceCount || 3);
    }
  }

  private fireBone(ctx: WeaponContext, angle: number, damage: number, bounces: number): void {
    const bone = ctx.projectilesGroup.create(ctx.player.x, ctx.player.y, 'tex_bouncing_bone') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    const scale = (ctx.gameState.playerModifiers.fatSpitScale || 1.0) * 1.2;

    bone.setScale(scale);
    bone.setCircle(10 * scale);
    bone.setData('damage', damage);
    bone.setData('bounces', bounces);
    bone.setData('isBone', true);
    bone.setBounce(1, 1);
    bone.setCollideWorldBounds(true);
    bone.setDepth(9);

    const speed = 400;
    bone.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    // Spin animation
    ctx.scene.tweens.add({
      targets: bone,
      angle: 360,
      duration: 500,
      repeat: -1,
      ease: 'Linear',
    });

    ctx.scene.time.delayedCall(4500, () => {
      if (bone && bone.active) bone.destroy();
    });
  }

  private findNearbyEnemies(ctx: WeaponContext, range: number): any[] {
    const list: any[] = [];
    ctx.enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive || enemy.isExploding) return;
      const dist = Phaser.Math.Distance.Between(ctx.player.x, ctx.player.y, enemy.x, enemy.y);
      if (dist <= range) list.push(enemy);
    });
    return list;
  }
}
