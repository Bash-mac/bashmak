import type { UpgradeDefinition } from '../definitions';
import { WEAPON_IDS } from '../itemIds';

export const WPN_CARROT_BARRAGE: UpgradeDefinition = {
  id: WEAPON_IDS.CARROT_BARRAGE,
  name: 'Морковный Град',
  category: 'weapon',
  iconKey: 'icon_weapon_carrot_barrage',
  exclusiveHeroId: 'hero_markovka',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Морковка-бумеранг. Пробивает толпу, зависает и возвращается назад, нанося двойной урон.',
      apply: (mod) => {
        mod.carrotBarrageLevel = 1;
      },
    },
    {
      level: 2,
      description: 'Дальность полета бумеранга +25%, урон +20%.',
      apply: (mod) => {
        mod.carrotBarrageLevel = 2;
        mod.damagePercentBonus += 0.10;
      },
    },
    {
      level: 3,
      description: 'МОРКОВНЫЙ ВЕЕР: Залп 3 бумерангов веером.',
      apply: (mod) => {
        mod.carrotBarrageLevel = 3;
      },
    },
    {
      level: 4,
      description: 'Морковки пробивают +2 дополнительных врагов насквозь.',
      apply: (mod) => {
        mod.carrotBarrageLevel = 4;
        mod.pierceCount += 2;
      },
    },
    {
      level: 5,
      description: 'ЯРОСТНЫЙ ШКВАЛ: Залп 5 бумерангов с пилящим крит-уроном!',
      apply: (mod) => {
        mod.carrotBarrageLevel = 5;
        mod.critChance += 0.20;
      },
    },
  ],
};
