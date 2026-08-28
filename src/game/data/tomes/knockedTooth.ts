import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_CRIT: UpgradeDefinition = {
  id: TOME_IDS.CRIT,
  name: '«Выбитый Зуб»',
  category: 'tome',
  iconKey: 'icon_tome_crit',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: ' Шанс крита ВСЕХ атак +10%, множитель крит-урона 1.8×.',
      apply: (mod) => {
        mod.tomeCrit = 1;
        mod.critChance += 0.10;
        mod.critMultiplier = Math.max(mod.critMultiplier, 1.8);
      },
    },
    {
      level: 2,
      description: ' Шанс крита +20%, множитель крит-урона 2.1×.',
      apply: (mod) => {
        mod.tomeCrit = 2;
        mod.critChance += 0.10;
        mod.critMultiplier = Math.max(mod.critMultiplier, 2.1);
      },
    },
    {
      level: 3,
      description: ' Шанс крита +30%, множитель крит-урона 2.4×.',
      apply: (mod) => {
        mod.tomeCrit = 3;
        mod.critChance += 0.10;
        mod.critMultiplier = Math.max(mod.critMultiplier, 2.4);
      },
    },
    {
      level: 4,
      description: ' Шанс крита +40%, множитель крит-урона 2.8×.',
      apply: (mod) => {
        mod.tomeCrit = 4;
        mod.critChance += 0.10;
        mod.critMultiplier = Math.max(mod.critMultiplier, 2.8);
      },
    },
    {
      level: 5,
      description: ' КРОВАВЫЙ РАЗРЫВ: Шанс крита +55%, множитель 3.2×!',
      apply: (mod) => {
        mod.tomeCrit = 5;
        mod.critChance += 0.15;
        mod.critMultiplier = Math.max(mod.critMultiplier, 3.2);
      },
    },
  ],
};
