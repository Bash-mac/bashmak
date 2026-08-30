import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_LIFESTEAL: UpgradeDefinition = {
  id: TOME_IDS.LIFESTEAL,
  name: '«Пиявка»',
  category: 'tome',
  iconKey: 'icon_tome_lifesteal',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Вампиризм: +1 HP при убийстве (кулдаун 2.5 сек).',
      apply: (mod) => {
        mod.tomeLifesteal = 1;
        mod.healOnKill = 1;
        mod.healOnKillCooldownMs = 2500;
      },
    },
    {
      level: 2,
      description: 'Вампиризм: +1 HP при убийстве (кулдаун 2.0 сек).',
      apply: (mod) => {
        mod.tomeLifesteal = 2;
        mod.healOnKill = 1;
        mod.healOnKillCooldownMs = 2000;
      },
    },
    {
      level: 3,
      description: 'Вампиризм: +1 HP при убийстве (кулдаун 1.6 сек).',
      apply: (mod) => {
        mod.tomeLifesteal = 3;
        mod.healOnKill = 1;
        mod.healOnKillCooldownMs = 1600;
      },
    },
    {
      level: 4,
      description: 'Вампиризм: +1 HP при убийстве (кулдаун 1.2 сек).',
      apply: (mod) => {
        mod.tomeLifesteal = 4;
        mod.healOnKill = 1;
        mod.healOnKillCooldownMs = 1200;
      },
    },
    {
      level: 5,
      description: 'КРОВАВЫЙ ПИР: +2 HP при убийстве (кулдаун 1.0 сек)!',
      apply: (mod) => {
        mod.tomeLifesteal = 5;
        mod.healOnKill = 2;
        mod.healOnKillCooldownMs = 1000;
      },
    },
  ],
};
