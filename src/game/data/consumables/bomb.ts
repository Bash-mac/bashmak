import type { UpgradeDefinition } from '../definitions';
import { CONSUMABLE_IDS } from '../itemIds';

export const CONSUMABLE_BOMB: UpgradeDefinition = {
  id: CONSUMABLE_IDS.BOMB,
  name: 'Бомба-волна',
  category: 'consumable',
  iconKey: 'icon_tome_area',
  isConsumable: true,
  maxLevel: 999,
  levels: [
    {
      level: 1,
      description: 'Вызывает ударную волну, наносящую 120 урона всем врагам на экране.',
      apply: (mod) => {
        mod.splashPercent += 0.5;
      },
    },
  ],
};
