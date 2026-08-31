import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_SPEED: UpgradeDefinition = {
  id: TOME_IDS.SPEED,
  name: '«Турбо-Кеды»',
  category: 'tome',
  iconKey: 'icon_tome_speed',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Скорость бега персонажа +10%.',
      apply: (mod) => {
        mod.tomeSpeed = 1;
        mod.moveSpeedBonus = (mod.moveSpeedBonus || 0) + 0.10;
      },
    },
    {
      level: 2,
      description: 'Скорость бега +15% (суммарно +25%).',
      apply: (mod) => {
        mod.tomeSpeed = 2;
        mod.moveSpeedBonus = (mod.moveSpeedBonus || 0) + 0.15;
      },
    },
    {
      level: 3,
      description: 'Скорость бега +15% (суммарно +40%).',
      apply: (mod) => {
        mod.tomeSpeed = 3;
        mod.moveSpeedBonus = (mod.moveSpeedBonus || 0) + 0.15;
      },
    },
    {
      level: 4,
      description: 'Скорость бега +15% (суммарно +55%).',
      apply: (mod) => {
        mod.tomeSpeed = 4;
        mod.moveSpeedBonus = (mod.moveSpeedBonus || 0) + 0.15;
      },
    },
    {
      level: 5,
      description: 'Скорость бега +20% (суммарно +75%) + супер-маневренность!',
      apply: (mod) => {
        mod.tomeSpeed = 5;
        mod.moveSpeedBonus = (mod.moveSpeedBonus || 0) + 0.20;
      },
    },
  ],
};
