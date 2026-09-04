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
      description: 'ГЛОБАЛЬНО: Скорость всех атак +16%.',
      apply: (mod) => {
        mod.tomeAttackSpeed = 1;
        mod.attackSpeedBonus += 0.16;
      },
    },
    {
      level: 2,
      description: 'Скорость всех атак +24% (суммарно).',
      apply: (mod) => {
        mod.tomeAttackSpeed = 2;
        mod.attackSpeedBonus += 0.08;
      },
    },
    {
      level: 3,
      description: 'Скорость всех атак +32% (суммарно).',
      apply: (mod) => {
        mod.tomeAttackSpeed = 3;
        mod.attackSpeedBonus += 0.08;
      },
    },
    {
      level: 4,
      description: 'Скорость всех атак +40% (суммарно).',
      apply: (mod) => {
        mod.tomeAttackSpeed = 4;
        mod.attackSpeedBonus += 0.08;
      },
    },
    {
      level: 5,
      description: 'ТУРБО-РЕЖИМ: Скорость всех атак +48% (суммарно).',
      apply: (mod) => {
        mod.tomeAttackSpeed = 5;
        mod.attackSpeedBonus += 0.08;
      },
    },
  ],
};
