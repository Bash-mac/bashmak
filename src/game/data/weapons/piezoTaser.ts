import type { UpgradeDefinition } from '../definitions';
import { WEAPON_IDS } from '../itemIds';

export const WPN_LIGHTNING_ZAP: UpgradeDefinition = {
  id: WEAPON_IDS.LIGHTNING_ZAP,
  name: 'Пьезо-Шокер',
  category: 'weapon',
  iconKey: 'icon_weapon_piezo_taser',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Бьет током случайного врага в радиусе (45 урона) + 2 цепные искры по соседям.',
      apply: (mod) => {
        mod.lightningZapLevel = 1;
        mod.staticZapMax = 100;
      },
    },
    {
      level: 2,
      description: 'Урон +35%, перескакивает на 3 цели, скорость накопления +20%.',
      apply: (mod) => {
        mod.lightningZapLevel = 2;
        mod.staticZapMax = 80;
      },
    },
    {
      level: 3,
      description: 'ВЫСОКОЕ НАПРЯЖЕНИЕ: Главный удар оглушает цель на 0.8 сек, а искры замедляют врагов на 50%.',
      apply: (mod) => {
        mod.lightningZapLevel = 3;
        mod.slowPercent = Math.max(mod.slowPercent, 0.50);
        mod.slowDurationMs = 2000;
      },
    },
    {
      level: 4,
      description: 'Вылетают 2 одновременных разряда по случайным целям + урон +30%.',
      apply: (mod) => {
        mod.lightningZapLevel = 4;
        mod.damagePercentBonus += 0.15;
      },
    },
    {
      level: 5,
      description: 'КОРОТКОЕ ЗАМЫКАНИЕ: Разряды бьют каждые 0.9 сек + электро-взрывы при убийстве током!',
      apply: (mod) => {
        mod.lightningZapLevel = 5;
        mod.staticZapMax = 45;
      },
    },
  ],
};
