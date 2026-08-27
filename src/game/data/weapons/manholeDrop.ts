import type { UpgradeDefinition } from '../definitions';
import { WEAPON_IDS } from '../itemIds';

export const WPN_LIGHTNING_ZAP: UpgradeDefinition = {
  id: WEAPON_IDS.LIGHTNING_ZAP,
  name: 'Чугунный Люк',
  category: 'weapon',
  iconKey: 'icon_weapon_manhole_drop',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'На голову сильнейшему врагу падает тяжелый чугунный люк с оглушением и критическим уроном.',
      apply: (mod) => {
        mod.lightningZapLevel = 1;
        mod.staticZapMax = 100;
      },
    },
    {
      level: 2,
      description: 'Частота падения люков +40%, урон +30%.',
      apply: (mod) => {
        mod.lightningZapLevel = 2;
        mod.staticZapMax = 70;
      },
    },
    {
      level: 3,
      description: '★ ЧУГУННЫЙ КОНТУЗ: Люк оглушает цель на 1.5 сек и замедляет мобов вокруг на 60%.',
      apply: (mod) => {
        mod.lightningZapLevel = 3;
        mod.slowPercent = Math.max(mod.slowPercent, 0.60);
        mod.slowDurationMs = 2500;
      },
    },
    {
      level: 4,
      description: 'Падает 2 люка одновременно + урон +60%.',
      apply: (mod) => {
        mod.lightningZapLevel = 4;
        mod.damagePercentBonus += 0.25;
      },
    },
    {
      level: 5,
      description: '★ ЛЮКОПАД: Непрерывный камнепад чугунных люков по всем элиткам каждые 1.5 сек!',
      apply: (mod) => {
        mod.lightningZapLevel = 5;
        mod.staticZapMax = 35;
      },
    },
  ],
};
