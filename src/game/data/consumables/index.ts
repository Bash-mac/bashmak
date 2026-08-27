import type { UpgradeDefinition } from '../definitions';
import { CONSUMABLE_HEAL } from './medkit';
import { CONSUMABLE_BOMB } from './bomb';
import { CONSUMABLE_SCORE } from './scorePouch';

export { CONSUMABLE_HEAL } from './medkit';
export { CONSUMABLE_BOMB } from './bomb';
export { CONSUMABLE_SCORE } from './scorePouch';

export const CONSUMABLE_UPGRADES: UpgradeDefinition[] = [
  CONSUMABLE_HEAL,
  CONSUMABLE_BOMB,
  CONSUMABLE_SCORE,
];
