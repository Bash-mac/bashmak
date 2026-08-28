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
      description: 'Вампиризм: +1 HP при убийстве (кулдаун 1.2 сек).',
      apply: (mod) => {
        mod.tomeLifesteal = 1;
        mod.healOnKill = 1;
        mod.healOnKillCooldownMs = 1200;
      },
    },
    {
      level: 2,
      description: 'Вампиризм: +1 HP при убийстве (кулдаун 0.8 сек).',
      apply: (mod) => {
        mod.tomeLifesteal = 2;
        mod.healOnKill = 1;
        mod.healOnKillCooldownMs = 800;
      },
    },
    {
      level: 3,
      description: 'Вампиризм: +1 HP при убийстве (кулдаун 0.5 сек).',
      apply: (mod) => {
        mod.tomeLifesteal = 3;
        mod.healOnKill = 1;
        mod.healOnKillCooldownMs = 500;
      },
    },
    {
      level: 4,
      description: 'Вампиризм: +1 HP при убийстве (кулдаун 0.35 сек).',
      apply: (mod) => {
        mod.tomeLifesteal = 4;
        mod.healOnKill = 1;
        mod.healOnKillCooldownMs = 350;
      },
    },
    {
      level: 5,
      description: 'КРОВАВЫЙ ПИР: +2 HP при убийстве (кулдаун 0.25 сек)!',
      apply: (mod) => {
        mod.tomeLifesteal = 5;
        mod.healOnKill = 2;
        mod.healOnKillCooldownMs = 250;
      },
    },
  ],
};
