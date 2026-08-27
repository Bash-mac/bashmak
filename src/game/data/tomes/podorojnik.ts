import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_HP_REGEN: UpgradeDefinition = {
  id: TOME_IDS.HP_REGEN,
  name: '«Подорожник»',
  category: 'tome',
  iconKey: 'icon_tome_mutant_heart',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Регенерация +0.2 HP/сек.',
      apply: (mod) => {
        mod.tomeHpRegen = 1;
        mod.hpRegenPerSec += 0.2;
      },
    },
    {
      level: 2,
      description: 'Регенерация +0.4 HP/сек, вампиризм +0.1 HP за каждого убитого врага.',
      apply: (mod) => {
        mod.tomeHpRegen = 2;
        mod.hpRegenPerSec += 0.2;
        mod.healOnKill += 0.1;
      },
    },
    {
      level: 3,
      description: '★ ЦЕЛЕБНЫЙ ЛИСТ: Регенерация +0.6 HP/сек, Максимальное HP +20.',
      apply: (mod, stats, health) => {
        mod.tomeHpRegen = 3;
        mod.hpRegenPerSec += 0.2;
        stats.modifyMaxHp(20);
        health.heal(20);
      },
    },
    {
      level: 4,
      description: 'Регенерация +0.8 HP/сек, вампиризм +0.2 HP за каждого убитого врага.',
      apply: (mod) => {
        mod.tomeHpRegen = 4;
        mod.hpRegenPerSec += 0.2;
        mod.healOnKill += 0.1;
      },
    },
    {
      level: 5,
      description: '★ ВЕЧНЫЙ БИО-ПУЛЬС: Регенерация +1.0 HP/сек, при HP < 25% всплеск лечения +5 HP!',
      apply: (mod) => {
        mod.tomeHpRegen = 5;
        mod.hpRegenPerSec += 0.2;
      },
    },
  ],
};
