import type { UpgradeDefinition } from '../definitions';
import { WEAPON_IDS } from '../itemIds';

export const WPN_HOMING_DAGGERS: UpgradeDefinition = {
  id: WEAPON_IDS.HOMING_DAGGERS,
  name: 'Орбитальные Мухи',
  category: 'weapon',
  iconKey: 'icon_weapon_orbiting_flies',
  maxLevel: 5,
  levels: [
    {
      level: 1,
      description: 'Рой из 2 зеленых мух непрерывно кружится вокруг героя, создавая защитный щит.',
      apply: (mod) => {
        mod.homingDaggersLevel = 1;
        mod.homingDaggersCount = 2;
      },
    },
    {
      level: 2,
      description: '+1 муха в рой (всего 3), радиус орбиты +20%.',
      apply: (mod) => {
        mod.homingDaggersLevel = 2;
        mod.homingDaggersCount = 3;
      },
    },
    {
      level: 3,
      description: ' ПИЛЯЩИЙ РОЙ: 4 мухи, скорость вращения увеличена на 50%.',
      apply: (mod) => {
        mod.homingDaggersLevel = 3;
        mod.homingDaggersCount = 4;
      },
    },
    {
      level: 4,
      description: '5 мух + контактный ядовитый DoT при касании врагов.',
      apply: (mod) => {
        mod.homingDaggersLevel = 4;
        mod.homingDaggersCount = 5;
        mod.splashPercent += 0.25;
      },
    },
    {
      level: 5,
      description: ' РОЙ ТИТАНОВ: 7 бешеных мух, блокирующих сближение мобов!',
      apply: (mod) => {
        mod.homingDaggersLevel = 5;
        mod.homingDaggersCount = 7;
        mod.executeLowHpThreshold = 0.40;
      },
    },
  ],
};
