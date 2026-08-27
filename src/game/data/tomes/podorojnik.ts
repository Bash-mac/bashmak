import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_HP_REGEN: UpgradeDefinition = {
  id: TOME_IDS.HP_REGEN,
  name: '«Подорожник»',
  category: 'tome',
  iconKey: 'icon_tome_hp_regen',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: '🌿 Регенерация здоровья +0.5 HP/сек.',
      apply: (mod) => {
        mod.tomeHpRegen = 1;
        mod.hpRegenPerSec += 0.5;
      },
    },
    {
      level: 2,
      description: '🌿 Регенерация здоровья +1.0 HP/сек (суммарно).',
      apply: (mod) => {
        mod.tomeHpRegen = 2;
        mod.hpRegenPerSec += 0.5;
      },
    },
    {
      level: 3,
      description: '🌿 Регенерация здоровья +1.5 HP/сек (суммарно).',
      apply: (mod) => {
        mod.tomeHpRegen = 3;
        mod.hpRegenPerSec += 0.5;
      },
    },
    {
      level: 4,
      description: '🌿 Регенерация здоровья +2.0 HP/сек (суммарно).',
      apply: (mod) => {
        mod.tomeHpRegen = 4;
        mod.hpRegenPerSec += 0.5;
      },
    },
    {
      level: 5,
      description: '★ ВЕЧНЫЙ БИО-ПУЛЬС: Регенерация +3.0 HP/сек!',
      apply: (mod) => {
        mod.tomeHpRegen = 5;
        mod.hpRegenPerSec += 1.0;
      },
    },
  ],
};
