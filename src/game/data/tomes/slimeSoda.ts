import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_DAMAGE: UpgradeDefinition = {
  id: TOME_IDS.DAMAGE,
  name: '«Слизь-Кола»',
  category: 'tome',
  iconKey: 'icon_tome_damage',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Урон ВСЕГО арсенала в игре +20%.',
      apply: (mod) => {
        mod.tomeDamage = 1;
        mod.damagePercentBonus += 0.20;
      },
    },
    {
      level: 2,
      description: 'Урон ВСЕГО арсенала в игре +30% (суммарно).',
      apply: (mod) => {
        mod.tomeDamage = 2;
        mod.damagePercentBonus += 0.10;
      },
    },
    {
      level: 3,
      description: 'Урон ВСЕГО арсенала в игре +40% (суммарно).',
      apply: (mod) => {
        mod.tomeDamage = 3;
        mod.damagePercentBonus += 0.10;
      },
    },
    {
      level: 4,
      description: 'Урон ВСЕГО арсенала в игре +50% (суммарно).',
      apply: (mod) => {
        mod.tomeDamage = 4;
        mod.damagePercentBonus += 0.10;
      },
    },
    {
      level: 5,
      description: 'ТОКСИЧЕСКИЙ ДОПИНГ: Урон всего арсенала +60% (суммарно)!',
      apply: (mod) => {
        mod.tomeDamage = 5;
        mod.damagePercentBonus += 0.10;
      },
    },
  ],
};

export const TOME_CRIT_SIZE = TOME_DAMAGE;

