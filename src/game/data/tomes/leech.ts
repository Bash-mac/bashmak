import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_LIFESTEAL: UpgradeDefinition = {
  id: TOME_IDS.LIFESTEAL,
  name: '«Пиявка»',
  category: 'tome',
  iconKey: 'icon_tome_mutant_heart',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: '🩸 Вампиризм: +1 HP за каждого убитого врага.',
      apply: (mod) => {
        mod.tomeLifesteal = 1;
        mod.healOnKill += 1;
      },
    },
    {
      level: 2,
      description: '🩸 Вампиризм: +2 HP за каждого убитого врага.',
      apply: (mod) => {
        mod.tomeLifesteal = 2;
        mod.healOnKill += 1;
      },
    },
    {
      level: 3,
      description: '🩸 Вампиризм: +3 HP за каждого убитого врага.',
      apply: (mod) => {
        mod.tomeLifesteal = 3;
        mod.healOnKill += 1;
      },
    },
    {
      level: 4,
      description: '🩸 Вампиризм: +4 HP за каждого убитого врага.',
      apply: (mod) => {
        mod.tomeLifesteal = 4;
        mod.healOnKill += 1;
      },
    },
    {
      level: 5,
      description: '★ КРОВАВЫЙ ПИР: +6 HP за убийство врага!',
      apply: (mod) => {
        mod.tomeLifesteal = 5;
        mod.healOnKill += 2;
      },
    },
  ],
};
