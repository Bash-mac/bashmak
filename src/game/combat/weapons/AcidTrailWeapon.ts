import Phaser from 'phaser';
import type { IWeapon, WeaponContext } from './IWeapon';

export class AcidTrailWeapon implements IWeapon {
  readonly id = 'weapon_acid_trail';
  readonly name = 'Дырявый Носок';

  private stinkAuraTimer = 0;

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    const level = mods.acidTrailLevel ?? 0;
    if (level <= 0) return;

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

    // Spawn green acid pool aura tick
    ctx.spawnAcidPool?.(px, py, auraRadius * 0.7, damage, 1800, true);

    // Damage enemies directly inside stench aura
    ctx.enemiesMap.forEach((enemy) => {
      if (!enemy.isAlive || enemy.isExploding) return;
      const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
      if (dist <= auraRadius) {
        ctx.combatSystem.applyDamage(ctx.player, enemy, damage);
        if (level >= 3) {
          enemy.applySlow(0.40, 1500);
        }
        if (enemy.sprite && ctx.flashSprite) {
          ctx.flashSprite(enemy.sprite, 0x84cc16);
        }
      }
    });
  }
}
