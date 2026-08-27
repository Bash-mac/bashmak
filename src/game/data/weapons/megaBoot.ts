import type { UpgradeDefinition } from '../definitions';
import { WEAPON_IDS } from '../itemIds';

export const WPN_MEGA_BOOT: UpgradeDefinition = {
  id: WEAPON_IDS.MEGA_BOOT,
  name: 'Тяжёлый Башмак',
  category: 'weapon',
  iconKey: 'icon_weapon_mega_boot',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'С неба падает подошва 45-го размера с сейсмической волной по площади.',
      apply: (mod) => {
        mod.megaBootLevel = 1;
      },
    },
    {
      level: 2,
      description: 'Радиус сейсмической волны +25%, урон +35%.',
      apply: (mod) => {
        mod.megaBootLevel = 2;
      },
    },
    {
      level: 3,
      description: ' ДВОЙНОЙ ТОПОТ: Падают два ботинка подряд!',
      apply: (mod) => {
        mod.megaBootLevel = 3;
      },
    },
    {
      level: 4,
      description: 'Урон +40%, перезарядка удара ускорена на 20%.',
      apply: (mod) => {
        mod.megaBootLevel = 4;
      },
    },
    {
      level: 5,
      description: ' ТИТАНИЧЕСКИЙ ШЛЕПОК: Круговой сейсмический разлом на весь экран!',
      apply: (mod) => {
        mod.megaBootLevel = 5;
      },
    },
  ],
};
