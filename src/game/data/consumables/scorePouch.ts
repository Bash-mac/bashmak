import type { UpgradeDefinition } from '../definitions';
import { CONSUMABLE_IDS } from '../itemIds';

export const CONSUMABLE_SCORE: UpgradeDefinition = {
  id: CONSUMABLE_IDS.SCORE,
  name: 'Мешок слизи',
  category: 'consumable',
  iconKey: 'icon_consumable_score',
  isConsumable: true,
  maxLevel: 999,
  levels: [
    {
      level: 1,
      description: 'Добавляет +250 бонусных очков выживания.',
      apply: (_mod, _stats, _health) => {},
    },
  ],
};
