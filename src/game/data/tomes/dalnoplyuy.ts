import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_AREA: UpgradeDefinition = {
  id: TOME_IDS.AREA,
  name: '«Дальноплюй»',
  category: 'tome',
  iconKey: 'icon_tome_area',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Радиус и область поражения ВСЕХ атак +25%.',
      apply: (mod) => {
        mod.tomeArea = 1;
        mod.attackAreaBonus += 0.25;
      },
    },
    {
      level: 2,
      description: 'Радиус и область поражения ВСЕХ атак +35% (суммарно).',
      apply: (mod) => {
        mod.tomeArea = 2;
        mod.attackAreaBonus += 0.10;
      },
    },
    {
      level: 3,
      description: 'Радиус и область поражения ВСЕХ атак +45% (суммарно).',
      apply: (mod) => {
        mod.tomeArea = 3;
        mod.attackAreaBonus += 0.10;
      },
    },
    {
      level: 4,
      description: 'Радиус и область поражения ВСЕХ атак +55% (суммарно).',
      apply: (mod) => {
        mod.tomeArea = 4;
        mod.attackAreaBonus += 0.10;
      },
    },
    {
      level: 5,
      description: 'СВЕРХ-ОХВАТ: Радиус и область поражения ВСЕХ атак +65% (суммарно)!',
      apply: (mod) => {
        mod.tomeArea = 5;
        mod.attackAreaBonus += 0.10;
        mod.knockbackMultiplier += 0.5;
      },
    },
  ],
};
