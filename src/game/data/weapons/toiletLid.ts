import type { UpgradeDefinition } from '../definitions';
import { WEAPON_IDS } from '../itemIds';

export const WPN_TOILET_LID: UpgradeDefinition = {
  id: WEAPON_IDS.TOILET_LID,
  name: 'Крышка от унитаза',
  category: 'weapon',
  iconKey: 'icon_weapon_toilet_lid',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Швыряет унитазную крышку. Рикошетит от врагов и стен (3 отскока, 34 урона).',
      apply: (mod) => {
        mod.toiletLidLevel = 1;
        mod.toiletLidBounces = 3;
      },
    },
    {
      level: 2,
      description: 'Урон +30%, скорость полёта +25%, +2 дополнительных отскока (всего 5).',
      apply: (mod) => {
        mod.toiletLidLevel = 2;
        mod.toiletLidBounces = 5;
        mod.damagePercentBonus += 0.15;
      },
    },
    {
      level: 3,
      description: 'СКОЛЬЗКИЙ ОБОДОК: При каждом рикошете оставляет замедляющую лужицу слизи (на 2.5 сек).',
      apply: (mod) => {
        mod.toiletLidLevel = 3;
        mod.toiletLidBounces = 6;
        mod.toiletLidSlimeTrail = true;
        mod.slowPercent = Math.max(mod.slowPercent, 0.45);
        mod.slowDurationMs = 2500;
      },
    },
    {
      level: 4,
      description: 'ДВОЙНОЙ ЗАЛП: Запускает сразу 2 крышки одновременно + размер снарядов +20%.',
      apply: (mod) => {
        mod.toiletLidLevel = 4;
        mod.toiletLidBounces = 7;
      },
    },
    {
      level: 5,
      description: 'ГИПЕР-РИКОШЕТ: До 10 отскоков! Скорость +50%, а каждый рикошет по врагу увеличивает урон крышки на +8%.',
      apply: (mod) => {
        mod.toiletLidLevel = 5;
        mod.toiletLidBounces = 10;
        mod.attackSpeedBonus += 0.25;
      },
    },
  ],
};
