import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';

export class AcidTrailWeapon implements IWeapon {
  readonly id = 'weapon_acid_trail';
  readonly name = 'Дырявый Носок';

  private stinkAuraTimer = 0;
  private auraGfx?: Phaser.GameObjects.Graphics;

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    const level = mods.acidTrailLevel ?? 0;
    if (level <= 0) {
      if (this.auraGfx) {
        this.auraGfx.clear();
      }
      return;
    }

    this.stinkAuraTimer += delta;
    if (this.stinkAuraTimer >= 450) {
      this.stinkAuraTimer = 0;
      this.emitStinkPulse(ctx, level);
    }
  }

  private emitStinkPulse(ctx: WeaponContext, level: number): void {
    const px = ctx.player.x;
    const py = ctx.player.y;
    const mods = ctx.gameState.playerModifiers;
    const auraRadius = (70 + (level - 1) * 12) * (1 + (mods.extraRange > 0 ? 0.25 : 0));
    const damage = Math.round((12 + (level - 1) * 6) * (1 + mods.damagePercentBonus));

    // Stinky Sock Placeholder VFX: translucent green pulsing stench radius
    if (!this.auraGfx) {
      this.auraGfx = ctx.scene.add.graphics().setDepth(7);
    }
    ctx.scene.tweens.killTweensOf(this.auraGfx);
    this.auraGfx.clear();
    this.auraGfx.setAlpha(1);
    this.auraGfx.lineStyle(2, 0x84cc16, 0.4);
    this.auraGfx.fillStyle(0xa3e635, 0.08);
    this.auraGfx.fillCircle(px, py, auraRadius);
    this.auraGfx.strokeCircle(px, py, auraRadius);

    ctx.scene.tweens.add({
      targets: this.auraGfx,
      alpha: 0,
      duration: 380,
      onComplete: () => {
        if (this.auraGfx) {
          this.auraGfx.clear();
          this.auraGfx.setAlpha(1);
        }
      },
    });

    // Damage enemies directly inside stench aura
    const auraRadiusSq = auraRadius * auraRadius;
    for (const enemy of ctx.enemiesMap.values()) {
      if (!enemy.isAlive || enemy.isExploding) continue;
      const dx = enemy.x - px;
      const dy = enemy.y - py;
      const distSq = dx * dx + dy * dy;
      if (distSq <= auraRadiusSq) {
        ctx.combatSystem.applyDamage(ctx.player, enemy, damage);
        if (level >= 3) {
          enemy.applySlow(0.40, 1500);
        }
        if (enemy.sprite && ctx.flashSprite) {
          ctx.flashSprite(enemy.sprite, 0x84cc16);
        }
      }
    }
  }
}
