import type { IWeapon, WeaponContext } from './weapons/IWeapon';
import { HomingDaggersWeapon } from './weapons/HomingDaggersWeapon';
import { BouncingBonesWeapon } from './weapons/BouncingBonesWeapon';
import { LightningZapWeapon } from './weapons/LightningZapWeapon';
import { AcidTrailWeapon } from './weapons/AcidTrailWeapon';

export class WeaponManager {
  private weapons: IWeapon[] = [];

  constructor() {
    this.weapons = [
      new HomingDaggersWeapon(),
      new BouncingBonesWeapon(),
      new LightningZapWeapon(),
      new AcidTrailWeapon(),
    ];
  }

  public registerWeapon(weapon: IWeapon): void {
    if (!this.weapons.some((w) => w.id === weapon.id)) {
      this.weapons.push(weapon);
    }
  }

  public update(delta: number, ctx: WeaponContext): void {
    for (const weapon of this.weapons) {
      weapon.update(delta, ctx);
    }
  }

  public reset(): void {
    // Reinstantiate to reset local weapon timers
    this.weapons = [
      new HomingDaggersWeapon(),
      new BouncingBonesWeapon(),
      new LightningZapWeapon(),
      new AcidTrailWeapon(),
    ];
  }
}
