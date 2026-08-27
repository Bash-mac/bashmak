import type { UpgradeDefinition } from '../definitions';
import { TOME_QUANTITY } from './doubleGullet';
import { TOME_SPEED } from './speedKeds';
import { TOME_ATTACK_SPEED } from './energyDrink';
import { TOME_MAGNET } from './stickyGum';
import { TOME_CRIT_SIZE } from './slimeSoda';
import { TOME_ARMOR } from './stainedTanktop';
import { TOME_HP_REGEN } from './podorojnik';

export { TOME_QUANTITY } from './doubleGullet';
export { TOME_SPEED } from './speedKeds';
export { TOME_ATTACK_SPEED } from './energyDrink';
export { TOME_MAGNET } from './stickyGum';
export { TOME_CRIT_SIZE } from './slimeSoda';
export { TOME_ARMOR } from './stainedTanktop';
export { TOME_HP_REGEN } from './podorojnik';

export const TOME_UPGRADES: UpgradeDefinition[] = [
  TOME_QUANTITY,
  TOME_SPEED,
  TOME_ATTACK_SPEED,
  TOME_MAGNET,
  TOME_CRIT_SIZE,
  TOME_ARMOR,
  TOME_HP_REGEN,
];
