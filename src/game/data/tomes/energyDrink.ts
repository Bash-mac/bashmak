import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_ATTACK_SPEED: UpgradeDefinition = {
  id: TOME_IDS.ATTACK_SPEED,
  name: '«Энергетик»',
  category: 'tome',
  iconKey: 'icon_tome_attack_speed',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: ' ГЛОБАЛЬНО: Скорость всех атак +15%.',
      apply: (mod) => {
        mod.tomeAttackSpeed = 1;
        mod.attackSpeedBonus += 0.15;
      },
    },
    {
      level: 2,
      description: 'Скорость всех атак +30% (суммарно +30%).',
      apply: (mod) => {
        mod.tomeAttackSpeed = 2;
        mod.attackSpeedBonus += 0.15;
      },
    },
    {
      level: 3,
      description: ' ПУЛЕМЁТНЫЙ СТРИМ: Скорость атак +45% + очередь из 2 быстрых залпов.',
      apply: (mod) => {
        mod.tomeAttackSpeed = 3;
        mod.attackSpeedBonus += 0.15;
        mod.burstFireCount = Math.max(mod.burstFireCount, 2);
      },
    },
    {
      level: 4,
      description: 'Скорость всех атак +60% (суммарно +60%).',
      apply: (mod) => {
        mod.tomeAttackSpeed = 4;
        mod.attackSpeedBonus += 0.15;
      },
    },
    {
      level: 5,
      description: ' БЕШЕНЫЙ ШКВАЛ: Скорость атак +80% + непрерывная очередь из 3 залпов!',
      apply: (mod) => {
        mod.tomeAttackSpeed = 5;
        mod.attackSpeedBonus += 0.20;
        mod.burstFireCount = Math.max(mod.burstFireCount, 3);
      },
    },
  ],
};
