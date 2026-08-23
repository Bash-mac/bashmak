import type { IWeapon, WeaponContext } from './IWeapon';

export class AcidTrailWeapon implements IWeapon {
  readonly id = 'weapon_acid_trail';
  readonly name = 'Кислотный след';

  private acidTrailTimer = 0;

  update(delta: number, ctx: WeaponContext): void {
    const mods = ctx.gameState.playerModifiers;
    if (mods.acidTrailLevel <= 0) return;

    this.acidTrailTimer += delta;
    if (this.acidTrailTimer >= 550) {
      this.acidTrailTimer = 0;
      const vx = ctx.player.sprite?.body ? ctx.player.sprite.body.velocity.x : 0;
      const vy = ctx.player.sprite?.body ? ctx.player.sprite.body.velocity.y : 0;
      const isMoving = Math.abs(vx) > 10 || Math.abs(vy) > 10;

      if (isMoving) {
        const poolDmg = Math.round(14 * (1 + mods.damagePercentBonus) * (1 + mods.acidTrailLevel * 0.3));
        const poolRadius = 38 * (1 + (mods.extraRange > 0 ? 0.2 : 0));
        ctx.spawnAcidPool?.(ctx.player.x, ctx.player.y, poolRadius, poolDmg, 3500, true);
      }
    }
  }
}
