import type { UpgradeDefinition } from '../definitions';
import { WEAPON_IDS } from '../itemIds';

export const WPN_EGGPLANT_ROLL: UpgradeDefinition = {
  id: WEAPON_IDS.EGGPLANT_ROLL,
  name: 'Фиолетовый Шар',
  category: 'weapon',
  iconKey: 'icon_weapon_eggplant_roll',
  exclusiveHeroId: 'hero_baklazhan',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Бильярдный рикошет. Катящийся шар отскакивает между врагами 3 раза, сбивая с ног.',
      apply: (mod) => {
        mod.eggplantRollLevel = 1;
      },
    },
    {
      level: 2,
      description: 'Урон рикошета +30%, +1 дополнительный отскок.',
      apply: (mod) => {
        mod.eggplantRollLevel = 2;
        mod.damagePercentBonus += 0.15;
      },
    },
    {
      level: 3,
      description: '★ ТЯЖЕЛЫЙ БОУЛИНГ: 5 отскоков, радиус таранной волны +30%.',
      apply: (mod) => {
        mod.eggplantRollLevel = 3;
      },
    },
    {
      level: 4,
      description: 'Скорость качения +40%, перезарядка ускорена на 1.0 сек.',
      apply: (mod) => {
        mod.eggplantRollLevel = 4;
        mod.attackSpeedBonus += 0.20;
      },
    },
    {
      level: 5,
      description: '★ НЕОСТАНОВИМЫЙ ТАРАН: 7 рикошетов со взрывным расталкиванием толпы!',
      apply: (mod) => {
        mod.eggplantRollLevel = 5;
        mod.damagePercentBonus += 0.50;
      },
    },
  ],
};
