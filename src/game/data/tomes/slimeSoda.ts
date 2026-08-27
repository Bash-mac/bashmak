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
      description: ' Урон ВСЕГО арсенала в игре +12%.',
      apply: (mod) => {
        mod.tomeDamage = 1;
        mod.damagePercentBonus += 0.12;
      },
    },
    {
      level: 2,
      description: ' Урон ВСЕГО арсенала в игре +24%.',
      apply: (mod) => {
        mod.tomeDamage = 2;
        mod.damagePercentBonus += 0.12;
      },
    },
    {
      level: 3,
      description: ' Урон ВСЕГО арсенала в игре +36%.',
      apply: (mod) => {
        mod.tomeDamage = 3;
        mod.damagePercentBonus += 0.12;
      },
    },
    {
      level: 4,
      description: ' Урон ВСЕГО арсенала в игре +48%.',
      apply: (mod) => {
        mod.tomeDamage = 4;
        mod.damagePercentBonus += 0.12;
      },
    },
    {
      level: 5,
      description: ' ТОКСИЧЕСКИЙ ДОПИНГ: Урон всего арсенала +65%!',
      apply: (mod) => {
        mod.tomeDamage = 5;
        mod.damagePercentBonus += 0.17;
      },
    },
  ],
};

export const TOME_CRIT_SIZE = TOME_DAMAGE;

