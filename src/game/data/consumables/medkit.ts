import type { UpgradeDefinition } from '../definitions';
import { CONSUMABLE_IDS } from '../itemIds';

export const CONSUMABLE_HEAL: UpgradeDefinition = {
  id: CONSUMABLE_IDS.HEAL,
  name: 'Аптечка-слизь',
  category: 'consumable',
  iconKey: 'icon_consumable_medkit',
  isConsumable: true,
  maxLevel: 999,
  levels: [
    {
      level: 1,
      description: 'Мгновенно восстанавливает +35 HP.',
      apply: (_mod, _stats, health) => {
        health.heal(35);
      },
    },
  ],
};
