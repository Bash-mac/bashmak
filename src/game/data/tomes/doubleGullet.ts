import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_QUANTITY: UpgradeDefinition = {
  id: TOME_IDS.QUANTITY,
  name: '«Двойной Зоб»',
  category: 'tome',
  iconKey: 'icon_tome_rusty_armor',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: '🌟 ГЛОБАЛЬНО: +1 дополнительный снаряд/объект ко ВСЕМУ оружию в арсенале.',
      apply: (mod) => {
        mod.tomeQuantity = 1;
        mod.multishotCount += 1;
        mod.homingDaggersCount += 1;
      },
    },
    {
      level: 2,
      description: '🌟 ГЛОБАЛЬНО: +2 дополнительных снаряда ко ВСЕМУ оружию.',
      apply: (mod) => {
        mod.tomeQuantity = 2;
        mod.multishotCount += 1;
        mod.homingDaggersCount += 1;
      },
    },
    {
      level: 3,
      description: '🌟 ГЛОБАЛЬНО: +3 дополнительных снаряда ко ВСЕМУ оружию.',
      apply: (mod) => {
        mod.tomeQuantity = 3;
        mod.multishotCount += 1;
        mod.homingDaggersCount += 1;
      },
    },
    {
      level: 4,
      description: '🌟 ГЛОБАЛЬНО: +4 дополнительных снаряда ко ВСЕМУ оружию.',
      apply: (mod) => {
        mod.tomeQuantity = 4;
        mod.multishotCount += 1;
        mod.homingDaggersCount += 1;
      },
    },
    {
      level: 5,
      description: '★ АБСОЛЮТНЫЙ ЗАЛП: +5 снарядов ко всем атакам + 25% урона всему арсеналу!',
      apply: (mod) => {
        mod.tomeQuantity = 5;
        mod.multishotCount += 1;
        mod.homingDaggersCount += 2;
        mod.damagePercentBonus += 0.25;
      },
    },
  ],
};
