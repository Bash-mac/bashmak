import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_MAGNET: UpgradeDefinition = {
  id: TOME_IDS.MAGNET,
  name: '«Липкая Жвачка»',
  category: 'tome',
  iconKey: 'icon_tome_magnet',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Радиус притягивания кристаллов и дропа +60%, получаемый опыт +15%.',
      apply: (mod) => {
        mod.tomeMagnet = 1;
        mod.magnetRadiusBonus += 80;
      },
    },
    {
      level: 2,
      description: 'Радиус авто-магнита +120%, получаемый опыт +30%.',
      apply: (mod) => {
        mod.tomeMagnet = 2;
        mod.magnetRadiusBonus += 80;
      },
    },
    {
      level: 3,
      description: ' ГИПЕР-ПЫЛЕСОС: Радиус авто-магнита +200% (+2% за каждый уровень игрока).',
      apply: (mod) => {
        mod.tomeMagnet = 3;
        mod.magnetRadiusBonus += 100;
      },
    },
    {
      level: 4,
      description: 'Жвачка притягивает кристаллы со всей карты раз в 25 секунд.',
      apply: (mod) => {
        mod.tomeMagnet = 4;
        mod.magnetRadiusBonus += 100;
      },
    },
    {
      level: 5,
      description: ' ВАКУУМНЫЙ СИНТЕЗ: Все кристаллы непрерывно летят к игроку + 50% бонус XP!',
      apply: (mod) => {
        mod.tomeMagnet = 5;
        mod.magnetRadiusBonus += 300;
      },
    },
  ],
};
