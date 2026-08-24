import type { IWeapon, WeaponContext } from './weapons/IWeapon';
import { SlimeSpitWeapon } from './weapons/SlimeSpitWeapon';
import { LaceWhipWeapon } from './weapons/LaceWhipWeapon';
import { CarrotBarrageWeapon } from './weapons/CarrotBarrageWeapon';
import { EggplantRollWeapon } from './weapons/EggplantRollWeapon';
import { OrbitingFliesWeapon } from './weapons/OrbitingFliesWeapon';
import { MegaBootWeapon } from './weapons/MegaBootWeapon';
import { ManholeDropWeapon } from './weapons/ManholeDropWeapon';
import { AcidTrailWeapon } from './weapons/AcidTrailWeapon';

export class WeaponManager {
  private weapons: IWeapon[] = [];

  constructor() {
    this.weapons = [
      new SlimeSpitWeapon(),
      new LaceWhipWeapon(),
      new CarrotBarrageWeapon(),
      new EggplantRollWeapon(),
      new OrbitingFliesWeapon(),
      new MegaBootWeapon(),
      new ManholeDropWeapon(),
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
    this.weapons = [
      new SlimeSpitWeapon(),
      new LaceWhipWeapon(),
      new CarrotBarrageWeapon(),
      new EggplantRollWeapon(),
      new OrbitingFliesWeapon(),
      new MegaBootWeapon(),
      new ManholeDropWeapon(),
      new AcidTrailWeapon(),
    ];
  }
}
