import type { UpgradeDefinition } from '../definitions';
import { TOME_QUANTITY } from './doubleGullet';
import { TOME_SPEED } from './speedKeds';
import { TOME_ATTACK_SPEED } from './energyDrink';
import { TOME_MAGNET } from './stickyGum';
import { TOME_DAMAGE } from './slimeSoda';
import { TOME_CRIT } from './knockedTooth';
import { TOME_ARMOR } from './stainedTanktop';
import { TOME_HP_REGEN } from './podorojnik';
import { TOME_LIFESTEAL } from './leech';
import { TOME_AREA } from './rippedMegaphone';

export { TOME_QUANTITY } from './doubleGullet';
export { TOME_SPEED } from './speedKeds';
export { TOME_ATTACK_SPEED } from './energyDrink';
export { TOME_MAGNET } from './stickyGum';
export { TOME_DAMAGE, TOME_CRIT_SIZE } from './slimeSoda';
export { TOME_CRIT } from './knockedTooth';
export { TOME_ARMOR } from './stainedTanktop';
export { TOME_HP_REGEN } from './podorojnik';
export { TOME_LIFESTEAL } from './leech';
export { TOME_AREA } from './rippedMegaphone';

export const TOME_UPGRADES: UpgradeDefinition[] = [
  TOME_QUANTITY,
  TOME_SPEED,
  TOME_ATTACK_SPEED,
  TOME_MAGNET,
  TOME_DAMAGE,
  TOME_CRIT,
  TOME_ARMOR,
  TOME_HP_REGEN,
  TOME_LIFESTEAL,
  TOME_AREA,
];
