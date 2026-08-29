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
    const auraRadius = (110 + (level - 1) * 18) * (1 + mods.attackAreaBonus);
    const damage = Math.round((5 + ctx.player.stats.damage * 0.5 + (level - 1) * 6) * (1 + mods.damagePercentBonus));

    // Stench Aura VFX from ArcadaEffector (calibrated to true 140px visual content diameter)
    const vfxScale = (auraRadius * 2) / 140;
    ctx.vfxPool?.spawnSockStench(px, py, vfxScale);

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
