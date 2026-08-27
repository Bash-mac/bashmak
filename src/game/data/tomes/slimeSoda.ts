import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_CRIT_SIZE: UpgradeDefinition = {
  id: TOME_IDS.CRIT_SIZE,
  name: '«Слизь-Кола»',
  category: 'tome',
  iconKey: 'icon_tome_toxic_rage',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Урон всего арсенала +15%, шанс крита +15%, размер всех атак +25%.',
      apply: (mod) => {
        mod.tomeCritSize = 1;
        mod.damagePercentBonus += 0.15;
        mod.critChance += 0.15;
        mod.fatSpitScale += 0.25;
      },
    },
    {
      level: 2,
      description: 'Урон +25%, шанс крита +25%, множитель крит-урона 2.3×.',
      apply: (mod) => {
        mod.tomeCritSize = 2;
        mod.damagePercentBonus += 0.10;
        mod.critChance += 0.10;
        mod.critMultiplier = 2.3;
      },
    },
    {
      level: 3,
      description: '★ ТОТАЛЬНОЕ СОКРУШЕНИЕ: Шанс крита +35%, размер снарядов +50%.',
      apply: (mod) => {
        mod.tomeCritSize = 3;
        mod.damagePercentBonus += 0.15;
        mod.critChance += 0.10;
        mod.fatSpitScale += 0.25;
      },
    },
    {
      level: 4,
      description: 'Шанс крита +45%, множитель крит-урона 2.7×.',
      apply: (mod) => {
        mod.tomeCritSize = 4;
        mod.critChance += 0.10;
        mod.critMultiplier = 2.7;
      },
    },
    {
      level: 5,
      description: '★ ГИГАНТСКИЙ АПОКАЛИПСИС: Шанс крита +60%, множитель 3.2×, двойной радиус всех атак!',
      apply: (mod) => {
        mod.tomeCritSize = 5;
        mod.critChance += 0.15;
        mod.critMultiplier = 3.2;
        mod.fatSpitScale += 0.5;
      },
    },
  ],
};
