import type { UpgradeDefinition } from '../definitions';
import { TOME_IDS } from '../itemIds';

export const TOME_SPEED: UpgradeDefinition = {
  id: TOME_IDS.SPEED,
  name: '«Турбо-Кеды»',
  category: 'tome',
  iconKey: 'icon_tome_speed_sneakers',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: '🌟 ГЛОБАЛЬНО: Скорость бега персонажа +10%.',
      apply: (mod, stats) => {
        mod.tomeSpeed = 1;
        stats.modifySpeed(1.10);
      },
    },
    {
      level: 2,
      description: 'Скорость бега +15% (суммарно +25%).',
      apply: (mod, stats) => {
        mod.tomeSpeed = 2;
        stats.modifySpeed(1.15);
      },
    },
    {
      level: 3,
      description: '★ СПРИНТЕРСКИЙ РЫВОК: Скорость бега +15% (суммарно +40%).',
      apply: (mod, stats) => {
        mod.tomeSpeed = 3;
        stats.modifySpeed(1.15);
      },
    },
    {
      level: 4,
      description: 'Скорость бега +15% (суммарно +55%).',
      apply: (mod, stats) => {
        mod.tomeSpeed = 4;
        stats.modifySpeed(1.15);
      },
    },
    {
      level: 5,
      description: '★ СПРИНТЕР-ПСИХ: Скорость бега +20% (суммарно +75%) + супер-маневренность!',
      apply: (mod, stats) => {
        mod.tomeSpeed = 5;
        stats.modifySpeed(1.20);
      },
    },
  ],
};
