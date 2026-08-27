import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_ARMOR: UpgradeDefinition = {
  id: TOME_IDS.ARMOR,
  name: '«Майка-Алкоголичка»',
  category: 'tome',
  iconKey: 'icon_tome_armor',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Броня +1 (снижает входящий урон на 1).',
      apply: (mod, stats) => {
        mod.tomeArmor = 1;
        stats.modifyArmor(1);
      },
    },
    {
      level: 2,
      description: 'Броня +2, Максимальное HP +15.',
      apply: (mod, stats, health) => {
        mod.tomeArmor = 2;
        stats.modifyArmor(1);
        stats.modifyMaxHp(15);
        health.heal(15);
      },
    },
    {
      level: 3,
      description: '★ БРОНЕВАЯ ТКАНЬ: Броня +3, поглощение 15% всего урона.',
      apply: (mod, stats) => {
        mod.tomeArmor = 3;
        stats.modifyArmor(1);
        mod.damageReductionPercent = Math.max(mod.damageReductionPercent, 0.15);
      },
    },
    {
      level: 4,
      description: 'Броня +4, Максимальное HP +25.',
      apply: (mod, stats, health) => {
        mod.tomeArmor = 4;
        stats.modifyArmor(1);
        stats.modifyMaxHp(25);
        health.heal(25);
      },
    },
    {
      level: 5,
      description: '★ ТИТАНОВАЯ ЗАКАЛКА: Броня +5, поглощение 25% всего входящего урона!',
      apply: (mod, stats) => {
        mod.tomeArmor = 5;
        stats.modifyArmor(1);
        mod.damageReductionPercent = Math.max(mod.damageReductionPercent, 0.25);
      },
    },
  ],
};
