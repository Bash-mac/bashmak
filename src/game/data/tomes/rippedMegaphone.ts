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
      description: '📢 Радиус и область поражения ВСЕХ атак +12%.',
      apply: (mod) => {
        mod.tomeArea = 1;
        mod.attackAreaBonus += 0.12;
      },
    },
    {
      level: 2,
      description: '📢 Радиус и область поражения ВСЕХ атак +24%.',
      apply: (mod) => {
        mod.tomeArea = 2;
        mod.attackAreaBonus += 0.12;
      },
    },
    {
      level: 3,
      description: '📢 Радиус и область поражения ВСЕХ атак +36%.',
      apply: (mod) => {
        mod.tomeArea = 3;
        mod.attackAreaBonus += 0.12;
      },
    },
    {
      level: 4,
      description: '📢 Радиус и область поражения ВСЕХ атак +48%.',
      apply: (mod) => {
        mod.tomeArea = 4;
        mod.attackAreaBonus += 0.12;
      },
    },
    {
      level: 5,
      description: '★ МЕГАФОН ХАОСА: Область атак +70% и сокрушительное отбрасывание врагов (+50%)!',
      apply: (mod) => {
        mod.tomeArea = 5;
        mod.attackAreaBonus += 0.22;
        mod.knockbackMultiplier += 0.5;
      },
    },
  ],
};
